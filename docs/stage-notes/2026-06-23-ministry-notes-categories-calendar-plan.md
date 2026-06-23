---
title: "TEMP — Ministry Notes + Categories + Calendar Build Checklist"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
stage: "Active build supervision"
status: "active-temp-build-file"
created: "2026-06-23"
updated: "2026-06-23"
owner: "David"
supervisor: "App Supervisor / Builder Sol"
priority: "high"
source_app_to_inspect: "davidfontenelle80-cloud/note-clip"
target_app: "davidfontenelle80-cloud/ministry-tracker-"
implementation_language: "Inspect, document, then duplicate/adapt structure. Do not merge."
temporary_file: true
delete_after: "Delete this markdown after Ministry Notes/Categories/Calendar feature is fully built, tested, live-approved, and final documentation is moved into permanent deployment/history docs."
may_delete_when:
  - "All checklist items are complete."
  - "Live GitHub Pages is verified."
  - "Cache version is confirmed current."
  - "David or App Supervisor marks feature approved."
last_verified_live: null
current_owner: "Codex/Coworker"
commit_history: []
---

# TEMP — Ministry Notes + Categories + Calendar Build Checklist

## Purpose of This Temporary File

This is a temporary working memory file for Codex/Coworker while building the Ministry Notes feature.

Use this file as the source of truth during the build. Update it as work progresses. Check off completed items. Add commit hashes, files changed, bugs found, and remaining risks.

When the feature is fully implemented, tested, live-approved, and final documentation has been moved into permanent docs, this temporary markdown file may be deleted.

## Main Instruction

Inspect how Note Clip's Categories → Notes → Calendar workflow works. Document that behavior. Then duplicate/adapt the same structure inside Ministry Tracker as a separate Ministry Notes feature.

Do **not** merge Note Clip into Ministry Tracker.

Do **not** combine Note Clip notes with Ministry service categories.

Do **not** reuse Ministry Tracker's existing `categories` array for this feature.

## Critical Guardrail

Ministry Tracker already uses this existing field for service/session categories:

```js
categories: []
```

That field is used for service logs, reports, session category totals, settings, and existing app behavior.

Do not repurpose it.

Create separate fields:

```js
ministryNoteCategories: []
ministryNotes: []
```

If any implementation starts mixing Ministry Notes with existing service/session `categories`, stop immediately and report the problem.

## Desired User Workflow

David wants the Ministry app to work like this:

1. Open a Ministry Notes/Categories area.
2. See categories such as Return Visits and Bible Studies.
3. Tap a category.
4. Add notes inside that category.
5. Add date/time/reminder details to the note.
6. Open the Calendar.
7. See notes appear on the correct dates.
8. Tap a note from Calendar.
9. Edit the same note record.
10. Return to the Notes/Categories area and see the updated note.

There must not be two separate note systems.

A note created in Notes must be editable from Calendar.

A note created from Calendar must appear in Notes.

## Ministry-Specific Default Note Categories

Use these as the starting defaults. User must be able to edit/add/delete categories later.

```txt
Return Visits / Revisitas
Bible Studies / Estudios bíblicos
Interested Persons / Personas interesadas
Calls / Llamadas
Messages / Mensajes
Territory / Territorio
Appointments / Citas
Personal / Personal
```

## Recommended State Shape

Add to Ministry Tracker defaults and migration/merge logic:

```js
ministryNoteCategories: [
  { id: 'mncat_return_visits', label_en: 'Return Visits', label_es: 'Revisitas', icon: '↩️', color: '#BDD5EA' },
  { id: 'mncat_bible_studies', label_en: 'Bible Studies', label_es: 'Estudios bíblicos', icon: '📖', color: '#C5E2C5' },
  { id: 'mncat_interested', label_en: 'Interested Persons', label_es: 'Personas interesadas', icon: '👥', color: '#D4C5E2' },
  { id: 'mncat_calls', label_en: 'Calls', label_es: 'Llamadas', icon: '☎️', color: '#F7D9B0' },
  { id: 'mncat_messages', label_en: 'Messages', label_es: 'Mensajes', icon: '💬', color: '#F7F0B6' },
  { id: 'mncat_territory', label_en: 'Territory', label_es: 'Territorio', icon: '🗺️', color: '#F2C4B0' },
  { id: 'mncat_appointments', label_en: 'Appointments', label_es: 'Citas', icon: '📅', color: '#BDD5EA' },
  { id: 'mncat_personal', label_en: 'Personal', label_es: 'Personal', icon: '📝', color: '#F7F0B6' }
],
ministryNotes: []
```

