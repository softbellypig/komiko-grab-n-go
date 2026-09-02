/**
 * Komiko Grab-n-Go - shared helpers
 * Pure functions used by both the popup and the downloader window.
 * Also exported for Node tests.
 */
(function (root) {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  // Folder name for one download run: 2026-09-02_14-30
  // (no colons — Windows filenames can't contain them)
  function buildFolderName(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      '_' + pad(d.getHours()) + '-' + pad(d.getMinutes());
  }

  // Human-friendly version for the "your files will be here" message.
  function describeFolder(folder) {
    return 'Downloads › ' + folder.split('/').join(' › ');
  }

  function extFromUrl(url) {
    try {
      const path = new URL(url).pathname;
      const m = path.match(/\.(jpe?g|png|gif|webp|avif|bmp)$/i);
      if (!m) return 'jpg';
      const e = m[1].toLowerCase();
      return e === 'jpeg' ? 'jpg' : e;
    } catch (_) {
      return 'jpg';
    }
  }

  // komiko-0001.jpg, komiko-0002.png ... always unique thanks to the index.
  function buildFilename(folder, index, url) {
    return folder + '/komiko-' + String(index + 1).padStart(4, '0') + '.' + extFromUrl(url);
  }

  // Given the saved job and a download URL, the filename we intended for it
  // (folder + numbered name), or null if the URL isn't part of the job.
  // Used by the background listener to re-assert our folder if something
  // else tries to rename the download.
  function intendedFilenameFor(job, url) {
    if (!job || !Array.isArray(job.images) || !job.folder || !url) return null;
    for (let i = 0; i < job.images.length; i++) {
      const im = job.images[i];
      if (im && im.url === url) return buildFilename(job.folder, i, url);
    }
    return null;
  }

  const api = { buildFolderName, describeFolder, extFromUrl, buildFilename, intendedFilenameFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KomikoShared = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null));
