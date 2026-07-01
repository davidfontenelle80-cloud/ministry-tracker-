# Ministry Tracker — Worker Due Bucket Fix

Date: 2026-06-30

Status: repo fix committed, Worker deployed, physical live verification still required.

## Problem

Scheduled reminders were failing while Test Push had previously worked. The likely cause is that cron depended on `PUSH_STORE.list()` to scan all `reminder:` keys every minute. Cloudflare returned KV list free-usage-limit error `code: 10048`, so scheduled reminders could fail even when direct push paths worked.

## Repo fix

Commit `be4fefc` updates `cloudflare/ministry-tracker-push/worker.js` to avoid namespace-wide KV listing.

The Worker now:

- Writes each reminder to the existing deterministic reminder key:
  `reminder:{subscriptionId}:{sourceType}:{sourceId}`
- Also writes that reminder key into a deterministic due-minute bucket:
  `due:{YYYY-MM-DDTHH:MM}`
- Cron reads only the current and recent due-minute buckets instead of listing the whole KV namespace.
- Delete continues to remove the reminder key. Old bucket entries are safe stale references because cron skips missing reminder records.
- Edit/reschedule overwrites the reminder record and adds the key to the new due bucket.
- Health now includes `dueBucketScheduler: true`.

## Files changed

- `cloudflare/ministry-tracker-push/worker.js`

## Deployment state

This repo commit alone did not prove deployment, but David's current verified backend state now records the due-bucket Worker as deployed.

Current verified backend:

- Cloudflare deployment/version ID: `7f546288-85e3-46d8-9bc2-c5f9564fbd7b`.
- `/api/health` passed with all required flags and `dueBucketScheduler: true`.

Next required action:

1. Open the live Ministry Tracker PWA on David's iPhone.
2. Re-save or edit a reminder so it creates the new due-minute bucket.
3. Confirm the reminder sync/saved message appears.
4. Verify scheduled reminder fires.
5. Verify tap routing, edit, and delete lifecycle.

## Guardrails

- No VAPID keys changed.
- No secrets touched.
- No frontend cache change.
- No Stage J Weather work started.
- Note Clip and Talk Arrangements not touched.

## Stage I status

Keep Stage I as `backend-deployed, frontend-live, not live-approved` until the deployed Worker passes scheduled reminder delivery, notification tap routing, and reminder edit/delete verification on the real iPhone/PWA path.

## 2026-06-30 follow-up audit — David reported save/no scheduled delivery

Result at time of audit: BLOCKED on live Worker verification/deployment from this GitHub-only session.

Superseded by current verified backend state:

- Cloudflare deployment/version ID: `7f546288-85e3-46d8-9bc2-c5f9564fbd7b`.
- `/api/health` passed with `dueBucketScheduler: true`.
- Remaining blocker is physical live iPhone/PWA reminder lifecycle verification.

Verified in repo:

- `js/push-config.js` points the frontend to `https://ministry-tracker-push.davidfontenelle80.workers.dev`.
- `index.html` loads `js/push-config.js`, then `js/push.js`, then `js/app.js`.
- `js/app.js` still calls `syncMinistryNotePush(savedNote)` after saving a note with reminder data.
- `syncMinistryNotePush()` calls `window.MinistryPush.syncReminder('ministry-note', note.id, title, body, fireAt)`.
- `js/push.js` posts to `${workerUrl}/api/reminders` after ensuring/refreshing subscription.
- `cloudflare/ministry-tracker-push/worker.js` on `main` contains the due-bucket implementation from commit `be4fefc`.
- No GitHub Actions workflow runs were found for commit `be4fefc`, so this repo commit did not prove a Cloudflare Worker deployment happened.

First failing/unverified step at time of audit:

- Live deployed Worker state. The source repo is fixed, but deployment parity could not be proven from GitHub. If `/api/health` on the live Worker does not return `dueBucketScheduler: true`, the Worker is stale and reminders will still fail or behave like the old KV-list version.

Current required next action after backend deployment was verified:

