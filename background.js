/**
 * Komiko Grab-n-Go - background
 *
 * One job: keep our downloads in their dated folder.
 *
 * Chrome lets any installed extension rewrite download filenames via
 * onDeterminingFilename (download managers and image grabbers commonly do),
 * which can flatten our "Komiko/<date>/komiko-0001.jpg" into the Downloads
 * root. When several extensions listen, the most recently installed one
 * wins — so by listening ourselves we reclaim the folder for our own
 * downloads. We never touch downloads that aren't ours.
 */
importScripts('shared.js');

chrome.downloads.onDeterminingFilename.addListener(function (item, suggest) {
  if (item.byExtensionId !== chrome.runtime.id) { suggest(); return; }

  chrome.storage.local.get('komikoJob').then(function (st) {
    const job = st && st.komikoJob;
    const name = KomikoShared.intendedFilenameFor(job, item.url) ||
                 KomikoShared.intendedFilenameFor(job, item.finalUrl);
    if (name) suggest({ filename: name, conflictAction: 'uniquify' });
    else suggest();
  }).catch(function () { suggest(); });

  return true; // we call suggest() asynchronously
});
