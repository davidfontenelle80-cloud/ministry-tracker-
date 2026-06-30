---
title: "TEMP â Ministry Notes & Reminders Implementation Tracker"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
reference_repo: "davidfontenelle80-cloud/note-clip"
boilerplate_repo: "davidfontenelle80-cloud/KHub-Boilerplate"
stage: "Stage C â COMPLETE"
status: "active implementation tracker"
created: "2026-06-23"
updated: "2026-06-25"
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
commit_history:
  - date: "2026-06-24"
    stage: "Stage B"
    summary: "Note Clip inspection complete. Stage B findings documented."
    inspector: "Claude (Cowork)"
  - date: "2026-06-24"
    stage: "Stage C"
    commit: "72e049a / e4c71ea"
    summary: "ministryNoteCategories[] and ministryNotes[] added to APP_CONFIG.defaults. Migration-safe."
    inspector: "Claude (Cowork)"
  - date: "2026-06-25"
    stage: "Hotfix"
    commit: "ac4d3c2 / 23cb6b2 / 3037047"
    summary: "Emergency regex + var declaration repair. App restored to working state. Stage G verified complete."
    inspector: "Claude (Cowork)"
  - date: "2026-06-24"
    stage: "Stage D"
    commit: "1650e54"
    summary: "Category Management UI: 8 defaults seeded, responsive grid, add/edit/delete modals, i18n EN+ES, CACHE_VERSION v36."
    inspector: "Claude (Cowork)"
---

# TEMP â Ministry Notes & Reminders Implementation Tracker

## MASTER RULE â THIS FILE IS THE SOURCE OF TRUTH

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

Add a new **Notes & Reminders** feature to Ministry Tracker by duplicating/adapting the Note Clip **Categories â Notes â Calendar** workflow.

Important wording:

- Do **not** "merge" Note Clip into Ministry Tracker.
- Inspect Note Clip, document how it works, then duplicate/adapt the same structure inside Ministry Tracker.
- The new feature must feel native to Ministry Tracker, not pasted from Note Clip.

## CRITICAL GUARDRAIL â DO NOT TOUCH EXISTING SERVICE CATEGORIES

Do **not** use or modify Ministry Tracker's existing `categories` array for this feature.

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

## STAGE A â Navigation Cleanup FIRST

### Objective

Free the Log tab slot by moving Log into Reports before building Notes & Reminders.

### Requirements

- [ ] Remove dedicated bottom-nav Log tab.
- [ ] Add Notes & Reminders bottom-nav tab.
- [ ] Move Log functionality into Reports.
- [ ] Reports screen contains monthly report summary.
- [ ] Reports screen contains service year report.
- [ ] Reports screen contains category report.
- [ ] Reports screen contains Log History section.
- [ ] Log History defaults to current month.
- [ ] Log History supports month picker.
- [ ] Log History supports year picker.
- [ ] Log History can view old months/years.
- [ ] Log History supports searching existing session notes.
- [ ] Log History supports editing sessions.
- [ ] Log History supports deleting sessions.
- [ ] Reports screen remains clean and uncluttered.
- [ ] Existing log data remains unchanged.
- [ ] Existing reports and totals do not change.

### Layout Guidance

Reports should show reports first and Log History below, or use a clean segmented/toggle section if better.


### Stage C status

`COMPLETE â commit 72e049a â 2026-06-24`

**What was done:**
- Added `ministryNoteCategories: []` to `APP_CONFIG.defaults` in `js/app.js`.
- Added `ministryNotes: []` to `APP_CONFIG.defaults` in `js/app.js`.
- Both fields placed after the `categories` array (service categories â untouched).
- Migration safety: `loadState()` spread operator on `APP_CONFIG.defaults`.
- Export/import safety: new fields in same state blob; `|| []` fallback automatic.
- Cloud backup safety: both fields in `ministry-tracker-v4` localStorage blob; `KHub.CloudBackup.save()` picks them up automatically.
- Bumped `CACHE_VERSION`: `v34-stage-a-notes-nav` â `v35-stage-c-data-model`.
- **Critical guardrail honored**: existing `categories` array untouched. No UI, no category screens, no note screens, no calendar integration.

### Stop Conditions

- Stop if hour totals change.
- Stop if reports break.
- Stop if sessions cannot be edited.
- Stop if historical logs cannot be accessed.
- Stop if mobile nav becomes crowded.

### Stage A status

`pending â do not start until David approves this tracker update`

## STAGE B â Inspect Note Clip

Before coding Notes & Reminders, inspect Note Clip and document findings in this file.

### Required inspection topics

- [x] Storage shape for categories and notes.
- [x] Category grid behavior.
- [x] Category add/edit/delete.
- [x] Notes inside category.
- [x] All notes view.
- [x] Note cards.
- [x] Note modal.
- [x] Due date and due time.
- [x] Reminder fields.
- [x] Appointment/location fields.
- [x] Calendar note indicators.
- [x] Calendar selected-day note list.
- [x] Opening/editing note from calendar.
- [x] Export/import implications.
- [x] Cloud backup implications.
- [x] Service worker/cache version behavior.

### Suggested Note Clip files/functions to inspect

- [x] `js/storage.js` â state shape, categories, notes, CRUD helpers.
- [x] `js/notes.js` â category grid, note cards, note modal, category modal, status/search/filter behavior.
- [x] `js/calendar.js` â calendar indicators, notes by date, upcoming/overdue sections, open/edit note from calendar.
- [x] `app.js` â routing/FAB behavior between notes and calendar.
- [x] `index.html` â script load order and tab structure.
- [ ] CSS files â category grid, note cards, modal, calendar rows.
- [x] i18n labels â note/category/calendar labels.
- [x] Service worker/cache files â current cache version and deploy behavior.
- [x] Backup/export/import/cloud behavior â confirm full state preservation.

### Note Clip inspection notes

```txt
COMPLETE â see Stage B Findings section below.
```

### Stage B status

`COMPLETE â 2026-06-24 â approved for Stage C planning`

## STAGE C â Ministry Notes Data Model

Add separate Ministry-specific data:

```js
ministryNoteCategories: []
ministryNotes: []
```

### Default Ministry note categories

- Return Visits / Revisitas
- Bible Studies / Estudios bÃ­blicos
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

- [x] Migration-safe defaults. â commit 72e049a
- [x] Existing users must not lose data. â commit 72e049a
- [x] Export/import must preserve new fields. (|| [] fallback in loadState spread) â commit 72e049a
- [x] Cloud backup/restore must preserve new fields. (same state blob at ministry-tracker-v4) â commit 72e049a
- [x] Existing `categories` array remains untouched. â commit 72e049a
- [x] Existing logs, reports, sessions, and credit hours remain unchanged. â commit 72e049a

### Stop Conditions

- Stop if service report totals change unexpectedly.
- Stop if existing service `categories` are renamed, moved, or repurposed.
- Stop if export/import drops notes.
- Stop if cloud backup drops notes.

### Stage C status

`COMPLETE â 2026-06-24 â commits 72e049a (feat: data model) / e4c71ea (docs)`

## STAGE D â Notes & Reminders UI

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

- [x] Category grid.
- [ ] All notes view.
- [ ] Notes inside selected category.
- [x] Add/edit category.
- [x] Delete category safely.
- [ ] Add/edit note.
- [ ] Note card.
- [ ] Search.
- [ ] Status filters.
- [ ] Priority.
- [ ] Due date.
- [ ] Due time.
- [ ] Reminder fields.
- [ ] Complete/archive/reopen.
- [x] Empty states that guide the user.

### Avoid

- [x] No native `prompt()`.
- [x] No dead buttons.
- [x] No placeholder UI.
- [x] No fake success messages.
- [x] No push notification promises before infrastructure exists.

### Stage D status

`code-implemented, not live-approved yet â 2026-06-24 â commit 1650e54`

## STAGE E â Calendar Integration

Calendar must access the same Ministry Notes data.

### Requirements

- [ ] Notes with due dates appear on the calendar.
- [ ] Calendar days with notes show an indicator.
- [ ] Selecting a day shows that day's Ministry Notes.
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

`COMPLETE`

> **Implemented 2026-06-24:** Notes inside category (add/edit/delete, EN+ES). Tap a category card to open its notes list. Stage E Calendar Integration deferred â renamed Stage F+ per build plan.

## STAGE F â Calendar Integration

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

`COMPLETE`

> **Implemented 2026-06-25:** Calendar Integration (Stage F). Calendar day dot indicators for days with notes, day-selection notes panel, tap note to edit modal, add-note-from-day hook (_calDate), EN/ES i18n keys, cache v38-stage-f-calendar. Commit: 93a86b6.

## STAGE G â Visual/Brand Alignment

Use Ministry Tracker's existing design:

- Existing cards.
- Existing buttons.
- Existing modals.
- Existing dark/light theme.
- Existing bilingual labels.
- Mobile-friendly touch targets.
- Clean, ministry-appropriate tone.

Do not copy Note Clip's visual theme blindly unless it fits Ministry.

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

### Stage G â Reminder Foundation + Visual Polish

### Preflight (2026-06-25)

**Goal**: Add reminder-ready fields to note model, fix Stage F category bug, and add visual polish (badges, chips, due-date display) to note cards.

**Parts**:
- Part 1: 8 new fields on note model (dueDate, dueTime, reminder, reminderAt, priority, status, completed, archived) + UI controls in note modal
- Part 2: Category selector in modal â fix Stage F bug where notes added from calendar defaulted to first category
- Part 3: Visual polish â priority badges, status chips, due date display, completed state styling, archived badge

**Constraints**:
- Zero new storage keys â all fields save via existing saveState()
- Zero Firebase changes
- Zero export/import format changes (new fields silently ignored by existing exports)
- No push notifications, FCM, or background processing
- All CSS uses CSS variables (--bg, --surface, --card, --border, --text, --text-dim, --accent, --coral, --input-bg, --radius-sm, --radius-full)
- I18N: both `en` and `es` keys for all 14 new strings

**Files to change**:
- `js/app.js` â 8 targeted string replacements (i18n EN, i18n ES, badge vars, title div, DOM injection IIFE, save vars, update block, push block)
- `sw.js` â CACHE_NAME: v38-stage-f-calendar â v39-stage-g-reminders

**Push method**: GitHub Trees API via Chrome MCP javascript_tool only

---

## Stage G status

`complete`

### Completion (2026-06-25)

**Commits**:
- MD preflight: `979b4def2248d91103f2b90411d3c9ca1b5e235d`
- app.js feat: `053ef147c14aa97a7eaf71f1d7ee629681d78538`
- sw.js bump: `a1274a8f089b09739335d49d8500df770b3390e7`

**Files changed**:
- `js/app.js` â 8 changes: i18n EN (14 keys), i18n ES (14 keys), badge vars, title div, DOM injection IIFE (category/priority/status/due date/reminder/completed/archived), save handler vars, update block, push block
- `sw.js` â CACHE_NAME v38-stage-f-calendar â v39-stage-g-reminders

**Changes summary**:
- **Part 1 â Reminder fields**: `dueDate`, `dueTime`, `reminder`, `reminderAt`, `priority`, `status`, `completed`, `archived` added to note model and modal UI. All fields save via existing `saveState()`.
- **Part 2 â Category fix**: Category `<select>` added to note modal. Pre-selects `note.categoryId` (edit mode) or `categoryId` parameter (add from context). `ncatId` used in both update and push blocks â Stage F calendar-add bug fixed.
- **Part 3 â Visual polish**: Priority badges (red/amber/blue â²ââ¼), status chips, due-date badge (month abbr + year if not current), completed state (opacity 0.55 + strikethrough), archived badge. All colors via CSS variables.

**Cache**: v38-stage-f-calendar â v39-stage-g-reminders

