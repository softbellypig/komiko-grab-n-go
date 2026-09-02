/**
 * Komiko Grab-n-Go - popup
 * Scan the current Komiko tab, show what was found, hand off to the
 * downloader window.
 */
(function () {
  'use strict';

  const KOMIKO_HOST = /(^|\.)komiko\.app$/i;
  const MAX_THUMBS = 200; // keep the popup snappy even with 1000+ images

  const $ = (s) => document.querySelector(s);
  const scanBtn = $('#scanBtn');
  const scanNote = $('#scanNote');
  const results = $('#results');
  const countNum = $('#countNum');
  const grid = $('#grid');
  const downloadBtn = $('#downloadBtn');

  let found = [];

  function note(text, isError) {
    scanNote.textContent = text;
    scanNote.classList.toggle('err', !!isError);
    scanNote.classList.toggle('hidden', !text);
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function scan() {
    note('');
    const tab = await activeTab();
    let host = '';
    try { host = new URL(tab.url || '').hostname; } catch (_) {}
    if (!KOMIKO_HOST.test(host)) {
      note('Open your Komiko page first (komiko.app), then click Scan.', true);
      return;
    }

    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPage
      });
      found = (res && res[0] && res[0].result && res[0].result.images) || [];
    } catch (e) {
      found = [];
      note('Could not read the page. Reload Komiko and try again.', true);
    }
    scanBtn.disabled = false;
    scanBtn.textContent = '🔍 Scan all images';

    if (!found.length) {
      results.classList.add('hidden');
      if (!scanNote.textContent) note('No images found yet — scroll to the bottom so they load, then scan again.', true);
      return;
    }
    render();
  }

  function render() {
    countNum.textContent = found.length.toLocaleString();
    // Built with DOM APIs, not HTML strings: URLs come from the page, and we
    // never want page content interpreted as markup.
    grid.textContent = '';
    found.slice(0, MAX_THUMBS).forEach(function (im) {
      const el = document.createElement('img');
      el.src = im.url;
      el.loading = 'lazy';
      el.alt = '';
      grid.appendChild(el);
    });
    if (found.length > MAX_THUMBS) {
      const more = document.createElement('div');
      more.className = 'grid-more';
      more.textContent = '+ ' + (found.length - MAX_THUMBS).toLocaleString() + ' more (all will be downloaded)';
      grid.appendChild(more);
    }
    downloadBtn.textContent = '⬇️ Download all ' + found.length.toLocaleString();
    results.classList.remove('hidden');
  }

  async function startDownload() {
    if (!found.length) return;
    downloadBtn.disabled = true;
    const folder = 'Komiko/' + KomikoShared.buildFolderName(new Date());
    await chrome.storage.local.set({
      komikoJob: { images: found, folder: folder, createdAt: Date.now() }
    });
    await chrome.windows.create({
      url: chrome.runtime.getURL('downloader.html'),
      type: 'popup',
      width: 580,
      height: 640
    });
    window.close();
  }

  scanBtn.addEventListener('click', scan);
  downloadBtn.addEventListener('click', startDownload);
})();
