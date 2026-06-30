# Ministry Tracker — Worker Due Bucket Fix

Date: 2026-06-30

Status: repo fix committed, Worker redeploy still required before live verification.

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

## Deployment required

This repo commit alone does not redeploy the Cloudflare Worker unless the deployment pipeline handles it separately.

Next required action:

1. Deploy `cloudflare/ministry-tracker-push/worker.js` to Cloudflare.
2. Confirm `/api/health` returns all required flags and `dueBucketScheduler: true`.
3. Test Push again.
4. Re-save or edit a reminder so it creates the new due-minute bucket.
5. Verify scheduled reminder fires.
6. Verify tap routing, edit, and delete lifecycle.

## Guardrails

- No VAPID keys changed.
- No secrets touched.
- No frontend cache change.
- No Stage J Weather work started.
- Note Clip and Talk Arrangements not touched.

## Stage I status

Keep Stage I as `backend-deployed, frontend-live, not live-approved` until the redeployed Worker passes Test Push and scheduled reminder verification.
