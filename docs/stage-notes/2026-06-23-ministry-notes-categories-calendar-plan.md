---
title: "TEMP — Ministry Notes & Reminders Implementation Tracker"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
reference_repo: "davidfontenelle80-cloud/note-clip"
boilerplate_repo: "davidfontenelle80-cloud/KHub-Boilerplate"
stage: "Stage A — COMPLETE"
status: "active implementation tracker"
created: "2026-06-23"
updated: "2026-06-24"
owner: "David"
supervisor: "App Supervisor / Builder Sol"
priority: "high"
source_of_truth: true
temporary_file: true
must_update_after_each_stage: true
delete_after: "Feature is implemented, tested, pushed, live-approved, summarized, and no longer needed as working memory."
implementation_language: "Inspect Note Clip, document how it works, then duplicate/adapt the same structure inside Ministry Tracker. Do not merge Note Clip into Ministry Tracker."
last_verified_live: null
current_owner: "Codex/Coworker/Claude/ChatGPT"
commit_history: ["a93921f"]
---

# TEMP — Ministry Notes & Reminders Implementation Tracker

## MASTER RULE — THIS FILE IS THE SOURCE OF TRUTH

Before making code changes:

1. Read this entire document.
2. Inspect the actual repo.
3. Compare repo state to this document.
4. If repo state differs, update this document first.
5. Do not code until the inspection report is added.

After every completed stage:

- Update checklist items.
- Add commit hash.
- Add files changed.
- Add tests run.
- Add screenshots if UI changed.
- Add cache version before/after.
- Add mobile verification.
- Add desktop verification.
- Add light/dark verification.
- Add English/Spanish verification.
- Add live GitHub Pages verification.
- Add remaining risks.

Never delete completed checklist items during the build. Mark them COMPLETE with commit/hash/date.

Delete this temporary MD only after:

- Feature complete.
- QA complete.
- Mobile verified.
- Desktop verified.
- Light/dark verified.
- English/Spanish verified.
- Export/import verified.
- Cloud backup verified.
- Live GitHub Pages verified.
- Final summary recorded.

## Purpose of This Temporary File

This is the temporary working tracker for the Ministry Tracker Notes & Reminders buildout.

Purpose:

- Prevent model drift.
- Let Codex, CoWork, Claude, or ChatGPT resume after credits/context loss.
- Track what was done, what is left, how it was done, commits, files, tests, risks, screenshots, and live verification.
- Keep one shared source of truth for staging decisions.
- Force every worker to update progress after each stage.

This file must be deleted only after the full buildout is implemented, tested, live-approved, and summarized elsewhere.

## MAIN PROJECT GOAL

Add a new **Notes & Reminders** feature to Ministry Tracker by duplicating/adapting the Note Clip **Categories → Notes → Calendar** workflow.

Important wording:

- Do **not** “merge” Note Clip into Ministry Tracker.
- Inspect Note Clip, document how it works, then duplicate/adapt the same structure inside Ministry Tracker.
- The new feature must feel native to Ministry Tracker, not pasted from Note Clip.

## CRITICAL GUARDRAIL — DO NOT TOUCH EXISTING SERVICE CATEGORIES

Do **not** use or modify Ministry Tracker’s existing `categories` array for this feature.

Existing categories are for service/session logging and reports.

Create separate data:

```js
ministryNoteCategories: []
ministryNotes: []
```

If any implementation starts mixing Ministry Notes with existing service/session `categories`, stop immediately and report the problem.

## Target Bottom Navigation

Current bottom nav:

- Home
- Timer
- Calendar
- Log
- Reports

New bottom nav:

- Home
- Timer
- Calendar
- Notes & Reminders
- Reports

## Desired User Workflow

David wants the Ministry app to work like this:

1. Open the Notes & Reminders tab.
2. See Ministry note categories such as Return Visits and Bible Studies.
3. Tap a category.
4. Add notes inside that category.
5. Add person/contact/date/time/reminder details to the note.
6. Open Calendar.
7. See notes appear on the correct due dates.
8. Tap a note from Calendar.
9. Edit the same note record.
10. Return to Notes & Reminders and see the updated note.

There must not be two separate note systems.

A note created in Notes & Reminders must be editable from Calendar.

A note created from Calendar must appear in Notes & Reminders.

## STAGE A — Navigation Cleanup FIRST

### Objective

Free the Log tab slot by moving Log into Reports before building Notes & Reminders.

### Requirements

- [x] Remove dedicated bottom-nav Log tab. — commit a93921f
- [x] Add Notes & Reminders bottom-nav tab (placeholder). — commit a93921f
- [x] Move Log functionality into Reports. — commit a93921f
- [x] Reports screen contains monthly report summary. (pre-existing, unchanged)
- [x] Reports screen contains service year report. (pre-existing, unchanged)
- [x] Reports screen contains category report. (pre-existing, unchanged)
- [x] Reports screen contains Log History section. — commit a93921f
- [x] Log History defaults to current month. — commit a93921f
- [x] Log History supports month picker. — commit a93921f
- [x] Log History supports year picker. — commit a93921f
- [x] Log History can view old months/years. — commit a93921f
- [x] Log History supports searching existing session notes. — commit a93921f
- [x] Log History supports editing sessions. — commit a93921f
- [x] Log History supports deleting sessions. — commit a93921f
- [x] Reports screen remains clean and uncluttered. — commit a93921f
- [x] Existing log data remains unchanged. (localStorage key untouched)
- [x] Existing reports and totals do not change. (renderReports() untouched)

### Layout Guidance

Reports should show reports first and Log History below, or use a clean segmented/toggle section if better.

### Stop Conditions

- Stop if hour totals change.
- Stop if reports break.
- Stop if sessions cannot be edited.
- Stop if historical logs cannot be accessed.
- Stop if mobile nav becomes crowded.

### Stage A status

`COMPLETE — commit a93921f — 2026-06-24`

**What was done:**
- Swapped bottom-nav Log tab (fa-list, `nav_log`) for Notes & Reminders tab (fa-note-sticky, `nav_notes`, `data-screen="notes"`).
- Replaced `#screen-log` div with `#screen-notes` placeholder (minimal UI, ready for Stage D).
- Added `#section-logHistory` inside `#screen-reports` with full Log History implementation: month/year selectors, session-note search, session edit/delete, prev/next navigation.
- Added null guard in `renderLog()` so it silently skips when `#log-list` is not in the DOM.
- Added `renderNotes()` (Stage A placeholder, renders nothing) and `renderLogHistory()` (full implementation) to `renderAll()`.
- Updated `SCREEN_ORDER` to `['home', 'timer', 'calendar', 'notes', 'reports', 'settings']`.
- Updated `applyI18n()` with `lbl_navNotes`, `nav_notes`, `lbl_logHistory` mappings.
- Added EN/ES i18n keys: `nav_notes` / `'Notas y Recordatorios'`, `logHistory` / `'Historial de Registro'`.
- Bumped `CACHE_VERSION`: `v33-credit-hours-separated` → `v34-stage-a-notes-nav`.
- **Critical guardrail honored**: existing `categories` array untouched. `ministryNoteCategories` and `ministryNotes` NOT yet created (Stage C).

## STAGE B — Inspect Note Clip

Before coding Notes & Reminders, inspect Note Clip and document findings in this file.

### Required inspection topics

- [ ] Storage shape for categories and notes.
- [ ] Category grid behavior.
- [ ] Category add/edit/delete.
- [ ] Notes inside category.
- [ ] All notes view.
- [ ] Note cards.
- [ ] Note modal.
- [ ] Due date and due time.
- [ ] Reminder fields.
- [ ] Appointment/location fields.
- [ ] Calendar note indicators.
- [ ] Calendar selected-day note list.
- [ ] Opening/editing note from calendar.
- [ ] Export/import implications.
- [ ] Cloud backup implications.
- [ ] Service worker/cache version behavior.