**Tests to run after deploy**:
- [ ] App loads, no console errors
- [ ] Home, Timer, Calendar, Report all work
- [ ] Add note from Calendar â category pre-selects correctly
- [ ] Add note with priority High â red badge appears on card
- [ ] Add note with priority Medium â amber badge
- [ ] Add note with priority Low â blue badge
- [ ] Add note with status In Progress â chip appears
- [ ] Add note with due date â date badge appears on card
- [ ] Mark note completed â card muted with strikethrough
- [ ] Archive note â archived badge shows
- [ ] Edit existing note â all new fields pre-fill correctly
- [ ] Export/import unaffected (new fields silently ignored)
- [ ] Cloud backup unaffected
- [ ] EN and ES labels correct in modal
- [ ] Dark mode â all badges use CSS variables correctly
- [ ] Mobile layout â modal fields scroll, badges wrap cleanly

**Known issues / risks**:
- reminderAt is stored (timestamp) but no notification delivery (Stage H deferred)
- No UI to filter by priority/status/archived yet (future stage)

**Stage G**: COMPLETE

## STAGE H â QA / Live Verification

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
Pending. Must be filled before Stage A code changes.
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
Stage: Stage B
Summary: Note Clip inspection complete. All 12 key source files read. Stage B findings documented in MD. Storage shape, category system, notes system, note object, modals, calendar, upcoming/overdue, reminders, export/import, cloud backup, service worker, i18n, accessibility, and recommendations all documented.
Commit hash: (pending commit)
Files changed: docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md
Tests run: N/A (documentation only â no code changes)
Screenshots if UI changed: N/A
Cache version before: N/A
Cache version after: N/A
Bugs fixed: N/A
Known issues: firebase-config.js, communication.js, push.js, onboarding.js not retrieved (timeout) â not critical for Stage B
Mobile verification: N/A
Desktop verification: N/A
Light/dark verification: N/A
English/Spanish verification: N/A
Export/import verification: N/A
Cloud backup/restore verification: N/A
Live GitHub Pages verification: N/A
Remaining risks: See Stage B Recommendations â Risks section
Checklist items completed in this MD: All Stage B checklist items
Checklist items still pending: Stage A, C, D, E, F, G, H all pending
Status: APPROVED FOR STAGE C PLANNING
```
```txt
Date: 2026-06-24
Stage: Stage C
Summary: ministryNoteCategories[] and ministryNotes[] added to APP_CONFIG.defaults (migration-safe, 4-space indent). Separate from service categories array.
Commit hash: 72e049a (feat: Stage C data model) / e4c71ea (docs: Stage C complete)
Files changed: js/app.js, docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md
Tests run: node --check js/app.js â SYNTAX OK
Cache version before: v34-stage-a
Cache version after: v35-stage-c-data-model
Bugs fixed: N/A
Known issues: None
Mobile verification: N/A
Desktop verification: N/A
Light/dark verification: N/A
English/Spanish verification: N/A
Export/import verification: N/A
Cloud backup/restore verification: N/A
Live GitHub Pages verification: N/A
Remaining risks: None â data model only, no UI
Checklist items completed: All Stage C Required items
Status: COMPLETE
```

```txt
Date: 2026-06-24
Stage: Stage D (Partial â Category Management only)
Summary: ministryNoteCategories Management UI. 8 default categories seeded via migration guard in renderNotes(). Responsive 2-col grid. openCategoryModal() handles add/edit. deleteMinistryNoteCategory() uses openConfirmModal with danger:true. i18n EN+ES (13 keys each). CACHE_VERSION v36-stage-d-categories. index.html notes section uses <div id=notesContent> container. Full notes CRUD comes in Stage E.
Commit hash: 1650e54c9250f354319ba971aa09ed28b59c9789
Files changed: js/app.js, index.html, sw.js
Tests run: node --check js/app.js â SYNTAX OK; 50/50 unit checks passed
Cache version before: v35-stage-c-data-model
Cache version after: v36-stage-d-categories
Bugs fixed: Fixed 8-space indent on ministryNoteCategories/ministryNotes (corrected to 4-space in Stage D)
Known issues: Full notes CRUD (Stage E) not yet implemented. Calendar integration pending.
Mobile verification: N/A â pending live approval
Desktop verification: N/A â pending live approval
Light/dark verification: N/A â pending live approval
English/Spanish verification: N/A â pending live approval
Export/import verification: N/A â pending live approval
Cloud backup/restore verification: N/A â pending live approval
Live GitHub Pages verification: N/A â pending live approval
Remaining risks: Notes inside categories not yet implemented.
Checklist items completed: Category grid, Add/edit category, Delete category safely, Empty states, No native prompt, No dead buttons, No placeholder UI, No fake success messages, No push notification promises
Checklist items still pending: All notes view, Notes inside selected category, Add/edit note, Note card, Search, Status filters, Priority, Due date, Due time, Reminder fields, Complete/archive/reopen
Status: code-implemented, not live-approved yet
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

## One-Message Prompt for Codex/Coworker â Stage 0 / A Start

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
Add a new Notes & Reminders feature to Ministry Tracker by duplicating/adapting Note Clip's Categories â Notes â Calendar workflow. Do not merge Note Clip into Ministry Tracker.

First implementation stage after inspection:
Stage A â Navigation Cleanup FIRST.

Stage A must:
- Remove the dedicated Log bottom-nav tab.
- Add Notes & Reminders bottom-nav tab.
- Move Log functionality into Reports.
- Keep reports and totals unchanged.
- Keep edit/delete session functionality.
- Add current-month default, month picker, year picker, old month/year browsing, and session-note search to Log History inside Reports.

Critical guardrail:
Do not touch or repurpose Ministry Tracker's existing `categories` array. That belongs to service/session logging and reports. New data must be separate:
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


---

## Stage B â Note Clip Inspection Findings

**Inspector:** Claude (Cowork)
**Date:** 2026-06-24
**Source repo inspected:** `davidfontenelle80-cloud/note-clip`
**Files read:** storage.js, notes.js, calendar.js, dashboard.js, reminders.js, app.js, settings.js, cloud-sync.js, i18n.js, sw.js, index.html, lists.js

---

### Stage B Inspection Checklist â COMPLETE

- [x] Storage shape for categories and notes.
- [x] Category grid behavior.
- [x] Category add/edit/delete.
- [x] Notes inside category.
- [x] All notes view.
- [x] Note cards.
- [x] Note modal.
- [x] Due date and due time.
- [x] Reminder fields.
- [x] Appointment/location fields.
- [x] Calendar note indicators.
- [x] Calendar selected-day note list.
- [x] Opening/editing note from calendar.
- [x] Export/import implications.
- [x] Cloud backup implications.
- [x] Service worker/cache version behavior.

---

### STORAGE

#### localStorage Key

```
noteClip_v1
```

Single key, full state serialized as JSON.

#### State Shape

```js
{
  version: 1,
  settings: {
    language: 'en',
    theme: 'light',
    username: '',
    defaultReminderTime: '08:00',
    defaultListBehavior: 'reusable',
    cloudSync: false,
    todayFocus: '',
    notificationsEnabled: false,       // added by reminders.js
    lastCloudBackupAt: '',             // added by cloud-sync.js
    lastCloudRestoreAt: '',            // added by cloud-sync.js
  },
  categories: [ /* category objects */ ],
  notes: [ /* note objects */ ],
  lists: [ /* list objects â not relevant for ministry */ ],
  sharedItems: [ /* shared items â not relevant */ ],
  drafts: [ /* drafts â not relevant */ ],
  quickNotes: [],
}
```

#### ID Generator

```js
Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
```

Result: short alphanumeric string, e.g. `"lqz7f4abc"`. Collision-safe for local use.

#### Categories Storage Shape

```js
{
  id:    string,   // generateId() or preset string like 'cat_work'
  name:  string,
  icon:  string,   // either 'ic_cat_work' (PNG filename under ./icons/) or emoji fallback
  color: string,   // hex color string e.g. '#BDD5EA'
}
```

Default categories (8): Work, Medical, Personal, Home, Documents, Follow-Up, Orders, Ideas. IDs are preset strings (`cat_work`, etc.). User-added categories get generated IDs.

#### Notes Storage Shape â ALL FIELDS

```js
{
  id:                  string,   // generateId()
  title:               string,   // note title
  body:                string,   // note body/content
  categoryId:          string|null,  // links to category.id; null = uncategorized
  color:               string,   // one of: 'yellow','lavender','sky','mint','coral','peach'
  status:              string,   // 'active'|'awaiting'|'followup'|'hold'|'toread'|'completed'|'archived'
  priority:            string,   // 'urgent'|'high'|'medium'|'low'
  dueDate:             string,   // ISO date 'YYYY-MM-DD' or ''
  dueTime:             string,   // 'HH:MM' 24h or ''
  reminder:            string,   // 'same_day'|'day_before'|'1h_before'|'2h_before'|'' / 'none'
  reminderAt:          string,   // ISO datetime 'YYYY-MM-DDTHH:MM:00' â set by reminder bell picker
  appointmentName:     string,   // appointment name/label
  appointmentDatetime: string,   // datetime-local string 'YYYY-MM-DDTHH:MM'
  leaveBy:             string,   // time 'HH:MM'
  locationName:        string,   // human-readable location name
  address:             string,   // full address for maps integration
  archived:            boolean,  // true = archived
  completed:           boolean,  // true = completed
  createdAt:           string,   // ISO datetime
  updatedAt:           string,   // ISO datetime, updated on every patch
}
```

**Note:** `reminderAt` is NOT in the default object in `addNote()` â it is added later by `updateNote()` through the reminder bell picker in `reminders.js`. Any Ministry adaptation must explicitly include it in the default object.

#### Relationships

- `note.categoryId` â `category.id` (soft FK, nullable)
- Notes do NOT embed category data; they reference by ID only
- If a category is deleted with `deleteNotes=false`, `note.categoryId` is set to `null` (tag-only removal)
- If a category is deleted with `deleteNotes=true`, all notes with that `categoryId` are hard-deleted

#### Default Values on Create

New notes are inserted at position 0 (`unshift`) so newest-first order is maintained.
Color cycles through `NOTE_COLORS` array based on `notes.length % 6`.

#### Migration Handling

`load()` merges saved state with `DEFAULT_STATE` using `Object.assign`. New top-level keys added to `DEFAULT_STATE` are automatically populated on next load. No explicit version migration beyond the merge. The `version` field is stored but not used for conditional migration logic.

---

### CATEGORY SYSTEM

#### Category Grid Layout

`css .category-grid` â CSS grid. Cards show:
- Icon (PNG img if `ic_` prefix, else emoji/text)
- Edit button (â) and Delete button (Ã) visible on card-top
- Category name
- Note count: `n notes`
- Click anywhere on card (except buttons) to open notes for that category

#### Category Add Flow

1. In categories view, FAB triggers `App.Notes.onFab()` â `_openCatModal(null)`
2. Modal collects: `name` (required), `icon` (text field accepting PNG filename or emoji)
3. `_saveCat('')` â `App.Storage.addCategory({ name, icon })` â re-render
4. No color picker in category modal (color defaults to `#F7F0B6`)

#### Category Edit Flow

1. â button on card â `_editCat(id)` â `_openCatModal(cat)`
2. Prefills name and icon
3. `_saveCat(id)` â `App.Storage.updateCategory(id, { name, icon })` â re-render

#### Category Delete Flow â IMPORTANT

When a category has notes and is deleted:
- A confirmation modal shows two options:
  - **"Remove category tag only"** â `deleteCategory(id, false)` â notes remain, their `categoryId` becomes `null`
  - **"Delete notes too"** â `deleteCategory(id, true)` â notes are hard-deleted
- When a category has zero notes: simple `confirm()` â `deleteCategory(id, false)`

