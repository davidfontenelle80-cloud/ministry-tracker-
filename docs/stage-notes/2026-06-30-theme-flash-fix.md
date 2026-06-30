# Ministry Tracker — v47 Theme Flash Fix

Date: 2026-06-30

Status: code-implemented, pending live device verification.

## Root cause

The app uses `ministry-tracker-v4.theme` as the real theme preference, but `js/theme.js` was still reading/writing the legacy KHub theme keys (`khub_theme`, `khub_theme_override`). On startup this could apply a legacy light value before `js/app.js` restored the app state theme, causing a visible dark/light/dark flash.

## Fix

- Updated `js/theme.js` to read the app state from `localStorage['ministry-tracker-v4']`.
- Stopped startup theme bootstrap from using legacy KHub theme keys.
- Kept app.js as the source of truth for saved theme behavior.
- Bumped service worker cache to `ministry-tracker-v47-theme-flash-fix`.

## Files changed

- `js/theme.js`
- `sw.js`

## Guardrails

- `index.html` was not changed.
- Cloudflare Worker was not changed.
- KV/VAPID/secrets were not touched.
- Push backend was not changed.
- Note Clip and Talk Arrangements were not touched.
- Stage J Weather was not started.

## Verification required

- Confirm GitHub Pages serves `ministry-tracker-v47-theme-flash-fix`.
- Open the app cold on iPhone/PWA and desktop.
- Confirm no dark/light/dark flash.
- Confirm dark, light, and auto theme settings still work.
- Confirm Home, Timer, Calendar, Notes, and Reports still open.

## Remaining Stage I status

Stage I remains `backend-deployed, frontend-live, not live-approved` until notification tap routing and reminder lifecycle are verified on a real device.