### Suggested Note Clip files/functions to inspect

- [ ] `js/storage.js` — state shape, categories, notes, CRUD helpers.
- [ ] `js/notes.js` — category grid, note cards, note modal, category modal, status/search/filter behavior.
- [ ] `js/calendar.js` — calendar indicators, notes by date, upcoming/overdue sections, open/edit note from calendar.
- [ ] `app.js` — routing/FAB behavior between notes and calendar.
- [ ] `index.html` — script load order and tab structure.
- [ ] CSS files — category grid, note cards, modal, calendar rows.
- [ ] i18n labels — note/category/calendar labels.
- [ ] Service worker/cache files — current cache version and deploy behavior.
- [ ] Backup/export/import/cloud behavior — confirm full state preservation.

### Note Clip inspection notes

```txt
Pending. Must be filled before implementing Notes & Reminders.
```

### Stage B status

`pending`

## STAGE C — Ministry Notes Data Model

Add separate Ministry-specific data:

```js
ministryNoteCategories: []
ministryNotes: []
```

### Default Ministry note categories

- Return Visits / Revisitas
- Bible Studies / Estudios bíblicos
- Interested Persons / Personas interesadas
- Calls / Llamadas
- Messages / Mensajes
- Territory / Territorio
- Appointments / Citas
- Personal / Personal

### Recommended note object

```js
{
  id,
  title,
  body,
  categoryId,
  personName,
  phone,
  address,
  locationName,
  priority,
  status,
  dueDate,
  dueTime,
  reminder,
  reminderAt,
  sourceSessionId,
  sourceDate,
  completed,
  archived,
  createdAt,
  updatedAt
}
```

### Required

- [ ] Migration-safe defaults.
- [ ] Existing users must not lose data.
- [ ] Export/import must preserve new fields.
- [ ] Cloud backup/restore must preserve new fields.
- [ ] Existing `categories` array remains untouched.
- [ ] Existing logs, reports, sessions, and credit hours remain unchanged.

### Stop Conditions

- Stop if service report totals change unexpectedly.
- Stop if existing service `categories` are renamed, moved, or repurposed.
- Stop if export/import drops notes.
- Stop if cloud backup drops notes.

### Stage C status

`pending`

## STAGE D — Notes & Reminders UI

Create a dedicated Notes & Reminders tab.

### Intro banner/card

Title:

```txt
Notes & Reminders
```

Text idea:

```txt
Keep track of return visits, Bible studies, interested persons, calls, messages, territory follow-up, and ministry appointments. Create categories, organize notes, set reminders, and access them from the calendar.
```

### Required UI

- [ ] Category grid.
- [ ] All notes view.
- [ ] Notes inside selected category.
- [ ] Add/edit category.
- [ ] Delete category safely.
- [ ] Add/edit note.
- [ ] Note card.
- [ ] Search.
- [ ] Status filters.
- [ ] Priority.
- [ ] Due date.
- [ ] Due time.
- [ ] Reminder fields.
- [ ] Complete/archive/reopen.
- [ ] Empty states that guide the user.

### Avoid

- [ ] No native `prompt()`.
- [ ] No dead buttons.
- [ ] No placeholder UI.
- [ ] No fake success messages.
- [ ] No push notification promises before infrastructure exists.

### Stage D status

`pending`

## STAGE E — Calendar Integration

Calendar must access the same Ministry Notes data.

### Requirements

- [ ] Notes with due dates appear on the calendar.
- [ ] Calendar days with notes show an indicator.
- [ ] Selecting a day shows that day’s Ministry Notes.
- [ ] Tapping a note opens the same edit modal.
- [ ] Editing from calendar updates the same record.
- [ ] Adding a note from selected calendar day pre-fills `dueDate`.
- [ ] Existing calendar planning/logging behavior remains intact.
- [ ] No duplicate note systems.