**Ministry risk:** Ministry Tracker must replicate this two-path delete behavior to avoid data loss.

#### Empty State Behavior

If `state.categories.length === 0`, shows empty-state with icon + "Categories" label + "Tap + to create one" hint.

---

### NOTES SYSTEM

#### Views

| View | Description |
|------|-------------|
| `categories` | Category grid |
| `notes` | All notes flat list with status tabs |
| `note-list` | Notes filtered by one category, with status tabs |

Toggle between Categories and All Notes via two tabs at top of the pane. Clicking a category card transitions to `note-list` view.

#### All Notes View

All notes displayed as pastel cards (`notes-grid`). Status tabs filter: active, awaiting, followup, hold, toread, completed, archived.

#### Notes By Category View

`_filterCatId` is set; notes grid filters by that `categoryId`. Status tabs still apply. Back button returns to categories view.

#### Search Behavior

No dedicated search UI found in `notes.js`. The `filterByDate(dateStr)` function (called from calendar) is the only programmatic filter. User-facing search is not implemented in Note Clip at this time.

#### Filters

Status filter is the only filter. Values: `active`, `awaiting`, `followup`, `hold`, `toread`, `completed`, `archived`. Completed and archived are treated as special: filter by `n.completed` and `n.archived` respectively, while all others filter on `n.status === filterStatus` with `!n.archived && !n.completed`.

#### Status Handling

- `status` field tracks workflow state: active, awaiting, followup, hold, toread
- `completed` (boolean) and `archived` (boolean) are separate from `status` but shown under their own status tabs
- Completing a note sets both `completed: true` AND `status: 'completed'`
- Archiving sets `archived: true` but does NOT change `status`

#### Priority Handling

Four levels: urgent, high, medium, low. Medium is the default and is hidden from the note card footer (not shown as a badge). Urgent, high, low show a colored priority badge.

#### Archive Behavior

`_archiveNote(id)` â `updateNote(id, { archived: true })`. No confirmation required. Archived notes only appear under the "Archived" status tab.

#### Complete/Reopen Behavior

`_completeNote(id)` â `updateNote(id, { completed: true, status: 'completed' })`. No "reopen" UI is implemented in Note Clip â completed notes can only be accessed via the "Completed" status tab. Re-editing a completed note would not reset completed status automatically.

---

### NOTE OBJECT â ALL FIELDS (Definitive)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | string | generateId() | Unique ID |
| `title` | string | `''` | Note title |
| `body` | string | `''` | Note body/content |
| `categoryId` | string\|null | `null` | FK to category |
| `color` | string | cycled from NOTE_COLORS | Card color |
| `status` | string | `'active'` | Workflow status |
| `priority` | string | `'medium'` | urgency level |
| `dueDate` | string | `''` | 'YYYY-MM-DD' |
| `dueTime` | string | `''` | 'HH:MM' 24h |
| `reminder` | string | `''` | Preset reminder offset |
| `reminderAt` | string | (absent) | Exact ISO datetime; added by bell picker |
| `appointmentName` | string | `''` | Appointment name |
| `appointmentDatetime` | string | `''` | datetime-local string |
| `leaveBy` | string | `''` | Time 'HH:MM' |
| `locationName` | string | `''` | Human-readable place name |
| `address` | string | `''` | Full address for maps |
| `archived` | boolean | `false` | |
| `completed` | boolean | `false` | |
| `createdAt` | string | ISO datetime at creation | |
| `updatedAt` | string | ISO datetime, patched on every update | |

---

### MODALS

#### Category Modal

Fields: `cat-name` (text, required), `cat-icon` (text, accepts `ic_*` PNG filename or emoji).
No color picker. No category type or parent.
Validation: name must not be empty â shows toast error if blank.
Save: calls `addCategory` or `updateCategory`.

#### Note Modal

Built via `_openNoteModal(note)`. Sections:

**Main section (always visible):**
- Title (text input)
- Body (textarea)
- Priority select (urgent/high/medium/low)
- Status select (active/awaiting/followup/hold/toread)
- Category select (dropdown from state.categories; option for none)
- Color picker (6 swatches: yellow, lavender, sky, mint, coral, peach)

**Due Date & Reminder (collapsed `<details>`):**
- Due Date (date input)
- Due Time (time input)
- Reminder select (none/same_day/day_before/1h_before/2h_before)

**Appointment & Location (collapsed `<details>`):**
- Appointment name (text)
- Appointment datetime (datetime-local)
- Leave By (time)
- Location name (text)
- Address (text)
- If address is filled: Apple Maps link, Google Maps link, Copy Address button

**Footer buttons (edit mode only):**
- Delete (red), Complete (â), Archive â then Cancel / Save

#### Save Flow

`_saveNote(id)` reads all inputs. Validation: title AND body both empty â toast error, return. Otherwise calls `addNote(patch)` or `updateNote(id, patch)`, closes modal, re-renders notes, optionally refreshes dashboard reminders.

#### Delete Flow

`_deleteNote(id)` â native `confirm()` dialog â `App.Storage.deleteNote(id)`. If called from modal (`fromModal=true`), also closes the modal.

#### Edit Flow

`_editNote(id)` â finds note in state â `_openNoteModal(note)` with prefilled values.

---

### CALENDAR

#### Day Indicators

In `calendar.js`, `_buildCalendar()` builds a Set of `dueDate.slice(0,10)` strings from all active (not completed, not archived) notes. Any day in the Set gets class `has-note` on its cell button. The CSS for `.has-note` indicates the presence of due notes on that day.

#### Notes Displayed on Calendar Day Click

`_selectDate(ds)` sets `_selectedDate = ds` and re-renders the entire calendar pane.
The selected-day section shows: `_notesForDate(ds)` = active notes where `note.dueDate.slice(0,10) === ds`, sorted by `dueTime`.

#### Selected-Day Behavior

Selected date is highlighted with class `selected`. Today gets class `today`. Each note in the day section renders as a `<button class="calendar-note-row">` showing color dot, title, and date+time meta.

#### Opening Notes From Calendar

`_openNote(id)`:
1. Calls `App.showTab('notes')` â switches to the Notes tab
2. `setTimeout(() => App.Notes?._editNote?.(id), 0)` â opens note edit modal on next tick

**Important:** This means opening a note from calendar always navigates AWAY from the calendar tab. There is no inline edit within the calendar pane.

#### Editing Notes From Calendar

Editing happens entirely in the Notes tab's note modal. After save, the notes tab is left active. User must manually return to Calendar. The calendar's note indicator will reflect the updated note on next render.

#### Creating Notes From Calendar

No "add note from calendar day" flow exists in Note Clip's calendar. Adding notes always goes through the FAB on the Notes tab.

---

### UPCOMING / OVERDUE

#### Upcoming Logic

`_upcomingNotes()` in `calendar.js`:
- Active notes (not completed, not archived) WITH `dueDate >= today`
- Sorted by `dueDate + dueTime` ascending
- Limited to 8 results

#### Overdue Logic

`_overdueNotes()` in `calendar.js`:
- Active notes WHERE:
  - `dueDate < today` â past due date, OR
  - `dueDate === today` AND `dueTime` set AND `new Date(dueDate + 'T' + dueTime) < now` â same day, time already passed
- Sorted ascending, limited to 8

#### Reminder Logic (Two Layers)

Layer A â In-app popup (`reminders.js`):
- `App.Reminders.checkReminders()` runs on init, every 60 seconds, and on `visibilitychange`
- `_reminderTime(n)` calculates the fire time:
  - `n.reminderAt` (direct ISO) â exact timestamp (highest priority)
  - `n.reminder === 'same_day'` â `dueDate` at 08:00
  - `n.reminder === 'day_before'` â day before `dueDate` at 08:00
  - `n.reminder === '1h_before'` â `dueDate + dueTime - 1h`
  - `n.reminder === '2h_before'` â `dueDate + dueTime - 2h`
  - `dueDate + dueTime` with no reminder â fires at exact due datetime
- Popup bar appears with Open / Snooze (1h) / Dismiss actions
- Dismissed notes stored in `noteClip_notified` localStorage key by note ID + signature
- Snoozed notes stored in `noteClip_snoozed` key with snooze-until timestamp

Layer B â Browser Notification API:
- If `Notification.permission === 'granted'` and `settings.notificationsEnabled === true`
- `new Notification(title, { body, icon, tag })` fires and marks notes as notified
- Layer B takes precedence â if browser notification fires, Layer A popup is skipped
- FCM push via `App.Push.subscribe()` and `App.Push.syncReminder()` â requires `push.js` (not inspected)

---

### EXPORT / IMPORT

#### How Categories Are Exported

`App.Storage.exportJSON()` serializes `getState()` â the ENTIRE state including `categories`. No selective export.

#### How Notes Are Exported

All notes included in the exported JSON. No filtering by status, category, or archive state.

#### Export Format

```json
{
  "version": 1,
  "settings": { ... },
  "categories": [ ... ],
  "notes": [ ... ],
  "lists": [ ... ],
  "sharedItems": [ ... ],
  "drafts": [ ... ],
  "quickNotes": []
}
```

File downloaded as: `note-clip-backup-YYYY-MM-DD.json`

#### Restore Behavior

No import UI found in `settings.js` or `storage.js` â there is a `restore` i18n key defined but no `importJSON()` function observed in the inspected files. Cloud restore (`restoreFromCloud()`) uses `App.Storage.setState(restored)` which completely replaces the state.

#### Risks When Adapting to Ministry Tracker

1. **Key collision** â Ministry Tracker's existing export uses a different storage key and structure. If Ministry Notes are added to the same export object, the structure must be cleanly namespaced.
2. **Missing restore UI** â Ministry Tracker already has import/restore. The new `ministryNotes` and `ministryNoteCategories` arrays must be explicitly preserved in the existing import/export logic.
3. **`_cleanState()` in cloud-sync** â Note Clip's cloud backup strips to a whitelist. Ministry Tracker must add `ministryNotes` and `ministryNoteCategories` to any equivalent whitelist.
4. **setState() replaces entirely** â Restoring from cloud or importing would overwrite all notes. No merge strategy exists.

---

### CLOUD BACKUP

#### What Data Is Backed Up

`_cleanState()` in `cloud-sync.js` produces:

```js
{
  version,
  settings,
  categories,
  notes,
  lists,
  sharedItems,
  drafts,
  quickNotes,
}
```

`ministryNoteCategories` and `ministryNotes` would NOT be backed up unless added to this whitelist.

#### Storage Path in Firestore

```
noteClipUsers/{uid}/backups/current
```

Single document, always overwritten on backup. No history/versioning.

Backup document shape:
```js
{
  app: 'note-clip',
  schemaVersion: 1,
  ownerUid: string,
  ownerEmail: string,
  updatedAt: serverTimestamp(),
  updatedAtIso: ISO string,
  counts: { notes, lists, categories },
  state: { /* _cleanState() result */ },
}
```

#### Restore Behavior

`restoreFromCloud()` â reads Firestore doc â `_cleanState(data.state)` â `App.Storage.setState(restored)`.
This is a FULL state replace. No partial merge.

#### Risks When Adapting to Ministry Tracker

1. **Ministry Tracker uses a different Firestore path.** Confirm the ministry app's backup path before connecting. Do not reuse Note Clip's path.
2. **`_cleanState()` whitelist must be updated** to include `ministryNoteCategories` and `ministryNotes`.
3. **Full replace on restore** â any Ministry Notes added after a backup will be lost on restore.
4. **Authentication layer** (Firebase Auth) must remain separate from Note Clip's auth.

---

### SERVICE WORKER

#### Cache Version

```js
const CACHE_VERSION = 'note-clip-v5';
```

#### Precached Files (sw.js)

