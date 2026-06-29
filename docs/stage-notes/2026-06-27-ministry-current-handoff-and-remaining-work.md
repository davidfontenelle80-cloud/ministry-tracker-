---
title: "Ministry Tracker — Current Handoff and Remaining Work"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
created: "2026-06-27"
status: "active handoff"
supervisor: "App Supervisor / Builder Sol"
primary_tracker: "docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md"
weather_spec: "docs/stage-notes/2026-06-27-ministry-stage-j-weather-planning-widget.md"
---

# Ministry Tracker — Current Handoff and Remaining Work

## Purpose

This handoff file records the current verified state and remaining work so Codex/Cowork/ChatGPT can resume without losing context.

## Current verified repo state

As of this handoff:

- Stage H QA polish commit exists: `2483f8b`.
- Current cache verified in `sw.js`: `ministry-tracker-v40-stage-h-qa-polish`.
- A dedicated Stage J Weather Planning Widget spec was added.
- GitHub issue #1 was opened for Stage J.
- No Stage J app code has been implemented yet.

## Important warning

The primary temporary MD frontmatter may still show stale stage text from earlier stages. Workers must inspect the whole MD and repo before coding.

If the primary MD and repo differ:

STOP.

Update the MD first.

Do not code until the MD and repo match.

## Project order from here

### Stage I — Reminder Push Notifications / Notification Foundation

Status: approved for implementation.

Do this before weather.

Required outcomes:

- Reminder permission flow.
- Notification delivery approach documented and approved.
- Reminder date/time creates a real alert path.
- Editing reminder updates notification behavior.
- Completed/archived/deleted notes do not fire future reminders.
- Foreground and background/PWA behavior verified.
- iOS/PWA limitations documented.
- EN/ES supported.
- Light/dark unaffected.
- Export/import and cloud backup unaffected.
- Cache bumped if deployable files change.
- Live GitHub Pages verified.

Documented Stage I architecture before coding:

- Adapt the Talk Arrangements Stage 9B-B closed-app Web Push pattern to Ministry Tracker.
- Use Cloudflare Worker, Cloudflare KV binding `PUSH_STORE`, and a one-minute cron trigger.
- Use VAPID Web Push with public Worker URL/public VAPID key in frontend only.
- Keep `VAPID_PRIVATE_KEY` as a Cloudflare secret only; never commit it.
- Frontend creates and stores a browser `PushSubscription` through the backend.
- Backend stores scheduled reminders and sends due reminders from cron.
- Service worker handles `push` and `notificationclick`.
- Do not use local-only `setTimeout` as the final solution.
- Do not claim notifications work until real closed-app delivery is verified.
- Cache before Stage I frontend changes: `ministry-tracker-v40-stage-h-qa-polish`.

Stage I deployment/device verification attempt on 2026-06-29:

- Worker URL: `https://ministry-tracker-push.davidfontenelle80.workers.dev`.
- Worker deployment/version ID: `a9654632-efa0-4382-a839-9119b5385032`.
- KV namespace: `ministry-tracker-push-store` (`559729167b3140e0add1c89ea1a1d477`).
- `/api/health` passed with `hasStore=true`, `hasVapidPublicKey=true`, `hasVapidPrivateKey=true`, and `hasVapidSubject=true`.
- Backend smoke tests passed for non-real subscribe, reminder upsert, and reminder delete.
- Live GitHub Pages frontend is not yet serving the Stage I WIP files: `js/push-config.js` and `js/push.js` return 404, and live `sw.js` is not `ministry-tracker-v41-stage-i-web-push`.
- Real browser subscription, test push, scheduled reminder, closed-app notification, notification click, mobile, desktop, console, and tab regression checks remain unverified.
- Current deployment status: `backend-deployed, not live-approved`.

### Stage J — Weather Planning Widget

Status: planned only.

Spec file:

`docs/stage-notes/2026-06-27-ministry-stage-j-weather-planning-widget.md`

GitHub issue:

`#1 — Stage J — Weather Planning Widget`

Do not start until Stage I is approved.

Required outcomes:

- Home weather chip.
- Tap opens modal/bottom sheet.
- Current location permission.
- Manual city/ZIP fallback.
- Current weather conditions.
- Hourly forecast.
- 5-day forecast default.
- Optional 10-day forecast only if provider supports it accurately.
- Ministry field-service planning insight.
- Offline/last-updated fallback.
- 30–60 minute weather cache.
- EN/ES.
- Light/dark.
- No API secrets exposed in frontend.

### Final release QA

Status: after Stage I and Stage J are approved.

Required outcomes:

- Full app regression.
- Mobile verified.
- Desktop verified.
- Light verified.
- Dark verified.
- English verified.
- Spanish verified.
- Export/import verified.
- Cloud backup verified.
- GitHub Pages verified.
- Temporary MD cleanup only after David/Supervisor approval.

## Current remaining work list

1. Finish and approve Stage I reminder notifications.
2. Implement Stage J weather planning widget from spec.
3. Final full regression pass.
4. Final live approval.
5. Final MD cleanup/removal after approval.

## Current completion estimate

- Core Notes & Reminders UI/data: approximately 90%+ complete.
- Full project including notifications and weather: approximately 70–75% complete.

## Guardrails for all future workers

- Do not touch Talk Arrangements from this repo/task.
- Do not mix Stage I and Stage J.
- Do not implement weather before reminders are approved.
- Do not fake notifications.
- Do not fake weather/forecast data.
- Do not expose private API secrets.
- Do not modify existing service categories.
- Do not break Reports, Timer, Calendar, Notes, export/import, or cloud backup.
- Always update MD after every completed stage.
