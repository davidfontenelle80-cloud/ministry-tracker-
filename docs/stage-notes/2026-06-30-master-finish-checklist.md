# Ministry Tracker — Master Finish Checklist

Date: 2026-06-30

Purpose: reduce future CoWork/Codex token use by keeping one prioritized implementation and verification checklist. This file is planning/documentation only. Do not treat unchecked items as implemented until the matching commit and verification are recorded in the active tracker MD.

## Current baseline

- Repo: `davidfontenelle80-cloud/ministry-tracker-`
- Branch: `main`
- Current live/pending stage family: Stage I push + Notes polish
- Current cache before pending v47 work: `ministry-tracker-v46-notification-route-fix`
- Pending local work reported by worker: `v47-theme-flash-fix`, staged locally but not committed/pushed at time of report.
- Stage J Weather: planned only; not started.

## Hard status rules

- Stage I must remain `backend-deployed, frontend-live, not live-approved` until real device notification tap routing and reminder lifecycle are verified.
- Do not change Stage I to live-approved from source inspection alone.
- Do not touch Cloudflare Worker, KV, VAPID, or secrets unless a Stage I verification failure proves a backend issue.
- Do not start Stage J Weather until v47 theme flash fix and Stage I routing/lifecycle verification are recorded or Supervisor explicitly authorizes weather to proceed in parallel.
- Note Clip is read-only unless David explicitly asks for Note Clip changes.
- Talk Arrangements must not be modified.

## Priority 0 — Commit/push v47 theme flash fix

Status: reported as coded and staged locally, not committed due usage-limit gate.

Required steps:

1. Verify repo status and staged files.
2. Confirm staged files are only:
   - `index.html`
   - `js/theme.js`
   - `sw.js`
   - `docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md`
3. Run:
   - `node --check js/app.js`
   - `node --check js/theme.js`
   - `node --check sw.js`
4. Commit and push to `main`.
5. Confirm GitHub Pages serves `ministry-tracker-v47-theme-flash-fix`.
6. Verify app opens without dark/light/dark flash.
7. Verify theme toggle still supports dark, light, and auto if present.
8. Record commit hash and live verification in the tracker MD.

Expected cache:

- Before: `ministry-tracker-v46-notification-route-fix`
- After: `ministry-tracker-v47-theme-flash-fix`

Do not proceed with deeper polish until v47 is committed or the staged changes are intentionally abandoned.

## Priority 1 — Stage I final verification

Already proven:

- Cloudflare Worker deployed.
- KV namespace exists.
- VAPID configured.
- `/api/health` passed with all required flags true.
- Notifications delivered to David’s iPhone while app was open.
- Notifications delivered to David’s iPhone while app was swipe-closed.
- Tapping a notification opened the app before v46; it landed on Home, so v46 added routing.

Still required:

1. Verify live cache is v46 or newer.
2. Create a reminder note with a near-future time.
3. Close/swipe-close app.
4. Let the notification arrive.
5. Tap notification.
6. Verify it opens/focuses Notes instead of Home.
7. If payload includes `sourceId`, verify it opens the matching note modal.
8. Edit reminder time and verify the new schedule is honored.
9. Delete reminder and verify old reminder does not fire.
10. Verify completed/archived reminders do not fire.
11. Verify no console errors during the flow.

Stage I live approval rule:

- If notification delivery, tap routing, scheduled reminder delivery, edit behavior, and delete/cancel behavior pass, mark Stage I `live-approved`.
- If tap routing passes but edit/delete are not verified, classify as `APPROVED WITH OBSERVATIONS`, still not fully live-approved.

## Priority 2 — Notes / Note Clip parity QA

Source work already recorded in v45:

- Category cards improved.
- All Notes preserved.
- Category-to-notes flow preserved.
- Search expanded.
- Filters expanded.
- Sort options added.
- Note modal rebuilt.
- Calendar note indicators improved.
- Spanish/English strings added.

Remaining verification checklist:

### Category workflow