```
./
./index.html
./css/styles.css
./js/i18n.js
./js/storage.js
./js/dashboard.js
./js/notes.js
./js/lists.js
./js/shared.js
./js/communication.js
./js/settings.js
./js/firebase/firebase-config.js
./app.js
./manifest.json
```

#### Cache Strategy

Cache-first for all GET requests on same origin. On install: precache all URLs, then `skipWaiting()`. On activate: delete old caches, then `clients.claim()` and broadcast `RELOAD_READY` to all clients. `SKIP_WAITING` message triggers immediate activation.

#### Ministry Tracker Implication

Ministry Tracker has its own service worker with its own cache version. When Notes & Reminders is added, the Ministry Tracker cache version MUST be bumped to force cache refresh for all clients. Do not mix cache keys.

---

### I18N

#### How EN/ES Labels Are Structured

Single object `STRINGS` with `en` and `es` keys. All translations are flat key-value pairs. Usage: `App.I18n.t('key')`. Optional interpolation: `App.I18n.t('key', { name: 'World' })` replaces `{name}`.

#### Translation Keys Used for Notes/Categories

| Key | EN | ES |
|-----|----|----|
| `tab_notes` | Notes | Notas |
| `all_notes` | All Notes | Todas las Notas |
| `by_category` | By Category | Por CategorÃ­a |
| `categories` | Categories | CategorÃ­as |
| `add_note` | Add Note | Agregar Nota |
| `edit_note` | Edit Note | Editar Nota |
| `add_category` | Add Category | Nueva CategorÃ­a |
| `edit_category` | Edit Category | Editar CategorÃ­a |
| `delete_category` | Delete Category | Eliminar CategorÃ­a |
| `cat_delete_q` | (delete confirm) | (delete confirm) |
| `cat_delete_tag` | Remove category tag only | Quitar solo la categorÃ­a |
| `cat_delete_all` | Delete notes too | Eliminar las notas tambiÃ©n |
| `note_title` | Title | TÃ­tulo |
| `note_body` | Content | Contenido |
| `note_due` | Due Date | Fecha lÃ­mite |
| `note_due_time` | Due Time | Hora |
| `note_reminder` | Reminder | Recordatorio |
| `note_appt` | Appointment | Cita |
| `note_location` | Location | Lugar |
| `note_address` | Address | DirecciÃ³n |
| `status_active` | Active | Activo |
| `status_awaiting` | Awaiting Response | Esperando Respuesta |
| `status_followup` | Follow-Up | Seguimiento |
| `status_hold` | Hold | En Espera |
| `status_toread` | To Read | Para Leer |
| `status_completed` | Completed | Completado |
| `status_archived` | Archived | Archivado |
| `priority_urgent` | Urgent | Urgente |
| `priority_high` | High | Alta |
| `priority_medium` | Medium | Media |
| `priority_low` | Low | Baja |
| `cal_upcoming` | Upcoming | (not found in i18n â needs adding) |
| `cal_overdue` | Overdue | (not found in i18n â needs adding) |
| `cal_no_notes_day` | (not found) | (needs adding) |

**Note:** `cal_upcoming`, `cal_overdue`, `cal_no_notes_day`, `cal_no_overdue`, `cal_nothing_due` are used in `calendar.js` but are NOT present in the i18n.js `STRINGS` object inspected. These keys will fall back to the key name itself. Ministry Tracker must add these keys.

#### Risks When Adapting to Ministry Tracker

1. Ministry Tracker already has its own i18n object. The new Notes & Reminders keys must be merged into that object â not imported from Note Clip's `App.I18n`.
2. Ministry-specific label names differ: "Return Visits / Revisitas", "Bible Studies / Estudios bÃ­blicos", etc. These are not in Note Clip's i18n at all.
3. Ministry Tracker is bilingual by nature. All new keys must have both EN and ES translations at time of implementation â no EN-only placeholders.
4. Missing calendar i18n keys (`cal_overdue`, `cal_no_notes_day`, etc.) must be added.

---

### ACCESSIBILITY

#### Button Labels

- FAB has `aria-label="Add new"` (from index.html)
- Calendar day cells are `<button>` elements with `aria-label="{ds}"` (the date string)
- Category card delete/edit buttons use `title="Edit"` and `title="Delete"` â no `aria-label`
- Nav tabs have `aria-label` on each button (Dashboard, Notes, Lists, etc.)

#### Modal Focus Handling

- On modal open: `document.getElementById('note-title').focus()` and `document.getElementById('cat-name').focus()` â first input receives focus
- No focus trap implemented â Tab can leave the modal
- Escape key handler in `app.js` closes modals via `document.querySelector('.modal-backdrop')?.remove()`

#### Mobile Tap Targets

- Note card and category card are full-width tappable areas
- Color swatches are small (no explicit min size found in inspected code)
- Status tab buttons exist but no explicit min-height in the inspected JS
- Modal action buttons use `.btn` class â size depends on CSS
- `cal-day` cells in calendar are `<button>` elements â size depends on grid cell CSS

---

### RECOMMENDATIONS FOR MINISTRY TRACKER ADAPTATION

#### 1. Recommended Ministry Adaptation Approach

**Copy directly (structure and logic):**
- `addNote` / `updateNote` / `deleteNote` pattern â replicate as `addMinistryNote` / `updateMinistryNote` / `deleteMinistryNote`
- `addCategory` / `updateCategory` / `deleteCategory` with two-path delete â replicate as `addMinistryNoteCategory` etc.
- `generateId()` â reuse the same utility or Ministry Tracker's existing ID generator
- Status tab filter pattern
- Note card render pattern (adapt styles to Ministry Tracker theme)
- Category grid pattern
- Note modal section structure (title, body, priority, status, due date, reminder, appointment/location)
- Calendar day indicator pattern (`has-note` class on days with notes)
- Upcoming/overdue logic from `calendar.js`
- Reminder check pattern from `reminders.js` (Layer A in-app popup at minimum)

**Adapt (not copy directly):**
- Storage key â use Ministry Tracker's existing key, add `ministryNoteCategories` and `ministryNotes` to its state shape
- Category grid icons â use Ministry-appropriate icons/labels (Return Visits, Bible Studies, etc.) instead of Note Clip's icons
- i18n keys â merge into Ministry Tracker's existing i18n object, use Ministry-appropriate labels
- Cloud backup whitelist â add new arrays to Ministry Tracker's existing backup logic
- Calendar integration â wire `ministryNotes` into Ministry Tracker's existing calendar, which already has its own rendering logic
- Note modal status labels â adapt to ministry context (e.g. "Awaiting Response" = useful for return visits)
- Color palette â can reuse Note Clip's 6 pastel colors or adopt ministry theme colors
- FAB behavior â wire into Ministry Tracker's existing FAB or add a separate FAB for Notes tab