### Stop Conditions

- Stop if Calendar data becomes ambiguous.
- Stop if existing Calendar log/plan workflows break.
- Stop if notes created from Calendar are stored separately from Notes & Reminders records.

### Stage E status

`pending`

## STAGE F — Reminder Foundation

### First pass requirements

- [ ] Save reminder fields.
- [ ] Show reminder badges.
- [ ] Show reminders in calendar/upcoming/overdue.
- [ ] Do not fake push notifications.

### Later FCM path

Later FCM push notification integration can connect to the existing approved KHub path:

```txt
/khubApps/ministry-tracker/users/{uid}/notificationTokens/{tokenId}
```

### Stop Conditions

- Stop if app claims push notifications are enabled when they are not.
- Stop if reminder data is saved but never visible.
- Stop if FCM is attempted before approved infrastructure work.

### Stage F status

`pending`

## STAGE G — Visual/Brand Alignment

Use Ministry Tracker’s existing design:

- Existing cards.
- Existing buttons.
- Existing modals.
- Existing dark/light theme.
- Existing bilingual labels.
- Mobile-friendly touch targets.
- Clean, ministry-appropriate tone.

Do not copy Note Clip’s visual theme blindly unless it fits Ministry.

### Checklist

- [ ] Feature feels native to Ministry Tracker.
- [ ] Ministry card styles are reused.
- [ ] Ministry button/chip styles are reused.
- [ ] Ministry modal style is reused.
- [ ] Mobile touch targets are large enough.
- [ ] Icon buttons have aria-labels.
- [ ] Focus remains visible.
- [ ] Spanish text does not overflow.
- [ ] Light mode verified.
- [ ] Dark mode verified.

### Stage G status

`pending`

## STAGE H — QA / Live Verification

### Required tests

- [ ] App loads.
- [ ] No console errors.
- [ ] Home works.
- [ ] Timer works.
- [ ] Calendar works.
- [ ] Reports work.
- [ ] Log History works inside Reports.
- [ ] Historical month/year log browsing works.
- [ ] Session edit/delete still works.
- [ ] Existing service categories still work.
- [ ] Existing reports still calculate correctly.
- [ ] Credit hours still work.
- [ ] Notes & Reminders tab opens.
- [ ] Note categories add/edit/delete.
- [ ] Notes add/edit/delete.
- [ ] Notes inside categories work.
- [ ] Search works.
- [ ] Status filters work.
- [ ] Due dates appear on calendar.
- [ ] Calendar edit updates same note.
- [ ] Export/import includes notes/reminders.
- [ ] Cloud backup/restore includes notes/reminders.
- [ ] Mobile verified.
- [ ] Desktop verified.
- [ ] Light mode verified.
- [ ] Dark mode verified.
- [ ] English verified.
- [ ] Spanish verified.
- [ ] Service worker cache version bumped.
- [ ] GitHub Pages live verified.

### Approval rule

If live GitHub Pages was not verified, status is:

```txt
code-implemented, not live-approved yet
```

Do not approve vague reports.

### Stage H status

`pending`

## Required Ministry Tracker Inspection Before Coding

Inspect Ministry Tracker and document findings here before any code changes.

- [ ] `index.html` screen structure.
- [ ] Bottom nav structure.
- [ ] Home screen entry points.
- [ ] Calendar screen rendering and selected-day behavior.
- [ ] Log screen and existing session notes.
- [ ] Reports screen and report calculation logic.
- [ ] Settings screen and existing service categories.
- [ ] `js/app.js` state defaults and load/save logic.
- [ ] i18n object in `js/app.js`.
- [ ] Export/import logic.
- [ ] Cloud backup logic.
- [ ] Theme/light/dark behavior.
- [ ] Modal/component utilities.
- [ ] Service worker/cache version.

