/**
 * Komiko Grab-n-Go - page scanner
 *
 * This function is injected into the Komiko tab with chrome.scripting, so it
 * must be completely self-contained (no outside variables, no helpers).
 * It collects every image on the page, upgrades Komiko's thumbnails to the
 * full-size originals, and drops icons/avatars.
 */
function scanPage() {
  const seen = new Set();
  const images = [];

  // Komiko's thumbnails are Supabase "render" URLs like
  //   .../storage/v1/render/image/public/<bucket>/<path>.jpg?width=300&height=300
  // The full-size original lives at
  //   .../storage/v1/object/public/<bucket>/<path>.jpg
  // Swapping the path segment and dropping the size query gives us the real
  // image instead of a 300px preview.
  function upgrade(raw) {
    try {
      const url = new URL(raw, document.baseURI);
      if (url.hostname.endsWith('supabase.co') && url.pathname.indexOf('/storage/v1/render/image/public/') !== -1) {
        url.pathname = url.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
        url.search = '';
      }
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function add(raw, w, h) {
    if (!raw) return;
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return;
    const url = upgrade(raw);
    if (!url || seen.has(url)) return;
    if (/\.svg(\?|#|$)/i.test(url)) return;
    // Known size and it's tiny -> icon/avatar, skip. Unknown size -> keep.
    if (w && h && (w < 100 || h < 100)) return;
    seen.add(url);
    images.push({ url: url, w: w || 0, h: h || 0 });
  }

  // Main document plus any same-origin frames (cross-origin ones are
  // untouchable by design; the try/catch just skips them).
  const docs = [document];
  document.querySelectorAll('iframe').forEach(function (f) {
    try { if (f.contentDocument) docs.push(f.contentDocument); } catch (_) {}
  });

  docs.forEach(function (doc) {
    doc.querySelectorAll('img').forEach(function (img) {
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      add(img.currentSrc || img.src, w, h);
    });
  });

  return { images: images, host: location.hostname, title: document.title };
}

if (typeof module !== 'undefined' && module.exports) module.exports = scanPage;