Recommended note object:

```js
{
  id: string,
  title: string,
  body: string,
  categoryId: string | null,
  personName: string,
  phone: string,
  address: string,
  locationName: string,
  priority: 'high' | 'medium' | 'low',
  status: 'active' | 'followup' | 'scheduled' | 'completed' | 'archived',
  dueDate: 'YYYY-MM-DD' | '',
  dueTime: 'HH:mm' | '',
  reminder: '' | 'same_day' | 'day_before' | '1h_before' | 'custom',
  reminderAt: ISO string | '',
  sourceSessionId: string | null,
  sourceDate: 'YYYY-MM-DD' | '',
  completed: boolean,
  archived: boolean,
  createdAt: ISO string,
  updatedAt: ISO string
}
```

## Required Inspection Before Coding

Inspect Note Clip first and document findings below.

### Note Clip files/functions to inspect

- [ ] `js/storage.js` — state shape, categories, notes, CRUD helpers.
- [ ] `js/notes.js` — category grid, note cards, note modal, category modal, status/search/filter behavior.
- [ ] `js/calendar.js` — calendar indicators, notes by date, upcoming/overdue sections, open/edit note from calendar.
- [ ] `app.js` — routing/FAB behavior between notes and calendar.
- [ ] `index.html` — script load order and tab structure.
- [ ] CSS files — category grid, note cards, modal, calendar rows.
- [ ] i18n labels — note/category/calendar labels.
- [ ] service worker/cache files — current cache version and deploy behavior.
- [ ] backup/export/import/cloud behavior — confirm full state preservation.

### Inspection notes

Add notes here as you inspect:

```txt
Pending.
```

## Required Ministry Tracker Inspection Before Coding

Inspect Ministry Tracker and document findings below.

- [ ] `index.html` screen structure.
- [ ] Bottom nav structure.
- [ ] Home screen entry points.
- [ ] Calendar screen rendering and selected-day behavior.
- [ ] Log screen and existing session notes.
- [ ] Settings screen and existing service categories.
- [ ] `js/app.js` state defaults and load/save logic.
- [ ] i18n object in `js/app.js`.
- [ ] Export/import logic.
- [ ] Cloud backup logic.
- [ ] Theme/light/dark behavior.
- [ ] Modal/component utilities.
- [ ] Service worker/cache version.

### Ministry inspection notes

Add notes here as you inspect:

```txt
Pending.
```

## Build Stages

Do not jump stages. Complete and update this checklist as each stage is done.

## Stage 0 — Repo / Boilerplate Review

Objective:
Inspect Note Clip, Ministry Tracker, and relevant KHub boilerplate patterns before coding.

Checklist:

- [ ] Confirm Note Clip source files and exact functions to duplicate/adapt.
- [ ] Confirm Ministry target files and exact functions to modify.
- [ ] Confirm whether Ministry currently has one-file app logic or modular logic.
- [ ] Confirm current Ministry cache version.
- [ ] Confirm existing cloud backup path and behavior.
- [ ] Confirm export/import includes full state.
- [ ] Confirm i18n approach for English/Spanish labels.
- [ ] Confirm modal approach.
- [ ] Confirm calendar rendering approach.
- [ ] Write inspection summary in this file.

Success criteria:

- Exact file/function map is documented.
- Risks are documented.
- Cache version is documented.
- No app behavior changed unless explicitly approved.

Stop conditions:

- Unknown state shape.
- Unknown cache version.
- Unknown backup behavior.
- Calendar behavior unclear.

Stage 0 status: `pending`

## Stage 1 — Data Model + Storage Helpers

Objective:
Add the Ministry Notes data model safely without changing existing service reports/logs.

Checklist:

- [ ] Add `ministryNoteCategories` defaults.
- [ ] Add `ministryNotes` defaults.
- [ ] Add migration/merge logic for existing users.
- [ ] Add note ID generator or reuse existing safe generator.
- [ ] Add `addMinistryNote(data)`.
- [ ] Add `updateMinistryNote(id, patch)`.
- [ ] Add `deleteMinistryNote(id)`.
- [ ] Add `completeMinistryNote(id)`.
- [ ] Add `archiveMinistryNote(id)`.
- [ ] Add `restoreMinistryNote(id)`.
- [ ] Add `addMinistryNoteCategory(data)`.
- [ ] Add `updateMinistryNoteCategory(id, patch)`.
- [ ] Add `deleteMinistryNoteCategory(id, behavior)`.
- [ ] Confirm existing `categories` is untouched.
- [ ] Confirm existing sessions/reports still load.
- [ ] Confirm export/import preserves new fields.
- [ ] Confirm cloud backup/restore preserves new fields.

Success criteria:

- Existing app loads with old data.
- New fields appear safely after load.
- Existing service categories remain unchanged.
- Existing reports and timer still work.

Stop conditions:

- Any service report total changes unexpectedly.
- Existing service `categories` are renamed, moved, or repurposed.
- Export/import drops notes.
- Cloud backup drops notes.

Stage 1 status: `pending`

## Stage 2 — Notes/Categories UI

Objective:
Duplicate/adapt Note Clip's categories and notes workflow inside Ministry Tracker.

Checklist:

- [ ] Add Ministry Notes entry point. Recommended MVP: Home card/button and Calendar button, not crowded bottom nav.
- [ ] Add Ministry Notes screen/section.
- [ ] Add category grid.
- [ ] Add category card count.
- [ ] Add selected-category notes view.
- [ ] Add all-notes view.
- [ ] Add status filters.
- [ ] Add search.
- [ ] Add note card.
- [ ] Add note add/edit modal.
- [ ] Add category add/edit modal.
- [ ] Add safe category delete behavior.
- [ ] Add complete/archive/restore behavior.
- [ ] Add person fields only if approved or simple enough: personName, phone, address/location.
- [ ] Add due date and due time fields.
- [ ] Add reminder field saving.
- [ ] Add English labels.
- [ ] Add Spanish labels.
- [ ] Confirm mobile layout.
- [ ] Confirm desktop layout.
- [ ] Confirm dark/light theme.

Success criteria:

- User can create a category.
- User can create a note inside a category.
- User can edit/delete/archive/complete a note.
- User can search/filter notes.
- Existing Ministry service log still works.

Stop conditions:

- UI creates dead buttons.
- Native `prompt()` is introduced.
- Mobile keyboard breaks text entry.
- Theme or language breaks.

Stage 2 status: `pending`

## Stage 3 — Calendar Integration

Objective:
Make Ministry Notes accessible and editable from Calendar.

Checklist:

- [ ] Add note indicators to calendar days.
- [ ] Show selected-day Ministry Notes below calendar.
- [ ] Add upcoming Ministry Notes section.
- [ ] Add overdue Ministry Notes section.
- [ ] Open/edit the same note record from calendar.
- [ ] Add new note from selected calendar date with `dueDate` prefilled.
- [ ] Editing note date moves it to the correct calendar day.
- [ ] Completed/archived notes do not clutter active calendar unless intentionally shown.
- [ ] Existing calendar service plan/log behavior still works.
- [ ] Existing studies/plans/logs still display correctly.

Success criteria:

- Note created in Notes appears on Calendar.
- Note opened from Calendar edits the same record.
- Note created from Calendar appears in Notes.
- No duplicate note systems.

Stop conditions:

- Calendar data becomes ambiguous.
- Existing calendar log/plan workflows break.
- Notes created from Calendar are stored separately from Notes screen records.

Stage 3 status: `pending`

## Stage 4 — Reminder Foundation

Objective:
Save and display reminder information without overpromising push notifications.

Checklist:

- [ ] Save reminder preset values.
- [ ] Save custom reminder date/time.
- [ ] Show reminder badge on note cards.
- [ ] Show reminder info in calendar rows.
- [ ] Show upcoming reminders where appropriate.
- [ ] Add clear denied/unavailable messaging if notification permission is not part of this stage.
- [ ] Do not fake push notification success.
- [ ] If FCM is added later, use approved KHub path from Firebase plan file.

Success criteria:

- Reminder information persists.
- UI makes clear what is saved.
- No false success messages.

Stop conditions:

- App claims notifications are enabled when they are not.
- Reminder data is saved but never visible.

Stage 4 status: `pending`

## Stage 5 — Visual / Brand Alignment

Objective:
Make the duplicated structure look like Ministry Tracker, not a pasted foreign app.

