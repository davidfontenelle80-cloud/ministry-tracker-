# Ministry Tracker — Waiting Period Prep

Date: 2026-06-30

Purpose: keep project state clear while Codex/CoWork access is limited.

## Current status

- Live cache: `ministry-tracker-v47-theme-flash-fix`.
- v47 theme flash fix: live-approved by David.
- Test Push works on David's iPhone.
- Push delivery works with app open and app swipe-closed.
- Scheduled reminders are not live-approved yet.
- Stage I status: `backend-deployed, frontend-live, not live-approved`.
- Stage J Weather: planned only, not started.

## Scheduled reminder finding

Latest worker report found a likely Worker-side cause:

- Test Push can work because it does not depend on the cron reminder scan.
- Scheduled reminders depended on cron scanning reminders with `PUSH_STORE.list()`.
- Cloudflare returned KV list free-usage-limit error `code: 10048`.
- Worker fix reportedly replaced broad KV list scans with deterministic due-minute bucket keys.

Reported deployed Worker fix:

- Worker version ID: `1c733ec4-5c2b-4770-8ca9-3e6035a7a535`.
- `/api/health`: passed after deploy.
- Frontend cache unchanged because this was Worker/docs only.

Repo caveat from latest worker report:

- Deployed Worker fix was not committed because the worker hit a usage-limit gate.
- Local repo was reported not clean.
- Local changes were reported in:
  - `cloudflare/ministry-tracker-push/worker.js`
  - `docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md`
  - untracked generated folder: `cloudflare/ministry-tracker-push/.wrangler/`

## Next required Stage I steps

1. Clean local repo.
2. Remove or ignore `.wrangler/`.
3. Confirm changed files are only Worker fix and tracker MD.
4. Commit/push the deployed Worker due-bucket fix.
5. Re-save or edit a reminder so it creates the new due-bucket index.
6. Verify `POST /api/reminders` succeeds.
7. Verify scheduled reminder fires.
8. Tap notification and confirm app opens/focuses.
9. If possible, confirm it routes to Notes/the matching reminder.
10. Verify edit/reschedule.
11. Verify delete/cancel.
12. Only then mark Stage I `live-approved`.

## Notes UI polish prep

David wants Notes/category cards to have stronger visual separation.

Approved direction:

- Stronger but tasteful card border.
- Better separation between cards.
- Light and dark mode support.
- Premium look, not heavy or boxy.

Safe implementation guidance:

- Do not replace `index.html` wholesale.
- Prefer a small CSS addition in the existing Notes polish area.
- If adding a CSS file, link it with a minimal one-line `index.html` edit and add it to `sw.js` precache.
- Verify GitHub Pages deploys cleanly.
- Verify visually on iPhone PWA and desktop.

## Stage J Weather prep

Stage J remains planned only.

Approved scope:

- Dashboard weather chip.
- Weather detail modal.
- Current conditions.
- Hourly forecast.
- 5-day forecast.
- Location permission flow.
- Manual fallback if location denied.
- Loading, denied, offline, and API-error states.
- English/Spanish and light/dark support.

## Recommended order

1. Commit deployed Worker due-bucket fix and clean repo.
2. Verify scheduled reminders after re-saving a reminder.
3. Verify notification tap routing, edit, and delete lifecycle.
4. If Stage I passes, mark it live-approved.
5. Continue Notes UI polish.
6. Then Stage J Weather.
7. Then final production QA.
