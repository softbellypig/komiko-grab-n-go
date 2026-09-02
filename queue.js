/**
 * Komiko Grab-n-Go - download queue
 *
 * Feeds images to chrome.downloads a couple at a time, waits for each one to
 * actually finish (via onChanged events, with a polling safety net), retries
 * a failed download once, and reports honest progress. The chrome API is
 * injected so this can be unit-tested in Node with a fake.
 */
(function (root) {
  'use strict';

  const shared = (typeof module !== 'undefined' && module.exports)
    ? require('./shared.js')
    : root.KomikoShared;

  function createRunner(opts) {
    const images = opts.images || [];
    const folder = opts.folder;
    const api = opts.api;
    const concurrency = opts.concurrency || 2;
    const gapMs = opts.gapMs == null ? 150 : opts.gapMs;
    const stallMs = opts.stallMs || 90000;
    const pollMs = opts.pollMs || 4000;
    const onProgress = opts.onProgress || function () {};
    const onDone = opts.onDone || function () {};

    const total = images.length;
    let next = 0;          // next index to start
    let saved = 0;
    let failed = 0;
    let resolved = 0;      // saved + failed (each index resolves exactly once)
    let stopped = false;
    let finished = false;
    let pumping = false;
    let firstId = null;
    const inFlight = new Map();   // downloadId -> { index, startedAt }
    const retried = new Set();    // indexes that already got their one retry
    const failures = [];          // { index, url, reason }
    let pollTimer = null;

    function snapshot() {
      return { total, started: next, saved, failed, inFlight: inFlight.size, stopped, firstId, failures };
    }

    function report() { onProgress(snapshot()); }

    function finish() {
      if (finished) return;
      finished = true;
      if (pollTimer) clearInterval(pollTimer);
      report();
      onDone(snapshot());
    }

    function markSaved(id) {
      if (!inFlight.has(id)) return;
      inFlight.delete(id);
      saved++; resolved++;
      report();
      afterResolve();
    }

    function markFailed(id, reason) {
      if (!inFlight.has(id)) return;
      const entry = inFlight.get(id);
      inFlight.delete(id);
      if (!retried.has(entry.index) && !stopped) {
        // One retry, after a short breather.
        retried.add(entry.index);
        setTimeout(function () { startOne(entry.index); }, 800);
        report();
        return;
      }
      failed++; resolved++;
      failures.push({ index: entry.index, url: images[entry.index].url, reason: reason || 'failed' });
      report();
      afterResolve();
    }

    function afterResolve() {
      if (resolved >= total) { finish(); return; }
      pump();
    }

    async function startOne(index) {
      if (stopped) return;
      const item = images[index];
      const filename = shared.buildFilename(folder, index, item.url);
      try {
        const id = await api.download({
          url: item.url,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify'
        });
        if (id == null) throw new Error('no download id');
        inFlight.set(id, { index: index, startedAt: Date.now() });
        if (firstId == null) firstId = id;
        report();
      } catch (e) {
        // Couldn't even start it (bad URL, blocked, etc.)
        if (!retried.has(index) && !stopped) {
          retried.add(index);
          setTimeout(function () { startOne(index); }, 800);
        } else {
          failed++; resolved++;
          failures.push({ index: index, url: item.url, reason: (e && e.message) || 'could not start' });
          report();
          afterResolve();
        }
      }
    }

    // Starts at most one download per call, then schedules itself again after
    // a small gap. Keeps the site happy and keeps progress readable.
    function pump() {
      if (stopped || finished || pumping) return;
      if (resolved >= total) { finish(); return; }
      if (inFlight.size >= concurrency || next >= total) return;
      pumping = true;
      const index = next++;
      startOne(index).then(function () {
        pumping = false;
        setTimeout(pump, gapMs);
      });
    }

    // Completion events from Chrome.
    api.onChanged(function (delta) {
      if (!delta || !inFlight.has(delta.id)) return;
      if (delta.state) {
        const s = delta.state.current;
        if (s === 'complete') markSaved(delta.id);
        else if (s === 'interrupted') markFailed(delta.id, (delta.error && delta.error.current) || 'interrupted');
      }
    });

    // Safety net: if an event was missed, or a download hangs, reconcile.
    function poll() {
      if (finished) return;
      const now = Date.now();
      inFlight.forEach(function (entry, id) {
        if (now - entry.startedAt > stallMs) {
          try { api.cancel(id); } catch (_) {}
          markFailed(id, 'timed out');
          return;
        }
        Promise.resolve(api.search({ id: id })).then(function (items) {
          const it = items && items[0];
          if (!it || !inFlight.has(id)) return;
          if (it.state === 'complete') markSaved(id);
          else if (it.state === 'interrupted') markFailed(id, it.error || 'interrupted');
        }).catch(function () {});
      });
    }

    function start() {
      if (total === 0) { finish(); return; }
      pollTimer = setInterval(poll, pollMs);
      report();
      pump();
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      inFlight.forEach(function (_, id) { try { api.cancel(id); } catch (_) {} });
      inFlight.clear();
      finish();
    }

    return { start, stop, snapshot };
  }

  const api = { createRunner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KomikoQueue = api;
})(typeof window !== 'undefined' ? window : null);