Checklist:

- [ ] Use Ministry card styles.
- [ ] Use Ministry buttons/chips.
- [ ] Use Ministry modal styling.
- [ ] Keep mobile touch targets large.
- [ ] Ensure icon buttons have aria-labels.
- [ ] Ensure focus remains visible.
- [ ] Avoid excessive visual clutter on calendar.
- [ ] Verify dark mode.
- [ ] Verify light mode.
- [ ] Verify Spanish text does not overflow.

Success criteria:

- Feature feels native to Ministry Tracker.
- It preserves Note Clip's structure but adapts to Ministry's design.

Stop conditions:

- Bottom nav becomes crowded/unusable.
- Visual style breaks existing screens.

Stage 5 status: `pending`

## Stage 6 — QA / Validation

Objective:
Validate the full feature before approval.

Checklist:

- [ ] App loads without console errors.
- [ ] Existing timer works.
- [ ] Existing service sessions save/load.
- [ ] Existing log works.
- [ ] Existing reports calculate correctly.
- [ ] Existing credit hours work.
- [ ] Existing service categories still work.
- [ ] Ministry note categories add/edit/delete works.
- [ ] Ministry notes add/edit/delete works.
- [ ] Complete/archive/restore works.
- [ ] Notes inside categories work.
- [ ] All notes view works.
- [ ] Search works.
- [ ] Status filters work.
- [ ] Due-date notes appear on calendar.
- [ ] Calendar note edit updates the same record.
- [ ] Calendar add note pre-fills selected date.
- [ ] Export/import includes note fields.
- [ ] Cloud backup/restore includes note fields.
- [ ] Mobile verification complete.
- [ ] Desktop verification complete.
- [ ] Light mode verification complete.
- [ ] Dark mode verification complete.
- [ ] English verification complete.
- [ ] Spanish verification complete.
- [ ] Service worker cache version bumped.
- [ ] GitHub Pages live app verified.

Success criteria:

- No regressions.
- Live app works after cache refresh.
- David/App Supervisor can approve.

Stop conditions:

- Console errors.
- Data loss risk.
- Backup/restore failure.
- Live app stale because cache not bumped.

Stage 6 status: `pending`

## Required Report After Every Work Session

Update this file and report back with:

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
Checklist items completed in this MD:
Checklist items still pending:
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

## Final Cleanup Rule

This is a temporary build-control file.

Delete this file only after:

- [ ] Feature fully implemented.
- [ ] All checklist items complete or intentionally deferred with explanation.
- [ ] Final implementation summarized in permanent docs or deployment history.
- [ ] Cache version documented.
- [ ] GitHub Pages live version verified.
- [ ] David/App Supervisor approves deletion.

When deleting, use commit message:

```txt
Remove temporary Ministry notes build checklist after approval
```

## One-Message Prompt for Codex/Coworker

```txt
Open the Ministry Tracker repo: davidfontenelle80-cloud/ministry-tracker-.

Read this file first and treat it as your temporary source of truth:
docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md

Then inspect the Note Clip repo: davidfontenelle80-cloud/note-clip.

Your first job is not to code. Your first job is to inspect how Note Clip handles Categories → Notes → Calendar, document that structure inside the markdown checklist, and report back.

Important wording:
Do not merge Note Clip into Ministry Tracker.
Duplicate/adapt the structure as a separate Ministry Notes feature.
Do not touch or repurpose Ministry Tracker's existing `categories` array. That belongs to service/session logging and reports.

As you build, keep updating the markdown checklist by checking off completed items, adding commit hashes, files changed, cache version, tests, known issues, and remaining risks.

This markdown is temporary. Once the build is fully complete, live-approved, documented elsewhere, and David/App Supervisor approves, it may be deleted.

Stop if:
- Ministry Notes are being mixed with existing service categories.
- Reports/hour totals would be affected.
- Export/import would lose notes.
- Cloud backup would lose notes.
- Cache version cannot be confirmed.
- Calendar behavior is unclear.

Required report after each work session:
Summary, commit hash, files changed, tests run, screenshots if UI changed, cache version before/after, bugs fixed, known issues, mobile verification, desktop verification, light/dark verification, English/Spanish verification, export/import verification, cloud backup/restore verification, live GitHub Pages verification, remaining risks, checklist items completed, checklist items still pending.
```
