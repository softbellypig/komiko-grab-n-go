/**
 * Komiko Grab-n-Go - downloader window
 * Reads the job the popup saved, runs the queue, shows honest progress.
 */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const running = $('#running');
  const finished = $('#finished');
  const empty = $('#empty');
  const headline = $('#headline');
  const barFill = $('#barFill');
  const savedNum = $('#savedNum');
  const totalNum = $('#totalNum');
  const failedWrap = $('#failedWrap');
  const failedNum = $('#failedNum');
  const pathRunning = $('#pathRunning');
  const pathDone = $('#pathDone');
  const openBtn = $('#openBtn');
  const openBtnDone = $('#openBtnDone');
  const stopBtn = $('#stopBtn');
  const closeBtn = $('#closeBtn');
  const doneHeadline = $('#doneHeadline');
  const doneStat = $('#doneStat');
  const failList = $('#failList');

  let runner = null;
  let firstId = null;
  let job = null;
  let pathChecked = false;

  // Once something has actually saved, ask Chrome where it really put it and
  // show THAT — so the "your files are here" line is never a guess. If the
  // dated folder got stripped (another extension overriding download paths),
  // say so plainly instead of pointing at a folder that doesn't exist.
  async function verifyActualFolder() {
    if (pathChecked || !job) return;
    try {
      const items = await api.search({ state: 'complete', orderBy: ['-startTime'], limit: 10 });
      const mine = (items || []).find(function (it) { return it.byExtensionId === chrome.runtime.id && it.filename; });
      if (!mine) return;
      pathChecked = true;
      const full = mine.filename;
      const cut = Math.max(full.lastIndexOf('\\'), full.lastIndexOf('/'));
      const dir = cut > 0 ? full.slice(0, cut) : full;
      const marker = job.folder.split('/').pop();   // the date-time segment
      if (dir.indexOf(marker) !== -1) {
        pathRunning.textContent = dir;
        pathDone.textContent = dir;
      } else {
        const warn = 'Heads up: Chrome saved these straight into your Downloads folder instead of the Komiko subfolder ' +
          '(another extension — a download manager or image grabber — is overriding download locations). ' +
          'All your files are still here:';
        pathRunning.textContent = dir;
        pathDone.textContent = dir;
        failList.textContent = warn;
        failList.classList.remove('hidden');
        headline.title = warn;
      }
    } catch (_) { /* best effort */ }
  }

  // Real chrome.downloads, wrapped so the queue stays testable with a fake.
  const api = {
    download: (o) => chrome.downloads.download(o),
    onChanged: (cb) => chrome.downloads.onChanged.addListener(cb),
    search: (q) => chrome.downloads.search(q),
    cancel: (id) => chrome.downloads.cancel(id),
    show: (id) => chrome.downloads.show(id)
  };

  function openFolder() {
    if (firstId != null) {
      try { api.show(firstId); } catch (_) {}
    }
  }

  function onProgress(s) {
    firstId = s.firstId;
    totalNum.textContent = s.total.toLocaleString();
    savedNum.textContent = s.saved.toLocaleString();
    failedNum.textContent = s.failed.toLocaleString();
    failedWrap.classList.toggle('hidden', s.failed === 0);
    const pct = s.total ? Math.round(((s.saved + s.failed) / s.total) * 100) : 0;
    barFill.style.width = pct + '%';
    headline.textContent = 'Downloading… ' + pct + '%';
    openBtn.disabled = firstId == null;
    document.title = 'Komiko Grab-n-Go — ' + pct + '%';
    if (s.saved >= 1 && !pathChecked) verifyActualFolder();
  }

  function onDone(s) {
    running.classList.add('hidden');
    finished.classList.remove('hidden');
    if (s.stopped) {
      doneHeadline.textContent = 'Stopped';
      doneStat.textContent = s.saved.toLocaleString() + ' image' + (s.saved === 1 ? '' : 's') + ' were saved before you stopped.';
    } else if (s.failed === 0) {
      doneHeadline.textContent = 'All done! ✨';
      doneStat.textContent = 'All ' + s.saved.toLocaleString() + ' images are saved.';
      chime();
    } else {
      doneHeadline.textContent = 'Done (with a few hiccups)';
      doneStat.textContent = s.saved.toLocaleString() + ' saved · ' + s.failed.toLocaleString() + " couldn't be saved.";
      failList.textContent = 'The ones that failed can usually be grabbed by scanning and downloading again later.';
      failList.classList.remove('hidden');
      chime();
    }
    document.title = 'Komiko Grab-n-Go — done';
    chrome.storage.local.remove('komikoJob');
  }

  // Tiny two-note "ta-da" — best effort; silently skipped if audio is blocked.
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, at, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(at); o.stop(at + dur + 0.05);
      };
      const t = ctx.currentTime + 0.02;
      play(784, t, 0.18);        // G5
      play(1175, t + 0.16, 0.32); // D6
    } catch (_) {}
  }

  async function main() {
    const stored = await chrome.storage.local.get('komikoJob');
    job = stored && stored.komikoJob;
    if (!job || !job.images || !job.images.length) {
      running.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    const where = KomikoShared.describeFolder(job.folder);
    pathRunning.textContent = where;
    pathDone.textContent = where;
    totalNum.textContent = job.images.length.toLocaleString();

    runner = KomikoQueue.createRunner({
      images: job.images,
      folder: job.folder,
      api: api,
      concurrency: 2,
      gapMs: 200,
      onProgress: onProgress,
      onDone: onDone
    });
    runner.start();
  }

  openBtn.addEventListener('click', openFolder);
  openBtnDone.addEventListener('click', openFolder);
  stopBtn.addEventListener('click', function () { if (runner) runner.stop(); });
  closeBtn.addEventListener('click', function () { window.close(); });

  // Closing the window mid-run just stops it; downloads already in Chrome's
  // queue still finish. Ask before losing the rest.
  window.addEventListener('beforeunload', function (e) {
    if (runner && !finished.classList.contains('hidden')) return;
    if (runner) { e.preventDefault(); e.returnValue = ''; }
  });

  main();
})();
