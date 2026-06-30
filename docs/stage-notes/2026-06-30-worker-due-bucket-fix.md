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
