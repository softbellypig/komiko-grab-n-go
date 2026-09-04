# Decisions & context

Recorded 2026-09-03 so the reasoning behind this project survives beyond the
build session.

**Komiko Grab-n-Go** is a stripped-down, komiko.app-only sibling of a larger
private scraping extension (not published). Created 2026-09-02 (briefly named
"Comico Grab" the same day) to hand to non-technical friends.

**Why:** the owner wanted "a dumbed-down version separate from the full
version" — friends scroll to the bottom themselves, click *Scan all images*,
click *Download all*, and a window tells them to go have a snack while files
save to `Downloads/Komiko/<YYYY-MM-DD_HH-MM>/`.

**How to apply:**
- Keep it simple on purpose: no auto-scroll, no ZIP, no blob fetching. It
  downloads each image individually via `chrome.downloads`. This sidesteps a
  CORS problem the larger extension hit: fetching a public CDN image with
  `credentials: 'include'` is rejected by the browser whenever the server
  answers `Access-Control-Allow-Origin: *`. Letting Chrome download the URL
  directly avoids the whole issue.
- The scanner upgrades Supabase `render/image/public/...?width=300`
  thumbnails to the full-size `object/public/...` originals.
- The queue (`queue.js`) waits for real completion events, retries once, and
  has a stall timeout. It is pure and testable in Node with a fake
  `chrome.downloads` API.
- Don't fold features from the larger extension back into this one; it is
  meant to stay two-clicks simple. Bump the version and re-zip when it changes
  (friends install via Load unpacked).
- **Credit is intentional:** the owner decided (2026-09-02) to tie this to the
  `softbellypig` handle — "made by softbellypig" appears in the popup, download
  window, README, and manifest `author`. Do not strip it in a future privacy
  pass. What must stay out of this repo: the owner's real name, personal
  email, and local machine paths.