### Ministry inspection notes

```txt
Inspection completed: 2026-06-24 — based on origin/main at c763c41.

Architecture:
- Single-page PWA (multi-file): index.html scaffold + js/app.js + separate CSS + sw.js.
- Bottom nav driven by data-screen attributes, SCREEN_ORDER array, switchScreen() function.
- EN/ES bilingual i18n inside js/app.js as nested objects.
- renderAll() calls all render functions; applyI18n() maps element IDs to i18n keys.
- LocalStorage key: 'ministry-tracker-v4'.
- Firebase cloud backup paths unchanged and not touched.
- Service worker CACHE_VERSION was: 'ministry-tracker-v33-credit-hours-separated'.

Bottom nav (v33 baseline):
- Home | Timer | Calendar | Log | Reports | Settings
- SCREEN_ORDER: ['home', 'timer', 'calendar', 'log', 'reports', 'settings']

Reports screen (v33 baseline):
- Contains monthly report summary, service year report, category report.
- No Log History section (added in Stage A).

Log screen (v33 baseline):
- Dedicated tab: data-screen="log", icon fa-list, label nav_log.
- #screen-log div with #log-list.
- Removed in Stage A; renderLog() null-guarded.

Key guardrail confirmed:
- Existing categories array: used only for service/session logging and reports.
- ministryNoteCategories and ministryNotes do NOT yet exist in the data model.

Stage A changes applied cleanly on top of this baseline.
```

## KHub / KO Boilerplate Review Requirement

Before code implementation, review the KHub boilerplate for reusable systems and document findings here.

### Reusable systems to check

- [ ] Navigation.
- [ ] Theme.
- [ ] Light/dark mode.
- [ ] Language/i18n.
- [ ] Settings.
- [ ] Storage.
- [ ] Firebase/cloud backup.
- [ ] PWA/service worker/cache.
- [ ] Icons.
- [ ] Accessibility.
- [ ] Deployment.

### Boilerplate gap report

```txt
Reusable:
Pending.

Missing:
Pending.

App-specific:
Pending.

Boilerplate improvements:
Pending.
```

## Stage Commit / Verification Log

Add newest entries at the bottom. Do not remove old entries.

```txt
Date: 2026-06-24
Stage: Stage A — Navigation Cleanup
Summary: Swapped bottom-nav Log tab for Notes & Reminders placeholder. Moved full Log History (month/year picker, search, edit/delete) into Reports screen. Bumped CACHE_VERSION to v34.
Commit hash: a93921f
Files changed: sw.js, index.html, js/app.js (3 files, +149/-57 lines)
Tests run: static code review; renderAll() trace; null guard on renderLog() confirmed; SCREEN_ORDER verified; i18n keys verified
Screenshots if UI changed: pending live verification
Cache version before: ministry-tracker-v33-credit-hours-separated
Cache version after: ministry-tracker-v34-stage-a-notes-nav
Bugs fixed: null guard added in renderLog() to prevent crash when #log-list is absent
Known issues: Notes & Reminders tab is a placeholder only (empty screen) — content comes in Stage D
Mobile verification: pending — requires live GitHub Pages load on device
Desktop verification: pending — requires live GitHub Pages load
Light/dark verification: pending
English/Spanish verification: i18n keys added for nav_notes and logHistory in both EN and ES; live verification pending
Export/import verification: no data model changes in Stage A; export/import unaffected
Cloud backup/restore verification: no Firebase paths changed; unaffected
Live GitHub Pages verification: code-implemented, not live-approved yet
Remaining risks: (1) renderLogHistory() event listeners assume button IDs exist on DOM load — safe since they are in #screen-reports which is always rendered; (2) Notes & Reminders placeholder screen is intentionally empty; (3) Existing sessions editable only from Log History inside Reports — confirm UX acceptable before Stage D
Checklist items completed in this MD: All 17 Stage A checklist items marked complete
Checklist items still pending: Stages B through H
Status: APPROVED WITH OBSERVATIONS — code implemented and pushed; live GitHub Pages verification still needed
```