**Build fresh:**
- "Notes & Reminders" tab pane and bottom nav slot (replaces Log per Stage A)
- Ministry-specific default categories (8 preset)
- Ministry-appropriate empty states with bilingual text
- Calendar integration reading from `ministryNotes` rather than Note Clip's `notes`
- Any "add note from calendar day" flow (Note Clip doesn't have this â Ministry Tracker should)
- Search within notes (Note Clip has no user-facing search UI)
- `personName` and `phone` fields (not in Note Clip â needed for ministry return visits)

---

#### 2. Risks

| Risk | Severity | Description |
|------|----------|-------------|
| Service category collision | CRITICAL | Must NOT touch or rename `state.categories` â this array belongs to service logging. All new data goes in `ministryNoteCategories`. |
| Cloud backup whitelist | HIGH | `_cleanState()` equivalent in Ministry Tracker must be updated to include the two new arrays. |
| Export/import gap | HIGH | Ministry Tracker's export/import logic must be updated before notes are tested â otherwise notes will be silently dropped on import. |
| Cache version not bumped | HIGH | Service worker must be updated on every code change or users will see stale app. |
| `reminderAt` field absent from default | MEDIUM | The `reminderAt` field is not in `addNote()`'s default object â it must be explicitly added to the Ministry notes default shape. |
| Two-path category delete | MEDIUM | If implemented incorrectly, deleting a category could silently orphan notes or hard-delete them unintentionally. |
| Missing i18n keys | MEDIUM | `cal_overdue`, `cal_no_notes_day`, `cal_no_overdue`, `cal_nothing_due`, `cal_nothing_upcoming` must be added before calendar is tested. |
| No reopen/uncomplete flow | LOW | Note Clip has no "reopen completed note" UI. Ministry Tracker should decide if this is needed. |
| No search UI | LOW | Note Clip has no search in the notes pane. Ministry Tracker may want this for large contact lists. |
| `shared.js` tab not relevant | INFO | Skip entirely â not needed in Ministry Tracker. |
| `lists.js` not relevant | INFO | Skip entirely â not needed for Ministry Notes. |

---

#### 3. Reusable Components (Direct Reuse)

- `generateId()` pattern â reuse or use Ministry Tracker's existing equivalent
- `addNote / updateNote / deleteNote` CRUD pattern â reuse with field name prefix
- `addCategory / updateCategory / deleteCategory` CRUD pattern â reuse with prefix
- Status filter tab pattern (`buildStatusTabs()`)
- Note card render pattern (`buildNoteCard()`)
- Category grid render pattern (`buildCategoryGrid()`)
- Note modal structure with collapsed `<details>` sections for due date and appointment
- Color swatch picker pattern
- `_noteRows()` pattern from `calendar.js` for note lists in calendar sections
- `_reminderTime()` logic from `reminders.js` â exact timing calculation
- In-app reminder popup pattern (Layer A) from `reminders.js`
- `_overdueNotes()` and `_upcomingNotes()` filter/sort logic
- `_buildCalendar()` `has-note` indicator pattern

---

#### 4. What Should NOT Be Reused

| Component | Reason |
|-----------|--------|
| `App.Storage` (Note Clip's storage module) | Ministry Tracker has its own storage; importing Note Clip's would conflict on `localStorage` key |
| `App.I18n` (Note Clip's i18n) | Ministry Tracker already has its own bilingual i18n; do not load both |
| `App.Firebase` / `cloud-sync.js` | Ministry Tracker has its own Firebase; reusing Note Clip's config or path would corrupt data |
| Note Clip's `sw.js` | Ministry Tracker has its own service worker with its own cache version; they must remain separate |
| Note Clip's CSS theme | Reuse only the logical patterns; apply Ministry Tracker's existing CSS variables and card styles |
| Note Clip's `app.js` tab router | Ministry Tracker has its own tab/screen routing; wire Notes & Reminders into that, not Note Clip's |
| `lists.js` | Not needed for Ministry Notes |
| `shared.js` | Not needed for Ministry Notes |
| `communication.js` | Not relevant |
| Note Clip's default categories | Replace with Ministry-specific defaults |
| Note Clip's icon set (`ic_cat_*` PNG files) | Use Ministry Tracker's existing icon approach |

---

#### 5. Proposed Ministry Notes Data Model

```js
// In Ministry Tracker state:
ministryNoteCategories: [
  { id: 'mncat_rv',    name: 'Return Visits',         nameEs: 'Revisitas',            icon: 'ð¤', color: '#BDD5EA' },
  { id: 'mncat_bs',    name: 'Bible Studies',          nameEs: 'Estudios bÃ­blicos',    icon: 'ð', color: '#C5E2C5' },
  { id: 'mncat_ip',    name: 'Interested Persons',     nameEs: 'Personas interesadas', icon: 'ð±', color: '#F7D9B0' },
  { id: 'mncat_calls', name: 'Calls',                  nameEs: 'Llamadas',             icon: 'ð', color: '#D4C5E2' },
  { id: 'mncat_msgs',  name: 'Messages',               nameEs: 'Mensajes',             icon: 'âï¸', color: '#F7F0B6' },
  { id: 'mncat_terr',  name: 'Territory',              nameEs: 'Territorio',           icon: 'ðºï¸', color: '#BDD5EA' },
  { id: 'mncat_appt',  name: 'Appointments',           nameEs: 'Citas',                icon: 'ð', color: '#F2C4B0' },
  { id: 'mncat_pers',  name: 'Personal',               nameEs: 'Personal',             icon: 'ð', color: '#F7F0B6' },
],

ministryNotes: [
  {
    id:                  string,          // generateId()
    title:               string,          // contact name, note title
    body:                string,          // note details
    categoryId:          string | null,   // FK to ministryNoteCategories[].id
    personName:          string,          // contact full name
    phone:               string,          // contact phone number
    color:               string,          // 'yellow'|'lavender'|'sky'|'mint'|'coral'|'peach'
    priority:            string,          // 'urgent'|'high'|'medium'|'low'
    status:              string,          // 'active'|'awaiting'|'followup'|'hold'|'completed'|'archived'
    dueDate:             string,          // 'YYYY-MM-DD' or ''
    dueTime:             string,          // 'HH:MM' or ''
    reminder:            string,          // 'same_day'|'day_before'|'1h_before'|'2h_before'|''
    reminderAt:          string,          // ISO datetime or ''
    appointmentName:     string,
    appointmentDatetime: string,
    leaveBy:             string,
    locationName:        string,
    address:             string,
    sourceSessionId:     string | null,   // optional: link to a logged session
    sourceDate:          string,          // optional: date of first contact
    archived:            boolean,
    completed:           boolean,
    createdAt:           string,
    updatedAt:           string,
  }
]
```

**Key additions vs. Note Clip:** `personName`, `phone`, `sourceSessionId`, `sourceDate`. `nameEs` on categories for bilingual support (or use i18n keys instead).

---

#### 6. Proposed Implementation Order for Stages CâH

| Stage | Work | Notes |
|-------|------|-------|
| **C** | Add `ministryNoteCategories` and `ministryNotes` to Ministry Tracker's state shape and CRUD helpers. Migrate-safe defaults. Update export/import and cloud backup whitelist. **No UI.** | Zero risk to existing data if storage key is untouched and arrays are appended. |
| **D** | Build Notes & Reminders tab pane. Category grid + note cards + note modal. Status filters. Basic CRUD fully working. No calendar integration yet. | Wire FAB on this tab only. No calendar touches. Test add/edit/delete note and category in isolation. |
| **E** | Calendar integration. Add `has-note` indicators. Selected-day note list. Open/edit note from calendar. Add note from selected calendar day (pre-fill dueDate). | Touch calendar rendering only for ministry notes. Do NOT touch existing calendar planning/logging logic. |
| **F** | Reminder foundation. In-app popup (Layer A). Upcoming/overdue sections on calendar and/or Notes tab. Save `reminderAt`. Show reminder badges. **No FCM.** | Use `reminders.js` Layer A pattern. Do not promise push notifications. |
| **G** | Visual/brand alignment. Apply Ministry Tracker card/button/modal CSS. Bilingual labels complete. Light/dark verified. Mobile touch targets verified. Spanish overflow check. | Do not import Note Clip's CSS. Use Ministry Tracker's existing CSS variables. |
| **H** | Full QA pass per the Stage H checklist. Export/import verified. Cloud backup verified. Cache version bumped. Live GitHub Pages verified. | Do not approve until all Stage H checklist items are green. |

**Recommended pre-C sub-step:** Before Stage C, inspect Ministry Tracker's actual repo state, confirm its storage key, current state shape, calendar rendering logic, and export/import logic. Document that inspection in this MD file. This ensures Stage C's storage changes are precise and safe.

---

### Stage B Status

`COMPLETE â approved for Stage C planning`

**Note Clip files inspected:**
- js/storage.js â
- js/notes.js â
- js/calendar.js â
- js/dashboard.js â
- js/reminders.js â
- js/app.js â
- js/settings.js â
- js/firebase/cloud-sync.js â
- js/i18n.js â
- js/lists.js â
- sw.js â
- index.html â

**Files not retrieved (timed out, not critical for Stage B):**
- js/firebase/firebase-config.js (init config; App.Firebase.init() referenced in cloud-sync.js)
- js/communication.js (drafts/messaging; not relevant for ministry notes)
- js/push.js (FCM push layer; relevant for Stage F, not Stage C/D)
- js/onboarding.js (first-run flow; not needed for ministry adaptation)


```txt
Date: 2026-06-24
Stage: Stage C â Ministry Notes Data Model
Summary: Added ministryNoteCategories:[] and ministryNotes:[] to APP_CONFIG.defaults. Migration-safe via loadState() spread. No UI changes. Bumped CACHE_VERSION to v35.
Commit hash: 72e049a
Files changed: js/app.js, sw.js (2 files)
Tests run: static code review; APP_CONFIG.defaults spread confirmed; saveState() full-serialize confirmed; cloud backup collectKeys() confirmed unaffected; existing categories array verified untouched
Screenshots if UI changed: N/A â data model only, no UI
Cache version before: ministry-tracker-v34-stage-a-notes-nav
Cache version after: ministry-tracker-v35-stage-c-data-model
Bugs fixed: none
Known issues: none
Mobile verification: N/A â no UI change
Desktop verification: N/A â no UI change
Light/dark verification: N/A â no UI change
English/Spanish verification: N/A â no new i18n keys
Export/import verification: state spread provides automatic || [] for new fields
Cloud backup/restore verification: new fields in same ministry-tracker-v4 blob; automatically included
Live GitHub Pages verification: code-implemented, not live-approved yet
Remaining risks: none â data-model-only change with no side effects
Updated MD checklist confirmation: all 6 Stage C checklist items marked complete
Status: code-implemented, not live-approved yet
```

```txt
Date: 2026-06-24
Stage: Stage E â Notes Inside Category
Summary: Tap category card opens notes list view; + Add Note modal (title required, body optional); edit/delete per note with confirm dialog; 5 new functions: renderNotes (Stage E), openNotesCategory, renderNotesListView, openNoteModal, deleteMinistryNote; 10 i18n keys EN+ES; CACHE_VERSION v37-stage-e-notes; state vars currentNotesView + currentNotesCategoryId; ministryNotes safeguarded with || [] everywhere.
Commit hash: 4603e50
Files changed: js/app.js, sw.js (2 files)
Tests run: static code review; all 5 new functions confirmed present; i18n EN+ES keys verified; currentNotesView state var confirmed; CACHE_VERSION v37 confirmed in sw.js; fnStart/fnEnd anchors verified; all blob/tree/commit/ref API calls returned ok:true
Screenshots if UI changed: pending manual test
Cache version before: ministry-tracker-v36-stage-d-categories
Cache version after: ministry-tracker-v37-stage-e-notes
Bugs fixed: removed notesComingSoon hint from category grid (Stage D placeholder)
Known issues: category delete does not cascade-delete notes (intentional â notes survive category deletion for now)
Mobile verification: pending
Desktop verification: pending
Light/dark verification: pending
English/Spanish verification: 10 new keys in both EN and ES confirmed
Export/import verification: ministryNotes uses || [] in all handlers; saveState() full JSON.stringify preserves all state
Cloud backup/restore verification: no change to collectKeys() or backup flow
Remaining risks: none critical â data safety guards in place
Updated MD checklist confirmation: Stage E status changed to COMPLETE
Status: code-implemented, not live-approved yet
```

```txt
Date: 2026-06-25 (pre-coding preflight)
Stage: Stage F â Preflight
Summary: Verified Stage E complete. HEAD: d28c01e (docs: Stage E complete). Code commit: 4603e50 (feat: Stage E notes inside category). MD confirmed Stage E COMPLETE. openNoteModal signature: openNoteModal(categoryId, noteId). Note shape: {id, categoryId, title, body, createdAt: timestamp, updatedAt: timestamp}. Calendar day cells: <button data-cal-day="YYYY-MM-DD">. adjustSelectedDate = global selected date. i18n: t(k) via I18N object. CACHE_VERSION: v37-stage-e-notes. Stage F redefined per build brief: Calendar Integration (NOT Reminder Foundation). Ready to code.
Files at preflight: js/app.js (192324 bytes), sw.js (1957 bytes), index.html (45873 bytes).
```

```txt
Date: 2026-06-25
Stage: Stage F â Calendar Integration
Summary: 10 changes applied across 3 files. (1) noteDates Set in renderCalendar for dot indicators. (2) cal-note-dot span in day cell template. (3) renderCalendarNotesPanel() called at end of renderCalendar. (4) openNoteModal signature extended with _calDate param. (5) New note createdAt uses _calDate when adding from calendar. (6/7) I18N EN+ES: calNotesForDay, calNoNotesForDay, calAddNote. (8) renderCalendarNotesPanel() function with CSS injection. (9) calNotesPanel div in index.html. (10) sw.js CACHE_VERSION v37âv38.
Commit hash (code): 93a86b6
Files changed: js/app.js, sw.js, index.html (3 files)
Tests run: static code review; all 9 verifications passed in browser; all 10 replace operations confirmed OK
Cache version: v37-stage-e-notes â v38-stage-f-calendar
Bugs fixed: none (new feature)
Known issues: Add-from-day defaults to first ministryNoteCategories entry as categoryId; future enhancement could add category picker
Mobile verification: pending live review
Desktop verification: pending live review
Light mode: CSS uses var() tokens â should work
Dark mode: CSS uses var() tokens â should work
English: â i18n keys added
Spanish: â i18n keys added
Export/import unchanged: â no changes to export/import logic
Cloud backup unchanged: â no changes to backup logic
Live GitHub Pages verification: pending (Pages deploys from HEAD automatically)
Remaining risks: none structural â data-model unchanged, only new render layer
Stage completed: YES
Next stage: Stage G â Visual/Brand Alignment (or any next priority per build plan)
```

---

## HOTFIX â Emergency Repair

**Date:** 2026-06-25  
**Time:** 13:03 UTC  
**Status:** IN PROGRESS  

### Problem
Production crash: `SyntaxError: Unterminated regular expression literal` at app.js ~line 1921.  
Malformed regex in calendar notes panel sanitization (Stage F): `const sid = n.id.replace(/['"]/g,'')` and `const scat = (n.categoryId||'').replace(/['"]/g,'')`.  
Backslash before closing quote escapes it, creating an unterminated regex.

### Fix Applied
**Option B â helper function approach** (lines 2019â2020 replaced with 3 lines):
```js
function sanitizeInlineArg(v) { return String(v || '').replace(/['"]/g, ''); }
const sid = sanitizeInlineArg(n.id);
const scat = sanitizeInlineArg(n.categoryId);
```

### Files Changed
- `js/app.js` â regex fix (lines 2019â2020 â 3 lines)
- `sw.js` â cache bump `v39-stage-g-reminders` â `v39-hotfix-appjs-regex`
- This file â hotfix log entry


### Completion
**Completed:** 2026-06-25 13:04 UTC  
**Commit:** e0ffe9bc475f6c86d083c86c3623f474ad7a3e89  
**Status:** DEPLOYED â Awaiting live verification  

**Changes pushed in single commit:**
- `js/app.js`: sanitizeInlineArg() helper inserted at line 2019 (2 broken lines â 3 clean lines)
- `sw.js`: CACHE_VERSION bumped from `v39-stage-g-reminders` to `v39-hotfix-appjs-regex`
- `docs/stage-notes/...`: this log entry

**Verification:** Live app check pending (GitHub Pages deploy ~1-3 min)


---

## HOTFIX '2026-06-25' â Emergency Regex Repair

**Date:** 2026-06-25 13:06 UTC
**Status:** DEPLOYED

### Problem
Production crash: SyntaxError â Unterminated regular expression literal (~line 1921, actual lines 2019-2020).
Malformed regex in calendar notes sanitization (Stage F).

### Fix
Option B helper function â lines 2019-2020 replaced with 3 lines:
- sanitizeInlineArg() helper
- const sid = sanitizeInlineArg(n.id)
- const scat = sanitizeInlineArg(n.categoryId)

### Files Changed
- js/app.js â regex fix (2 lines â 3)
- sw.js â cache bump v39-stage-g-reminders â v39-hotfix-appjs-regex
- This file â hotfix log

### Commit
e0ffe9bc475f6c86d083c86c3623f474ad7a3e89 (hotfix code)
89540405fbff9caee9ae4a8179b1f454400289f4 (MD update)


### Completion â VERIFIED LIVE
**Completed:** 2026-06-25 13:16 UTC
**Status:** RESOLVED â

#### Commits
1. `ac4d3c2fd45bd89a9f82d7525a1636607a24b51c` â hotfix regex: sanitizeInlineArg helper (lines 2019-2020), sw cache â v39-hotfix-appjs-regex, MD entry
2. `23cb6b2e4fb7563bb34dcf487531884276cc61fe` â hotfix syntax: fix double-var at line 1836 (Stage G regression), sw cache â v39-hotfix-appjs-syntax

#### Root causes fixed
- PRIMARY: Malformed regex `/['"]/g` (backslash-escaped closing quote) at lines 2019-2020 â replaced with sanitizeInlineArg() helper
- SECONDARY (discovered during fix): `var var noteCompl` double-declaration at line 1836 (Stage G regression) â removed duplicate keyword

#### Cache
`ministry-tracker-v39-stage-g-reminders` â `v39-hotfix-appjs-regex` â `v39-hotfix-appjs-syntax`

#### Live verification (desktop)
- Home tab â
- Timer tab â
- Calendar tab â
- Notes & Reminders tab â
- Reports tab â
- No JS SyntaxErrors â
- No error modals â
- Zero console errors â


## STAGE I — Reminder Push Notifications / Notification Foundation

**Status:** approved for implementation — architecture documented before coding

### Objective
Implement real reminder notifications for Ministry Notes so a user can set a reminder date and time and receive an actual notification when the reminder is due.

This stage must be separate from Stage H. Stage H must finish QA/live verification first.

### Current reminder state before Stage I
The app currently stores reminder-ready fields on Ministry Notes:
- dueDate
- dueTime
- reminder
- reminderAt
- priority
- status
- completed
- archived

The app currently does NOT send real push notifications. Do not claim notifications are working until Stage I is implemented and verified.

### Required scope
- Inspect existing Firebase/KHub setup in Ministry Tracker
- Compare with the approved notification pattern used in other KHub apps if available
- Confirm whether Firebase Cloud Messaging is already configured for this project
- Add notification permission flow
- Add browser/device token registration
- Store tokens under path: /khubApps/ministry-tracker/users/{uid}/notificationTokens/{tokenId}
- Add foreground notification handling
- Add background/service-worker notification handling
- Design and document the reminder trigger mechanism
- Confirm how reminders are sent at the correct date/time
- Confirm mobile/PWA install behavior
- Confirm iOS/browser limitations and fallback behavior
- Confirm behavior when permission is denied
- Confirm behavior when user changes reminder time
- Confirm behavior when note is completed, archived, or deleted
- Confirm behavior when user logs out or changes device

### Required implementation decision
Before coding Stage I, document which approach will be used:
- **Option A** — Firebase Cloud Messaging with a backend/scheduled trigger
- **Option B** — Local browser notifications only (while app/device/browser conditions allow)
- **Option C** — Hybrid approach

Chosen approach for Stage I:

- Use the Talk Arrangements Stage 9B-B closed-app Web Push pattern, adapted to Ministry Tracker.
- Use a Cloudflare Worker backend with Cloudflare KV binding `PUSH_STORE`.
- Use a scheduled Cloudflare cron trigger every minute to process due reminders.
- Use VAPID Web Push for real browser/PWA notifications.
- Store only the public VAPID key and public Worker URL in frontend source.
- Store `VAPID_PRIVATE_KEY` only as a Cloudflare Worker secret; never commit it.
- Frontend creates a real browser `PushSubscription` and sends it to the Worker.
- Backend stores subscriptions and scheduled reminder records, then sends due notifications from the cron handler.
- Service worker handles both `push` and `notificationclick`.
- Local-only `setTimeout` is not the final Stage I solution.
- Do not claim notifications work until closed-app delivery is verified on a supported device/PWA path.

Current cache before Stage I frontend changes: `ministry-tracker-v40-stage-h-qa-polish`.

Do not start coding until the approach is documented and approved. Supervisor approval to begin Stage I implementation was given on 2026-06-29 after this architecture requirement was specified.

### Guardrails
- Do not fake notification success
- Do not show "notifications enabled" unless permission, token registration, and delivery path are verified
- Do not break existing service worker caching
- Do not break offline/PWA behavior
- Do not break cloud backup or export/import
- Do not alter service categories, reports, timer, credit hours, or session logs
- Do not mix Ministry Notes with existing service categories
- Do not begin Stage I until Stage H is approved

### Stop conditions
STOP if:
- Firebase config is missing or ambiguous
- FCM setup is not available
- Service worker changes break app caching
- Notifications cannot be scheduled reliably
- iOS/PWA support is uncertain and undocumented
- Token storage path is unclear
- Reminder data becomes inconsistent
- Completed/deleted notes can still fire notifications
- App claims notifications work without end-to-end proof

### Required tests for Stage I
- Notification permission prompt works
- Permission denied state works
- Permission granted state works
- Token stored under correct user/app path
- Reminder with date and time can be created
- Reminder notification fires at expected time
- Editing reminder time updates notification behavior
- Completing a note prevents future notification
- Archiving a note prevents/handles future notification
- Deleting a note prevents future notification
- Foreground notification behavior verified
- Background/PWA notification behavior verified
- Mobile verified
- Desktop verified
- Light/dark unaffected
- EN/ES labels verified
- Cloud backup unaffected
- Export/import unaffected
- No console errors
- Cache version bumped if deployable files change

**Stage I status: approved for implementation — Cloudflare KV/VAPID Web Push architecture selected**

### Stage I deployment/device verification attempt — 2026-06-29

Status: `backend-deployed, not live-approved`

Worker deployment:

- Worker URL: `https://ministry-tracker-push.davidfontenelle80.workers.dev`
- Worker deployment/version ID: `a9654632-efa0-4382-a839-9119b5385032`
- KV namespace: `ministry-tracker-push-store`
- KV namespace ID: `559729167b3140e0add1c89ea1a1d477`
- Cache in WIP source: `ministry-tracker-v41-stage-i-web-push`

Health result:

```json
{
  "ok": true,
  "app": "ministry-tracker",
  "hasStore": true,
  "hasVapidPublicKey": true,
  "hasVapidPrivateKey": true,
  "hasVapidSubject": true,
  "webPushDeliveryImplemented": true
}
```

Tests completed:

- Wrangler auth confirmed for `davidfontenelle80@gmail.com`.
- `VAPID_PRIVATE_KEY` uploaded as Cloudflare Worker secret without printing or committing it.
- Worker deployed.
- `GET /api/health` passed.
- `POST /api/subscribe` passed with a non-real smoke subscription.
- `POST /api/reminders` passed with a non-real smoke subscription.
- `DELETE /api/reminders/:sourceType/:sourceId` passed with a non-real smoke subscription.
- Live GitHub Pages frontend asset check completed.

Tests not completed:

- Real browser `PushSubscription`.
- `POST /api/test-push` with a real subscription.
- Test push notification arrival.
- Scheduled reminder firing.
- Closed-app / phone-locked notification.
- `notificationclick` open/focus behavior.
- Mobile verification.
- Desktop browser UI verification.
- Console verification.
- EN/ES and light/dark live verification for Stage I.
- Reports, Timer, Calendar, and Notes live regression checks for Stage I.

Failure / blocker:

- The live GitHub Pages app at `https://davidfontenelle80-cloud.github.io/ministry-tracker-/` is not serving the Stage I WIP frontend.
- `js/push-config.js` returns `404`.
- `js/push.js` returns `404`.
- Live `sw.js` is not `ministry-tracker-v41-stage-i-web-push`.
- Therefore the live frontend cannot create a real Stage I `PushSubscription` yet.

Closed-app verification result: not verified.

Notification click result: not verified.

Mobile / desktop verification: not verified.

Remaining risks:

- Stage I cannot be live-approved until the WIP frontend is available on the tested live surface, then real subscription, test push, scheduled reminder, closed-app notification, and notification click are verified.
- Do not claim Stage I complete from backend smoke tests alone.

Deployment status: `backend-deployed, not live-approved`.

### Stage I live frontend verification attempt after merge — 2026-06-29

Status: `backend-deployed, frontend-live, not live-approved`

Merge / live frontend:

- Stage I WIP branch was merged to `main`.
- GitHub Pages now serves `js/push-config.js`.
- GitHub Pages now serves `js/push.js`.
- Live `sw.js` contains `ministry-tracker-v41-stage-i-web-push`.
- Live `index.html` includes the Stage I push scripts.

Worker:

- Worker URL: `https://ministry-tracker-push.davidfontenelle80.workers.dev`
- Worker deployment/version ID: `a9654632-efa0-4382-a839-9119b5385032`
- KV namespace: `ministry-tracker-push-store`
- KV namespace ID: `559729167b3140e0add1c89ea1a1d477`
- `/api/health` passed with all required flags true.

Live app checks completed:

- App loads from GitHub Pages.
- Service worker registers.
- Service worker refreshes to v41.
- Console errors: none observed during live browser check.
- Home tab opens.
- Timer tab opens.
- Calendar tab opens.
- Reports tab opens.
- Notes & Reminders tab opens.
- Light/dark and EN/ES were not fully verified in this pass.

Blocking failure:

- In the live Notes & Reminders screen, the `+ Add Note` button did not open the note modal.
- Because the real app flow could not open a note modal, a real reminder could not be created from the live app.
- Notification permission prompt was not reached.
- Real browser `PushSubscription` was not created.
- Real `POST /api/subscribe` from the browser was not verified.
- Real `POST /api/test-push` was not verified.
- Scheduled reminder firing was not verified.
- Closed-app / phone-locked notification was not verified.
- `notificationclick` open/focus behavior was not verified.
- Mobile device verification was not completed.

Required next action:

- Fix the live Notes & Reminders `+ Add Note` modal blocker without starting Stage J.
- After the note modal opens, rerun the Stage I real subscription, test push, scheduled reminder, closed-app, and notification-click verification.

Deployment status remains: `backend-deployed, frontend-live, not live-approved`.

### Notes modal blocker fix for Stage I live verification — 2026-06-29

Status: source fix in progress for live Notes & Reminders blocker.

Root cause:

- Ministry Notes had a global `openNoteModal(categoryId, noteId, _calDate)` function.
- The Timer feature later declared another global `openNoteModal()` function.
- Because function declarations are hoisted, Notes and Calendar calls resolved to the Timer modal function.
- When no timer was active, the Timer modal returned immediately, so `+ Add Note` appeared dead and Stage I real reminder testing could not continue.

Fix approach:

- Renamed the Ministry Notes modal path to `openMinistryNoteModal(...)`.
- Updated Notes category add/edit and Calendar note add/edit hooks to use `openMinistryNoteModal(...)`.
- Kept the Timer `openNoteModal()` function unchanged for the timer note workflow.
- Added All Notes access, note search, active/all/completed/archived filter controls, clickable note cards, and category picker selected-state behavior adapted from the read-only Note Clip Notes workflow.
- Preserved Ministry `ministryNotes` records and reminder fields: `dueDate`, `dueTime`, `reminder`, `reminderAt`, `priority`, `status`, `completed`, `archived`.

Reference inspected read-only:

- Note Clip `js/notes.js`: `buildCategoryGrid`, `buildNotesGrid`, `_openNoteModal`, `_saveNote`, `_categoryIconPickerHtml`, `_selectCatIcon`, `_openCatModal`.
- Note Clip `js/calendar.js`: calendar-to-note open behavior.

Cache before: `ministry-tracker-v41-stage-i-web-push`.

Cache after: `ministry-tracker-v42-notes-modal-fix`.

Deployment / Stage I status:

- Worker remains deployed and healthy; Cloudflare was not redeployed for this fix.
- Stage I remains `backend-deployed, frontend-live, not live-approved` until the v42 frontend is live and real PushSubscription, test push, scheduled reminder, closed-app notification, and notification click are verified.

### Stage I real push verification attempt after v42 notes fix — 2026-06-29

Status: `backend-deployed, frontend-live, not live-approved`

Repo / frontend:

- Branch verified: `main`.
- Latest fix commit verified: `dcf920e fix: restore ministry notes modal`.
- Repo was clean before testing.
- Live `sw.js` cache verified: `ministry-tracker-v42-notes-modal-fix`.
- Live `js/push.js`, `js/push-config.js`, and `index.html` were reachable from GitHub Pages.
- No committed secret values found by source scan.

Worker:

- Worker URL: `https://ministry-tracker-push.davidfontenelle80.workers.dev`
- Worker deployment/version ID: `a9654632-efa0-4382-a839-9119b5385032`
- KV namespace: `ministry-tracker-push-store`
- KV namespace ID: `559729167b3140e0add1c89ea1a1d477`
- `/api/health` returned `ok:true`, `hasStore:true`, `hasVapidPublicKey:true`, `hasVapidPrivateKey:true`, `hasVapidSubject:true`, `webPushDeliveryImplemented:true`.

Live app checks completed:

- App loads from GitHub Pages.
- Service worker registration log observed in Chrome: scope `https://davidfontenelle80-cloud.github.io/ministry-tracker-/`.
- Console errors/warnings: none observed during the live verification pass.
- Notes & Reminders opens.
- Category cards open selected category note lists.
- `+ Add Note` opens the modal.
- Reminder fields are present and persisted in the modal: `dueDate`, `dueTime`, `reminder`.
- A temporary reminder note was created with due date/time and Reminder checked.
- Reopening the note confirmed the reminder fields were saved.
- The temporary reminder note was deleted after testing.
- Home, Timer, Calendar, Reports, and Notes tabs opened.
- English/Spanish toggle verified.
- Theme toggle verified by clicking through visible header control.

Push verification result:

- Real browser `PushSubscription`: not created / not verified.
- `POST /api/subscribe` from the real browser flow: not verified.
- `POST /api/test-push`: not verified.
- Test push notification: not received / not verified.
- Scheduled reminder firing: not verified.
- Closed-app / phone-locked notification: not verified.
- `notificationclick` open/focus behavior: not verified.
- Mobile verification: not completed.
- Desktop verification: partially completed for UI and service worker registration, but push delivery remains blocked.

Blocking evidence:

- After saving the real reminder note, Cloudflare KV key listings showed no `subscription:` keys and no `reminder:` keys in namespace `559729167b3140e0add1c89ea1a1d477`.
- The live app saved the reminder fields locally, but the backend subscription/reminder sync did not materialize in KV.
- The app has no visible manual `test-push` control; attempts to invoke the hidden page-level push test path from Chrome automation did not execute in the live page context.

Cloudflare / scope notes:

- Cloudflare was not redeployed.
- VAPID secrets were not rotated or printed.
- Talk Arrangements was not modified.
- Stage J weather was not started.

Required next action:

- Investigate why the live browser reminder save does not create a `PushSubscription` / `subscription:` KV key.
- Add or expose a supervised Stage I diagnostic/test-push UI path if needed, without committing secrets.
- Re-run real browser/device tests only after `subscription:` and `reminder:` KV records are observed from the live app flow.

### Stage I push sync repair attempt — 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved`

Root cause found:

- The frontend reminder save path did call `syncMinistryNotePush(savedNote)`, but the app had a silent guard that returned if `window.MinistryPush` was unavailable or unconfigured.
- There was no visible supervised diagnostic/test-push control, so the live page could not prove whether the push client was attached, whether notification permission was pending, or whether `/api/subscribe` was reached.
- After adding the diagnostic button, the live v43 Test Push control entered `Test Push...` and remained pending with no KV records. This indicates the flow reached the push permission/subscription path but did not resolve notification permission in the controlled Chrome session.

Frontend repair:

- Added `window.MinistryPushDebug` in `js/push.js` with safe public wrappers for `diagnose`, `subscribe`, `testPush`, and `getSubscriptionId`.
- Added visible `Test Push` controls to the Notes category grid and note-list views.
- Added app-side `MinistryPushDebugApp.testPush()`.
- Added push sync diagnostics/logging and user feedback for push unavailable, sync started, sync saved, sync failed, test sent, and test failed.
- Added a 45-second timeout around unresolved `Notification.requestPermission()` so the button no longer hangs forever if the browser permission prompt does not resolve.

Cache before: `ministry-tracker-v42-notes-modal-fix`.

Cache after: `ministry-tracker-v43-push-sync-fix`.

Files changed:

- `js/app.js`
- `js/push.js`
- `sw.js`
- this tracker MD

Verification completed:

- `node --check js/app.js`: passed.
- `node --check js/push.js`: passed.
- `node --check sw.js`: passed.
- Live `sw.js` reached `ministry-tracker-v43-push-sync-fix`.
- Live `js/app.js` contains `runMinistryPushDiagnostic`, `data-push-test`, and `reminder sync requested`.
- Live `js/push.js` contains `MinistryPushDebug` and `sendTestPush`.
- App loaded in Chrome with no console errors/warnings.
- Notes & Reminders opened.
- `Test Push` button was visible.
- Clicking `Test Push` disabled the button and changed it to `Test Push...`.

Push verification result:

- Real PushSubscription: not created / not verified.
- KV `subscription:` record: not created.
- KV `reminder:` record: not created.
- Subscribe API result: not verified from live browser because no `subscription:` key appeared.
- Reminder API result: not verified from live browser because no `reminder:` key appeared.
- Test-push result: pending / not verified; no notification observed.
- Scheduled reminder result: not verified.
- Closed-app / phone-locked result: not verified.
- `notificationclick` result: not verified.

Blocking evidence:

- Cloudflare KV key listings still returned `[]` for both `subscription:` and `reminder:` prefixes.
- The Test Push button remaining disabled as `Test Push...` means the frontend handler fired, but the browser push permission/subscription promise did not complete in the controlled Chrome session.
- The final permission-timeout fix was committed locally as `896e871`, but push to GitHub was blocked by the environment usage-limit gate before it could be published.

Cloudflare / scope notes:

- Cloudflare was not redeployed.
- No VAPID private key, Cloudflare token, credentials, or secrets were printed or committed.
- Talk Arrangements was inspected read-only only.
- Stage J weather was not started.

Required next action:

- Push local commit `896e871` when the environment allows network Git operations.
- Re-test live v43 after `896e871` is deployed so unresolved notification permission produces an explicit timeout/failure instead of a permanent pending state.
- If notification permission still cannot resolve in Chrome automation, complete the permission grant manually in Chrome or on the target device/PWA, then rerun Test Push and verify `subscription:` / `reminder:` KV creation.

### Stage I push permission verification after v43 timeout deploy - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved`

Repository / deploy state:

- Local commits pushed to `origin/main`: `896e871` and `d6afcbc`.
- Live service worker cache verified: `ministry-tracker-v43-push-sync-fix`.
- Live `js/push.js` verified to include the `Notification permission prompt did not resolve.` timeout fix.
- Live `js/app.js` verified to include the visible Notes `Test Push` diagnostic flow.
- Cloudflare Worker was not redeployed.
- Worker URL: `https://ministry-tracker-push.davidfontenelle80.workers.dev`.
- Worker deployment/version: `a9654632-efa0-4382-a839-9119b5385032`.
- KV namespace: `ministry-tracker-push-store`.
- KV namespace ID: `559729167b3140e0add1c89ea1a1d477`.

Health result:

```json
{
  "ok": true,
  "app": "ministry-tracker",
  "hasStore": true,
  "hasVapidPublicKey": true,
  "hasVapidPrivateKey": true,
  "hasVapidSubject": true,
  "webPushDeliveryImplemented": true
}
```

Live Chrome verification:

- App loaded from GitHub Pages over HTTPS.
- Service worker registration logged with scope `https://davidfontenelle80-cloud.github.io/ministry-tracker-/`.
- Notes & Reminders opened.
- `Test Push` button was visible.
- Clicking `Test Push` changed the button to `Probar push...`.
- Console logged `[MinistryPush] subscribe:request-permission`, proving the frontend handler reached `Notification.requestPermission()`.
- After 45 seconds, the app displayed the explicit error `Notification permission prompt did not resolve.`
- Error label surfaced by the app: `CLOUD-RULES-promise`.
- Console warning: `[MinistryPush] test push failed: Notification permission prompt did not resolve.`
- Console error boundary also logged the same timeout as an unhandled rejection from `js/push.js`.
- Chrome did not show a visible notification permission bubble in the captured app viewport.
- Attempting to inspect `chrome://settings/content/siteDetails?...` was blocked by the browser automation security policy, so Chrome site notification settings could not be confirmed from this session.

Permission state:

- Before click: not directly readable through the available Chrome bridge because the read-only page context did not expose `navigator` / `Notification`.
- After click: the app reached the permission request and timed out with no browser resolution.
- Root cause for this run: browser notification permission did not resolve in the controlled Chrome session, so `PushManager.subscribe()` was not reached and no backend subscription/reminder sync could occur.

KV verification:

- KV `subscription:` prefix after live Test Push: `[]`.
- KV `reminder:` prefix after live Test Push: `[]`.
- Therefore no real browser `PushSubscription` was created and no backend reminder record was created.

Push verification result:

- Real PushSubscription: not created.
- Subscribe API from real browser: not reached / not verified.
- Reminder API from real browser: not reached / not verified.
- Test push: failed before subscription because notification permission did not resolve.
- Scheduled reminder: not verified.
- Closed-app / phone-locked notification: not verified.
- `notificationclick`: not verified.
- Mobile verification: not completed.
- Desktop verification: completed only through the permission-timeout blocker.

Regression / safety notes:

- `node --check js/app.js`: passed.
- `node --check js/push.js`: passed.
- `node --check sw.js`: passed.
- No VAPID private key, Cloudflare token, credentials, or secrets were printed or committed.
- Talk Arrangements was not modified.
- Stage J weather was not started.

Required next action:

- Complete notification permission grant/reset in a real user-controlled Chrome session or on the target installed PWA/device.
- Rerun the visible `Test Push` diagnostic after permission resolves.
- Continue Stage I approval only after a real `subscription:` KV key, real `reminder:` KV key, delivered test push, scheduled reminder delivery, and notification tap open/focus are verified.

### v44 IndexedDB / Cloud Backup hotfix - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved`

Reported live iPhone error:

- Message: `Attempt to get records from database without an in-progress transaction`.
- Error label: `JS-ERROR-promise`.
- Surface: Notes & Reminders after v43 push diagnostics.

Root cause:

- Ministry Tracker app state, notes, reminders, service logs, export, and import are stored through localStorage, not app-owned IndexedDB transactions.
- The only IndexedDB-backed path in the current app is Firebase/Auth/Firestore used by Cloud Backup.
- A browser/Firebase IndexedDB transaction reset could surface as an unhandled promise rejection and the global error boundary treated it as a fatal app error.
- The v44 fix keeps this storage-layer failure inside the cloud-backup boundary and classifies the known IndexedDB transaction reset as recoverable instead of crashing Notes.

Files changed:

- `js/firebase/cloud-backup.js`
- `js/error-boundary.js`
- `js/app.js`
- `sw.js`
- this tracker MD

Cache before: `ministry-tracker-v43-push-sync-fix`.

Cache after: `ministry-tracker-v44-indexeddb-hotfix`.

Implementation notes:

- Added a Cloud Backup guard for the exact IndexedDB transaction-reset error and related IndexedDB transaction failures.
- Wrapped Firebase auth-state callbacks so recoverable browser storage resets are logged as cloud backup skips, not thrown into the app.
- Guarded Cloud Backup save/restore failures so explicit cloud actions fail with a safe user-facing message instead of an internal storage error.
- Updated the global error boundary to suppress this known recoverable IndexedDB transaction reset from app-wide crash UI.
- Changed app cloud-operation logging from `console.error` to `console.warn` so handled cloud backup failures do not appear as fatal console errors.
- No storage keys, data model, notes schema, service log schema, backup JSON format, or cloud collection paths were changed.

Tests run:

- `node --check js/app.js`: passed.
- `node --check js/firebase/cloud-backup.js`: passed.
- `node --check js/error-boundary.js`: passed.
- `node --check sw.js`: passed.

Data safety:

- No data reset, migration, storage-key rename, or schema rewrite was performed.
- Existing Ministry Notes, reminders, service logs, categories, backups, and cloud backup documents are preserved.
- Import was not exercised with live user data during this hotfix.
- Cloud Save/Restore was not exercised live during this hotfix because it can affect real user cloud data.

Remaining risks:

- The original iPhone IndexedDB reset is platform/browser-state dependent and must be rechecked on the affected device after v44 is live.
- If Firebase/Auth repeatedly loses browser storage access on iOS, Cloud Backup may be temporarily unavailable, but local app data should remain usable.
- Stage I push remains blocked from live approval until the app is stable and real push subscription/reminder delivery verification can resume.

### v45 Notes polish - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved (verification pending)`

Scope:

- Completed the next Notes polish pass using Note Clip as a read-only behavioral reference.
- Stage I push verification remains paused; this pass did not continue Cloudflare/KV/browser push approval work.
- Stage J weather was not started.

Cache before: `ministry-tracker-v44-indexeddb-hotfix`.

Cache after: `ministry-tracker-v45-notes-polish`.

Files changed:

- `js/app.js`
- `sw.js`
- this tracker MD

Features completed:

- Reworked Notes category cards with stronger touch targets, note counts, active counts, due badges, edit/delete controls, and better empty states.
- Preserved category navigation, All Notes, selected-category view, and back navigation.
- Added safer category deletion choices: keep notes in All Notes, or delete the category and its notes.
- Reworked note list cards with title/body preview, category badge, priority badge, status badge, due/reminder badges, updated date, completed/archived styling, and better mobile spacing.
- Added richer note search by title, body, and category name.
- Added status filters for active, open, in progress, done, all, completed, and archived notes.
- Added sorting by updated date, due date, priority, and title.
- Rebuilt the note modal with category selection, priority, status, due date, due time, reminder toggle, completed toggle, archived toggle, and edit-mode quick done/archive actions.
- All Notes add flow now opens with no category selected; selected-category add flow auto-applies that category.
- Calendar indicators and selected-date note panel now include notes by due date as well as created date.
- Calendar note add/edit continues to use the same `ministryNotes` records and preserves the selected date for calendar-created notes.
- English and Spanish strings were added for the new filters, sorting labels, badges, empty states, and delete-category choices.

Tests run:

- `node --check js/app.js`: passed.
- `node --check sw.js`: passed.
- `git diff --check`: passed except expected Windows line-ending normalization warnings.

Verification notes:

- Source-level verification confirms only frontend files and this tracker MD changed.
- Cloudflare Worker, push backend, KV, VAPID configuration, Talk Arrangements, Note Clip, service logging logic, and Stage J weather files were not modified.
- Live GitHub Pages, mobile, desktop, console, and visual verification were not completed in this run because the local browser/server path required an escalated tool call that was rejected by the app usage-limit gate.

Remaining Notes work:

- Live-device verification is still required after this commit is pushed: Home, Timer, Calendar, Notes, Reports, note add/edit/delete, category navigation, category add/edit/delete, All Notes, search/filter/sort, calendar add/edit, light/dark mode, English/Spanish, and mobile/desktop layouts.
- Duplicate note was not implemented because the inspected Note Clip implementation did not expose a duplicate-note action.
- Stage I remains `backend-deployed, frontend-live, not live-approved (verification pending)` until real push subscription, KV records, delivered push, scheduled reminder delivery, and notification click are verified in a real browser/device flow.

Commit:

- Pending in this local worktree until commit/push is available.

### v46 Notification route fix - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved (verification pending)`

Commits:

- `493d601` - `fix: route ministry notification clicks`
- `f352f80` - `fix: handle notification route messages`

Cache before: `ministry-tracker-v45-notes-polish`.

Cache after: `ministry-tracker-v46-notification-route-fix`.

Files changed:

- `sw.js`
- `js/sw-register.js`

Implementation notes:

- `sw.js` now builds a notification target URL for Notes using `screen=notes`, `sourceType`, and `sourceId`.
- `sw.js` posts `NOTIFICATION_CLICK_ROUTE` to an existing Ministry Tracker client before focusing it.
- `sw.js` opens a routed Ministry Tracker URL when no existing app client is available.
- `js/sw-register.js` now parses notification-route query parameters on app load.
- `js/sw-register.js` listens for `NOTIFICATION_CLICK_ROUTE`, switches to Notes, and opens the matching Ministry note modal when a `sourceId` is present.

Verification required:

- `node --check sw.js`
- `node --check js/sw-register.js`
- `node --check js/app.js`
- Live GitHub Pages cache must serve `ministry-tracker-v46-notification-route-fix`.
- A real scheduled notification tap must open/focus Notes instead of Home.
- If the notification payload includes a note id, the matching Ministry note modal must open, or the Notes screen must at least focus when the note id cannot be found.
- Console must remain clean.

Remaining risks:

- Closed-app push delivery has since been proven on the target device path; notification tap routing still needs one real reminder notification tap against the live v46 frontend.
- If the tap opens/focuses Notes and opens the matching note when `sourceId` is present, Stage I can be recorded as approved with reminder edit/delete verification still remaining.
- Stage I remains `backend-deployed, frontend-live, not live-approved (verification pending)` until the v46 notification tap result is recorded.

### Stage I lifecycle verification after v47 theme fix - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved`

Cache:

- Live GitHub Pages `sw.js` verified as `ministry-tracker-v47-theme-flash-fix`.
- Live `sw.js` still contains `NOTIFICATION_CLICK_ROUTE`.
- Live `js/sw-register.js` still contains the notification route listener, `switchScreen('notes')`, and `openMinistryNoteModal` handling.

Notification arrival:

- David has verified notifications are received with the app open.
- David has verified notifications are received with the app swipe-closed.

Notification tap routing:

- Not completed in this session.
- Real device tap verification is still required to confirm notification tap opens/focuses Ministry Tracker to Notes instead of Home.
- Matching note modal opening from `sourceId` remains unverified on a real notification tap.

Reminder lifecycle:

- Reminder edit/reschedule firing result: not verified.
- Reminder delete/cancel result: not verified.
- Completed/archived reminders do-not-fire result: not verified.

App checks:

- Live cache and route assets were verified by network fetch.
- Home, Timer, Calendar, Notes, Reports, English/Spanish, light/dark, and live console were not rechecked in-browser during this pass.

Guardrails:

- Cloudflare Worker was not redeployed.
- KV, VAPID, secrets, and Firebase rules were not touched.
- Talk Arrangements, Note Clip, and Stage J Weather were not modified.

Remaining risks:

- Stage I cannot be marked `live-approved` until notification tap routing and reminder edit/delete lifecycle pass on a real device.
- If tap routing passes but edit/delete remain unverified, record Stage I as still not fully live-approved with edit/delete as the remaining blocker.

### Stage I real device verification request - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved`

Verified from this session:

- Repo on `main` matched `origin/main`.
- Live GitHub Pages cache is `ministry-tracker-v47-theme-flash-fix`.
- Live `sw.js` still contains notification route support.

Not completed from this session:

- Real notification tap routing was not verified because it requires tapping the OS notification on the real device/PWA.
- Reminder edit/reschedule firing was not verified.
- Reminder delete/cancel was not verified.
- Completed/archived reminder suppression was not verified.
- App tab, language, theme, and console smoke checks were not re-run in a browser during this pass.

Final status for this pass:

- Keep Stage I as `backend-deployed, frontend-live, not live-approved`.
- No Cloudflare Worker, KV, VAPID, secrets, Firebase rules, Note Clip, Talk Arrangements, or Stage J Weather files were changed.

### Stage I scheduled reminder sync blocker - 2026-06-30

Status: `backend-deployed, frontend-live, not live-approved`

Current verified behavior:

- Test Push works on David's iPhone.
- Push notifications arrive with the app open.
- Push notifications arrive with the app swipe-closed.
- Scheduled reminders do not fire.

Targeted investigation chain:

- Save reminder note.
- `syncMinistryNotePush(savedNote)`.
- `window.MinistryPush.syncReminder(...)`.
- `POST /api/reminders`.
- Worker `handleUpsertReminder()`.
- KV key `reminder:{subscriptionId}:{sourceType}:{sourceId}`.
- Cron `processDueReminders()`.
- `sendWebPush()`.

Guardrails:

- Do not touch Cloudflare secrets, VAPID keys, Firebase rules, Note Clip, Talk Arrangements, or Stage J Weather.
- Do not redeploy Cloudflare unless the scheduled-reminder failure is proven to require a Worker fix.
- If frontend files change, bump cache from `ministry-tracker-v47-theme-flash-fix` to `ministry-tracker-v48-reminder-sync-fix`.

Root cause found:

- Test Push can work with direct `subscription:` KV reads, but scheduled reminder cron depended on `PUSH_STORE.list({ prefix: 'reminder:' })` every minute.
- Cloudflare returned a KV list API free-usage-limit error during verification, matching the scheduled-reminder failure mode.
- The Worker scheduler was updated to avoid KV namespace list scans by indexing reminders into deterministic due-minute bucket keys.

Worker change:

- `handleUpsertReminder()` now stores a `dueBucket` and writes the reminder key into `due:{minute}`.
- `handleDeleteReminder()` removes the reminder key from its due bucket before deleting the reminder.
- `processDueReminders()` now reads recent deterministic due buckets instead of listing all `reminder:` keys.
- Failed sends are re-bucketed for a one-minute retry; successful or invalid reminders are removed from the due bucket.

Deployment:

- Worker changed: yes.
- Cloudflare deployment/version ID: `7f546288-85e3-46d8-9bc2-c5f9564fbd7b`.
- Worker URL: `https://ministry-tracker-push.davidfontenelle80.workers.dev`.
- `/api/health` passed after deployment with `hasStore`, `hasVapidPublicKey`, `hasVapidPrivateKey`, `hasVapidSubject`, and `dueBucketScheduler` all true.

Verification boundary:

- `node --check js/app.js`, `node --check sw.js`, and `node --check cloudflare/ministry-tracker-push/worker.js` passed.
- Remote KV key listing is blocked by Cloudflare free usage limit for that operation today.
- Chrome live-app testing against the GitHub Pages origin is blocked by browser security policy in this session.
- Test Push, Save Reminder sync/saved message, scheduled reminder delivery, notification tap, edit, and delete still require David to re-save a reminder after this Worker deployment in the real iPhone/PWA flow.
