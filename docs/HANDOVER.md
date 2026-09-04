# Komiko Grab-n-Go — Handover

Written 2026-09-03 at the end of the build session. Checked against disk and
GitHub at write time, not recalled from memory.

## Where the work stands

A deliberately simple Chrome MV3 extension for the owner's friends: on
komiko.app, scroll to the bottom, **Scan all images**, **Download all** →
every image saves to `Downloads/Komiko/<YYYY-MM-DD_HH-MM>/komiko-0001.jpg …`
via `chrome.downloads`, with a "go have a snack" window showing honest
progress. Spun out of a larger private scraping extension that is not
published.

- **Published:** GitHub `softbellypig/komiko-grab-n-go`, public, MIT.
  Release **v1.0.4** with `KomikoGrabNGo_ext.zip` attached. Share link:
  `https://github.com/softbellypig/komiko-grab-n-go/releases/latest`
- **State:** the owner tested it live and reported "working perfectly". The
  local folder and `origin/main` are in sync (`f12a7b7`).
- **Task list:** none exists; nothing is open. `manifest.json` version = 1.0.4.

## Still planned

- **What blocks the next release:** nothing. No pending work.
- **Built but switched off:** nothing.
- **Decided but not started:** nothing.
- **Deliberately deferred:** everything the larger private extension does
  (auto-scroll, ZIP, hover buttons, other sites). The rule, recorded in
  `DECISIONS.md`: keep this two-clicks simple; do not fold those features in.
- **Known gaps worth a decision:**
  - *Folder override* — if another extension (e.g. a download manager)
    registers `onDeterminingFilename` more recently, it can strip the dated
    subfolder. `background.js` re-asserts our folder, but only wins if this
    extension is the newest installed. The download window detects the real
    path and says so; the README explains the fix. The owner once saw files
    land in the Downloads root; whether the fix resolved it is **not
    confirmed**.
  - No checked-in tests. The 41 tests written during the build (fake
    `chrome.downloads` for `queue.js`; fake DOM for `scan.js`) were a
    throwaway file and were deleted. Both modules are pure and easy to re-test
    the same way.

## Artifacts and anything outside this repo

| Thing | Source of truth |
|---|---|
| The code | This folder **and** `github.com/softbellypig/komiko-grab-n-go` (in sync) |
| Share zip | `KomikoGrabNGo_ext.zip` next to this folder on the owner's drive; the same file is attached to release v1.0.4 |
| Build/decision context | `docs/DECISIONS.md` (in this repo) |
| Icon generator | `scripts/make-pig-icons.js` (run with `peach`) |

No hosted app, database, storage bucket, domain, or published artifact of any
other kind. Nothing about this project lives anywhere else.

## How the owner works

- This repo is **credited to `softbellypig` on purpose** (popup, download
  window, README, manifest `author`, LICENSE). Do not strip it. What must stay
  out: the owner's real name, personal email, and local machine paths. Commit
  as `softbellypig <255828553+softbellypig@users.noreply.github.com>` — this is
  already the repo-local git config. Do not add any co-author trailers.
- Release routine: bump `manifest.json` version → rebuild the zip **from a
  staging copy that excludes `.git`, `.gitignore`, and `_*` scratch files** →
  `gh release create vX.Y.Z <zip>`. The `/releases/latest` link then updates
  itself.
- The owner read Komiko's Terms (users own their generations; no
  anti-scraping clause) and chose to publish under her handle. The README's
  "Unofficial, not affiliated with Komiko" notice is deliberate — keep it.

## What now

Everything about this project is on the owner's hard drive **and** on GitHub.
Nothing lives only in a chat, a temp folder, or any single account.