1. Re-save a reminder in the live iPhone/PWA flow so the new `due:{YYYY-MM-DDTHH:MM}` bucket is created.
2. Confirm the reminder sync/saved message appears.
3. Verify scheduled delivery.
4. Tap the notification and verify it routes to the correct note.
5. Edit the reminder to a new time and verify the edited reminder fires.
6. Delete or disable the reminder and confirm no later notification fires.

No frontend code repair was made during this audit because the repo frontend call chain matches the expected Stage I pipeline.

## 2026-06-30 physical iPhone/PWA evidence - app error during reminder flow

Status: Stage I still `backend-deployed, frontend-live, not live-approved`.

Screenshot evidence:

- Device/browser tested: live iPhone/PWA path, based on screenshot evidence from iPhone status bar.
- Visible app location: Notes & Reminders tab.
- Visible note: `Test1`, Return Visits, due `Jun 30 18:27`.
- Screenshot time: `6:25 PM`.
- Visible in-app error: `App error caught`; message `Load failed`; error label `JS-ERROR-promise`; where `promise`.

Verification result:

- Reminder save result: blocked/unverified. Successful reminder sync/saved message is not visible in the evidence.
- Scheduled reminder result: not verified.
- Notification tap result: not verified.
- Reminder edit result: not verified.
- Reminder delete result: not verified.
- Console status: no browser console visible; in-app error banner shows `JS-ERROR-promise` / `Load failed`.

Stop condition reached:

- Stop Stage I physical verification at this point until the app error is triaged or Supervisor authorizes code investigation.
- No Worker, frontend, secrets, VAPID, Firebase rules, Note Clip, Talk Arrangements, or Stage J files changed for this evidence note.

## 2026-06-30 Stage I frontend runtime investigation authorized

Current stage: Stage I - Frontend Runtime Investigation.

Scope:

- Investigate `Load failed` / `JS-ERROR-promise` from the live frontend.
- Stop at the first rejected Promise causing startup failure.
- Repair only the startup Promise failure.
- Assume the deployed Worker is healthy unless direct evidence proves otherwise.
- Do not investigate Cloudflare scheduling again.

Boundaries:

- Do not touch Worker, Stage J, Talk Arrangements, Note Clip, Firebase rules, secrets, or VAPID.
- Do not continue to Notes polish.

## 2026-06-30 Stage I frontend runtime fix applied

Root cause:

- The live error `JS-ERROR-promise` / `Load failed` is consistent with the reminder push network/subscription Promise rejecting during `window.MinistryPush.syncReminder()` or `window.MinistryPush.clearReminder()`.
- The app saved the note first, then started push sync. A rejected push Promise could surface through the global error boundary as a visible app error even though the note itself saved.

Fix:

- `js/push.js` now converts reminder sync/clear failures into handled `{ ok:false, handled:true, ... }` results instead of letting the rejection reach the global unhandled Promise handler.
- `sendTestPush()` is intentionally still allowed to reject so Test Push can report real failures during diagnostics.
- `sw.js` cache bumped from `ministry-tracker-v47-theme-flash-fix` to `ministry-tracker-v48-reminder-sync-error-fix` so the live PWA pulls the fixed `js/push.js`.

Files changed:

- `js/push.js`
- `sw.js`
- `docs/stage-notes/2026-06-30-worker-due-bucket-fix.md`

Verification required next:

1. Reload/update the iPhone PWA so cache `v48` activates.
2. Save a reminder again.
3. Confirm the `JS-ERROR-promise` / `Load failed` banner no longer appears.
4. Confirm whether the reminder sync saved message appears.
5. Continue scheduled notification, tap, edit, and delete verification.

Known remaining issue:

- Reminder card time formatting still displays 24-hour time in some paths (`19:22`). This was not repaired in this commit because the immediate authorized blocker was the rejected Promise error.

## 2026-06-30 Stage I Test Push rejection and time-format fix authorized

Current issue:

- Live iPhone/PWA still shows `App error caught`, `Load failed`, `JS-ERROR-promise`, where `promise`.
- Toast also shows `Test push failed. Load failed`.
- This happened after pressing Test Push in Notes & Reminders.
- Reminder cards still show 24-hour time such as `Due Jun 30 19:46`.

Objective:

- Fix the remaining push Promise error path, especially Test Push.
- Fix reminder card time display to compact locale-aware 12-hour time where appropriate, such as `Due Jun 30 • 7:46 PM`.

