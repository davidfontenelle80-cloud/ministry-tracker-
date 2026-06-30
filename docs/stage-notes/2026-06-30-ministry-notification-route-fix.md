# Ministry Tracker — Notification Route Fix

Date: 2026-06-30

Status: code-implemented, pending live device verification.

## Context

Closed-app push delivery worked on David's iPhone. Tapping the notification opened Ministry Tracker, but it landed on Home instead of the related reminder/note.

## Fix

- Updated `sw.js` notification click handling to preserve notification payload fields and route target data.
- Added `screen=notes`, `sourceType`, and `sourceId` URL params when opening a new app window from a notification.
- Added service-worker `postMessage` routing for already-open app windows.
- Updated `js/sw-register.js` to receive notification route messages, switch to Notes, and open the matching Ministry note modal when `sourceType= ministry-note` and `sourceId` is present.
- Bumped cache from `ministry-tracker-v45-notes-polish` to `ministry-tracker-v46-notification-route-fix`.

## Files changed

- `sw.js`
- `js/sw-register.js`

## Guardrails

- Cloudflare Worker not redeployed.
- VAPID secrets not touched.
- Push backend files not touched.
- Stage J weather not started.
- Talk Arrangements not modified.

## Verification required

1. Confirm live cache is `ministry-tracker-v46-notification-route-fix`.
2. Create a reminder notification.
3. Let it fire while the app is closed.
4. Tap the notification.
5. Verify Ministry Tracker opens to Notes and opens the related note/reminder instead of Home.
6. Verify existing Home, Timer, Calendar, Notes, and Reports tabs still work.

## Stage I status

Stage I remains `backend-deployed, frontend-live, not live-approved` until notification tap routing, scheduled reminder delivery, and reminder edit/delete behavior are verified end-to-end.