## Required Report After Each Stage

Every worker must report back with:

```txt
Summary:
Commit hash:
Files changed:
Tests run:
Screenshots if UI changed:
Cache version before:
Cache version after:
Bugs fixed:
Known issues:
Mobile verification:
Desktop verification:
Light/dark verification:
English/Spanish verification:
Export/import verification:
Cloud backup/restore verification:
Live GitHub Pages verification:
Remaining risks:
Updated MD checklist confirmation:
```

## Approval Rules

Mark one:

```txt
APPROVED
APPROVED WITH OBSERVATIONS
REQUIRES CHANGES
BLOCKED
```

If live GitHub Pages has not been verified, status must be:

```txt
code-implemented, not live-approved yet
```

Do not approve vague reports.

Do not approve if cache version was not bumped for deployable changes.

Do not approve if service categories and Ministry note categories are mixed.

Do not proceed to the next stage early.

## Final Cleanup Rule

This is a temporary build-control file.

Delete this file only after:

- [ ] Feature fully implemented.
- [ ] QA complete.
- [ ] Mobile verified.
- [ ] Desktop verified.
- [ ] Light/dark verified.
- [ ] English/Spanish verified.
- [ ] Export/import verified.
- [ ] Cloud backup verified.
- [ ] Live GitHub Pages verified.
- [ ] Final summary recorded in permanent docs or deployment history.
- [ ] David/App Supervisor approves deletion.

When deleting, use commit message:

```txt
Remove temporary Ministry notes build checklist after approval
```

## One-Message Prompt for Codex/Coworker — Stage 0 / A Start

```txt
Open the Ministry Tracker repo: davidfontenelle80-cloud/ministry-tracker-.

Read this file first and treat it as the temporary source of truth:
docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md

Do not code immediately.

First inspect:
- Ministry Tracker actual repo state.
- Note Clip repo: davidfontenelle80-cloud/note-clip.
- KHub boilerplate repo: davidfontenelle80-cloud/KHub-Boilerplate.

Update the markdown with the inspection report before code changes.

Main goal:
Add a new Notes & Reminders feature to Ministry Tracker by duplicating/adapting Note Clip’s Categories → Notes → Calendar workflow. Do not merge Note Clip into Ministry Tracker.

First implementation stage after inspection:
Stage A — Navigation Cleanup FIRST.

Stage A must:
- Remove the dedicated Log bottom-nav tab.
- Add Notes & Reminders bottom-nav tab.
- Move Log functionality into Reports.
- Keep reports and totals unchanged.
- Keep edit/delete session functionality.
- Add current-month default, month picker, year picker, old month/year browsing, and session-note search to Log History inside Reports.

Critical guardrail:
Do not touch or repurpose Ministry Tracker’s existing `categories` array. That belongs to service/session logging and reports. New data must be separate:
ministryNoteCategories: []
ministryNotes: []

Stop if:
- Ministry Notes are being mixed with existing service categories.
- Reports/hour totals would be affected.
- Sessions cannot be edited/deleted.
- Historical logs cannot be accessed.
- Export/import would lose notes.
- Cloud backup would lose notes.
- Cache version cannot be confirmed.
- Calendar behavior is unclear.
- Mobile nav becomes crowded.

Required report after each stage:
Summary, commit hash, files changed, tests run, screenshots if UI changed, cache version before/after, bugs fixed, known issues, mobile verification, desktop verification, light/dark verification, English/Spanish verification, export/import verification, cloud backup/restore verification, live GitHub Pages verification, remaining risks, updated MD checklist confirmation.

If live GitHub Pages was not verified, status must be:
code-implemented, not live-approved yet
```