- Open Notes tab.
- Open each category card.
- Add note from category; category must auto-select.
- Add note from All Notes; category may remain blank/default per intended design.
- Edit category name.
- Edit category icon.
- Edit category color/accent.
- Delete category and keep notes.
- Delete category and delete notes.
- Confirm empty category state reads cleanly.
- Confirm All Notes still shows uncategorized notes.

### Note workflow

- Add note.
- Edit note.
- Delete note.
- Mark done/completed.
- Archive note.
- Restore/reopen note.
- Verify priority badges.
- Verify status badges.
- Verify due/reminder badges.
- Verify card preview truncation.
- Verify long title/body behavior on mobile.

### Search/filter/sort

- Search by title.
- Search by body.
- Search by category name.
- Search empty state.
- Filter active.
- Filter open.
- Filter in progress.
- Filter done.
- Filter completed.
- Filter archived.
- Filter all.
- Sort updated date.
- Sort due date.
- Sort priority.
- Sort title.
- Confirm filters persist only as intended.

### Calendar integration

- Calendar dots/indicators show notes by created date.
- Calendar dots/indicators show notes by due date.
- Tap selected date and add note.
- Open note from calendar panel.
- Edit note from calendar panel.
- Confirm selected date is preserved.

### Mobile/desktop polish

- iPhone portrait.
- iPhone PWA installed.
- Desktop Chrome.
- Touch targets minimum comfortable size.
- Buttons are not cramped.
- Header rows do not overflow.
- Modals scroll correctly with keyboard open.
- Keyboard does not immediately dismiss while typing.
- Light mode and dark mode both readable.
- English and Spanish labels do not overflow.

## Priority 3 — Startup polish

After v47:

- Confirm no theme flash on cold open.
- Confirm no theme flash after service worker update.
- Confirm no theme flash after language toggle.
- Confirm no theme flash after app reopened from notification.
- Confirm no legacy `khub_theme` conflict remains.

## Priority 4 — Weather / Stage J

Do not start until authorized.

Planned feature set:

- Dashboard weather chip.
- Tap chip to open weather modal.
- Current conditions.
- Hourly forecast.
- 5-day forecast.
- Weather planning summary for ministry/service planning.
- Location permission prompt.
- Manual fallback if location denied.
- Loading state.
- Offline/error state.
- Cache weather briefly to avoid unnecessary API calls.
- Light/dark mode support.
- English/Spanish support.

Implementation guardrails:

- Do not break Home layout.
- Do not require login.
- Do not store precise location longer than needed unless user explicitly chooses saved location.
- Do not add paid API dependency without approval.
- Prefer a free weather API suitable for PWA use.

## Priority 5 — Final production QA

Run once after Stage I and Stage J are complete.

### Core screens

- Home.
- Timer.
- Calendar.
- Notes.
- Reports.
- Settings if present.

### Data safety

- Existing local data preserved.
- Export backup works.
- Import backup works with disposable test data only.
- Cloud Save works.
- Cloud Restore works only with explicit test/approval.
- No IndexedDB fatal error.
- No data wipe/migration without explicit approval.

### Push

- Permission prompt.
- Test Push.
- Scheduled reminder.
- Closed-app notification.
- Notification tap route.
- Edit reminder.
- Delete reminder.
- Completed/archived reminder cancellation.

### Languages/themes

- English.
- Spanish.
- Light.
- Dark.
- Auto/system if present.

### PWA/offline/cache

- Installed iPhone PWA opens.
- Service worker updates cleanly.
- Cache version matches MD.
- Offline shell loads if expected.
- No stale JS after update.

## Remaining roadmap summary

1. Commit/push v47 theme flash fix.
2. Verify v47 live.
3. Verify v46/v47 notification tap routing on David’s iPhone.
4. Verify reminder edit/delete lifecycle.
5. Complete Notes parity QA and fix only confirmed gaps.
6. Build Stage J Weather when authorized.
7. Final production QA.
8. Mark release-ready.

## Supervisor completion estimate

- Core app: 99%+
- Push infrastructure: 99%, pending routing/lifecycle verification.
- Notes: 95%, pending full live QA.
- Weather: 0%, planned only.
- Overall: about 97% before Weather, lower if Weather is counted as required for final release.