Required behavior:

- Test Push failure must show/log the local failure and return `{ ok:false, handled:true, action:'test-push', error:'Load failed' }`.
- Reminder sync failure must leave the note saved, show/log handled failure, and return a handled result.
- Reminder clear/delete failure must show/log handled failure and return a handled result.
- Push failures must not throw, reject unhandled, or show `App error caught` / `JS-ERROR-promise`.

Cache target:

- Before: `ministry-tracker-v48-reminder-sync-error-fix`.
- After: `ministry-tracker-v49-push-error-handled`.

Allowed files:

- `js/push.js`
- `js/app.js`
- `sw.js`
- MD

Not allowed:

- Worker
- Firebase rules
- Secrets
- VAPID
- Talk Arrangements
- Note Clip
- Stage J Weather

## 2026-06-30 Stage I Test Push rejection and time-format fix applied

Root cause:

- `sendTestPush()` still allowed push subscription/fetch failures to reject.
- `runMinistryPushDiagnostic()` then showed `Test push failed...` but rethrew the rejection, allowing the global `unhandledrejection` handler to show `App error caught` / `JS-ERROR-promise`.
- Reminder sync/clear paths also needed app-level handling so handled backend/client failures were not treated as success or rethrown.
- Reminder card due labels concatenated the raw `HH:mm` value, producing 24-hour display such as `Due Jun 30 19:46`.

Fix:

- `js/push.js` now converts Test Push failures into handled `{ ok:false, handled:true, action:'test-push', error }` results.
- `js/push.js` also guards synchronous push configuration errors for test, sync, and clear paths.
- `js/app.js` now treats handled push failures as local failures, shows/logs the failure, and returns handled results without throwing.
- `js/app.js` now formats due time through locale-aware `toLocaleTimeString()` with compact 12-hour display and separates date/time with ` • `.
- `sw.js` cache bumped to `ministry-tracker-v49-push-error-handled`.

Verification:

- `node --check js/push.js` passed.
- `node --check js/app.js` passed.
- `node --check sw.js` passed.
- Controlled `js/push.js` runtime with `fetch()` rejecting `Load failed`: `sendTestPush()` returned `{ ok:false, handled:true, action:'test-push', error:'Load failed' }`.
- Controlled `js/push.js` runtime with `fetch()` rejecting `Load failed`: reminder sync and clear returned handled failure objects.
- Local browser Test Push failure stayed local: warnings logged and the error boundary remained hidden.
- Local browser reminder save with Reminder enabled kept the note saved, showed no global error boundary, and logged handled push failure.
- Local browser note card rendered `Due Jun 30 • 7:49 PM` for a `19:49` due time.

Not verified here:

- Physical live iPhone/PWA v49 cache activation.
- Real successful `POST /api/reminders` response with `dueBucketMinute`.
- Scheduled notification delivery after this frontend fix.

## 2026-06-30 Stage I scheduled reminder path investigation authorized

Current verified live status:

- Test Push works on David's iPhone/PWA.
- Push subscription works.
- VAPID works.
- Worker can send push.
- Service worker receives push.
- Notification display works.

Current failure:

- David sets a note reminder time and saves it, but no scheduled reminder notification fires.

Objective:

- Trace only the scheduled reminder path.
- Do not revisit Test Push except to confirm it still works after any fix.

Pipeline to verify:

1. Note save.
2. `syncMinistryNotePush()`.
3. `window.MinistryPush.syncReminder()`.
4. `POST /api/reminders`.
5. Worker stores reminder key.
6. Worker stores due bucket key.
7. Cron runs.
8. Scheduled push sends.

Allowed files:

- `js/app.js`
- `js/push.js`
- `cloudflare/ministry-tracker-push/worker.js`
- `sw.js` only if frontend cache must be bumped
- MD

Not allowed:

- Secrets
- VAPID rotation
- Firebase rules
- Talk Arrangements
- Note Clip
- Stage J Weather

Cache target if frontend JS changes:

- Before: `ministry-tracker-v49-push-error-handled`.
- After: `ministry-tracker-v50-scheduled-reminder-fix`.
