---
title: "Ministry Notes + Categories + Calendar Integration Plan"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
stage: "Stage 0 / Stage 1 planning"
status: "planned"
created: "2026-06-23"
owner: "David"
supervisor: "App Supervisor / Builder Sol"
priority: "high"
source_app_to_reuse: "davidfontenelle80-cloud/note-clip"
related_feature: "Clone Note Clip category notes, due dates, reminders, and calendar editing into Ministry Tracker"
temporary_file: true
delete_after: "Feature is implemented, tested, pushed, live-approved, and documented in deployment history."
last_verified_live: null
commit_history: []
---

# Ministry Notes + Categories + Calendar Integration Plan

## Objective

Bring the best parts of Note Clip's Categories + Notes + Calendar workflow into Ministry Tracker, adapted for Jehovah's Witness ministry use.

The goal is not to redesign Ministry Tracker. The goal is to add a ministry-specific note system that can be accessed and edited from both:

1. A dedicated Notes/Categories area.
2. The existing Calendar screen.

A note created or edited in one place must immediately show correctly in the other place.

## Source System to Reuse

Use Note Clip as the reference implementation for:

- Categories grid.
- Category CRUD.
- Notes inside categories.
- Note cards.
- Note modal.
- Due date and due time.
- Reminder fields.
- Appointment/location fields where useful.
- Calendar indicators for notes.
- Calendar list of notes by selected date.
- Opening/editing a note from the calendar.

## Ministry-Specific Purpose

This feature should support practical ministry tracking, such as:

- Return visits.
- Bible studies.
- Interested persons.
- Calls/texts to make.
- Literature/video follow-up.
- Congregation or group reminders.
- Personal ministry to-do notes.

Recommended default Ministry note categories:

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

These should be editable by the user.

## Important Architecture Decision

Do not merge this into the existing Ministry `categories` array used for service session tags.

Ministry currently uses `categories` for session/service activity tagging, such as Door-to-door, Public Witnessing, Cart Witnessing, and other field service categories.

Create a separate data model:

```js
ministryNoteCategories: []
ministryNotes: []
```

This avoids breaking existing session logs, reports, dashboard category totals, or service category settings.

## Proposed State Shape

Add to Ministry Tracker state defaults:

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

## Relationship to Existing Ministry Logs

The current Ministry Log already has session notes. Do not replace that.

Add a bridge only where useful:

- From a service session, user may tap something like `Create follow-up note`.
- That creates a Ministry Note with `sourceSessionId` and `sourceDate`.
- Editing the Ministry Note should not mutate the original service session unless a later stage explicitly adds that behavior.

## Calendar Integration

The existing Ministry calendar must show both:

1. Existing planned/logged ministry time.
2. Ministry notes that have a due date or appointment date.

Calendar behavior:

- A day with Ministry Notes should show a visible indicator.
- Selecting a day should show that day's notes below the calendar.
- Tapping a note row opens the same edit note modal used from the Notes/Categories screen.
- Saving from the calendar updates the note everywhere.
- Adding a note from a selected calendar date should prefill `dueDate` with that selected day.

Do not make two separate note systems.

## Navigation Recommendation

Ministry Tracker currently has a five-button bottom nav. Adding a sixth nav item may crowd mobile.

Recommended MVP:

- Add a `Notes` entry point from Home as a card/button.
- Add a `Notes` entry point inside Calendar.
- Add a `Notes` section from Settings only for category management if needed.

Possible later upgrade:

- Replace bottom nav with a KHub-style router that supports more tabs cleanly.
- Or add a `More` tab that contains Notes, Settings, Backup, and future features.

For MVP, avoid a major navigation redesign.

## Stage Plan

### Stage 0 — Repo / Boilerplate Review

Review before coding:

- Ministry Tracker `index.html` screen structure.
- Ministry Tracker `js/app.js` state, rendering, modal, calendar, log, settings, backup/export/import, i18n, and theme.
- Note Clip `js/storage.js` category/note state and CRUD patterns.
- Note Clip `js/notes.js` category grid, note card, note modal, reminders, and category modals.
- Note Clip `js/calendar.js` date indicators, date filtering, and edit-from-calendar flow.
- KHub Boilerplate standards for modal, buttons, theme, i18n, storage, and service worker cache.

Success criteria:

- Identify exact Ministry functions/areas to modify.
- Identify exact Note Clip logic to reuse vs rewrite.
- Confirm current Ministry cache version.
- Confirm export/import includes full state so new note fields are backed up.
- Confirm cloud backup saves/restores the full state.

Stop conditions:

- Do not code until data model is confirmed.
- Do not merge note categories with service session categories.
- Do not redesign bottom navigation in the first pass.
- Do not change report totals or service-hour calculations.

### Stage 1 — Data Model + Storage Helpers

Add Ministry-specific note data without UI changes first.

Scope:

- Add `ministryNoteCategories` and `ministryNotes` to defaults.
- Add migration/merge logic so existing users receive defaults without losing data.
- Add helpers:
  - `addMinistryNote(data)`
  - `updateMinistryNote(id, patch)`
  - `deleteMinistryNote(id)`
  - `completeMinistryNote(id)`
  - `archiveMinistryNote(id)`
  - `restoreMinistryNote(id)`
  - `addMinistryNoteCategory(data)`
  - `updateMinistryNoteCategory(id, patch)`
  - `deleteMinistryNoteCategory(id, behavior)`

Success criteria:

- Existing data loads.
- New fields are present after load.
- Export/import preserves new fields.
- Cloud backup preserves new fields.
- No UI changes yet except possibly hidden debug verification.

### Stage 2 — Notes/Categories UI

Create the Ministry Notes UI by adapting Note Clip's category and notes workflow.

Scope:

- Category grid.
- All notes view.
- Notes inside selected category.
- Status filters.
- Search.
- Note card.
- Add/edit note modal.
- Add/edit category modal.
- Delete category safety behavior.

Ministry-specific labels:

- `Return Visits`
- `Bible Studies`
- `Interested Persons`
- `Calls`
- `Messages`
- `Territory`
- `Appointments`
- `Personal`

Spanish labels required:

- `Revisitas`
- `Estudios bíblicos`
- `Personas interesadas`
- `Llamadas`
- `Mensajes`
- `Territorio`
- `Citas`
- `Personal`

What not to change:

- Existing session category settings.
- Existing reports.
- Existing credits.
- Existing timer behavior.

### Stage 3 — Calendar Integration

Connect Ministry Notes to the Ministry Calendar.

Scope:

- Calendar day indicator for notes.
- Selected day list of notes.
- Upcoming notes section.
- Overdue notes section.
- Open/edit note from calendar.
- Add note from selected calendar date.

Required behavior:

- A note due on June 25 appears on June 25 in the calendar.
- Tapping that note opens the edit modal.
- Editing the date moves it to the new calendar day.
- Completing/archive hides or moves it according to filter rules.
- Existing service time plan/log calendar behavior remains intact.

### Stage 4 — Reminder Foundation

Use Note Clip's reminder field pattern first. Full push notifications can be a later stage.

MVP reminder behavior:

- Save reminder fields on the note.
- Show reminder badges on cards.
- Show reminder timing in calendar/upcoming/overdue sections.
- If the app already has a local reminder/check system, reuse it.
- If push notification work is not ready, do not fake notifications.

Later stage:

- Connect saved note reminders to Firebase Cloud Messaging / notification tokens under the approved KHub path.

### Stage 5 — Visual/Brand Alignment

Adapt styling to Ministry Tracker's existing visual language.

Scope:

- Use Ministry cards, chips, buttons, modal sheet, dark/light theme.
- Do not copy Note Clip's sticky-note visual style unless David approves it.
- Use ministry-appropriate icons and clean labels.
- Keep mobile touch targets large.

### Stage 6 — Validation / QA

Required tests:

- App loads without console errors.
- Existing sessions still save/load.
- Existing timer works.
- Existing reports still calculate correctly.
- Existing service categories still work.
- New Ministry Notes add/edit/delete works.
- New Ministry Note categories add/edit/delete works.
- Notes inside categories work.
- Notes in all-notes view work.
- Due date notes appear on calendar.
- Calendar note edit updates the same note record.
- Search works.
- Status filters work.
- Export/import includes notes and categories.
- Cloud backup/restore includes notes and categories.
- Mobile layout works.
- Desktop layout works.
- Light/dark mode works.
- English/Spanish labels work.
- Service worker cache version is bumped.
- GitHub Pages live app verified.

## What Could Go Wrong

- Accidentally reusing `categories` and breaking service reports.
- Adding too many bottom-nav items and making mobile crowded.
- Calendar becoming confusing if sessions, plans, notes, reminders, and studies all display the same way.
- Reminder UI promising notifications before notification infrastructure exists.
- Export/import missing new fields.
- Cloud backup restoring old shape and wiping new defaults.
- Service worker cache causing the live app to look stale after deployment.

## Required Codex / Coworker Report

Codex or Coworker must report back with:

- Summary.
- Commit hash.
- Files changed.
- Tests run.
- Screenshots if UI changed.
- Cache version before and after.
- Bugs fixed.
- Known issues.
- Mobile verification.
- Desktop verification.
- Light/dark verification.
- English/Spanish verification.
- Export/import verification.
- Cloud backup/restore verification.
- Live GitHub Pages verification.
- Remaining risks.

Approval rule:

- If live GitHub Pages was not verified, mark as `code-implemented, not live-approved yet`.
- Do not approve vague reports.
- Do not approve if cache version was not bumped for deployable changes.
- Do not approve if service session categories and ministry note categories are mixed.

## Copy/Paste Prompt for Codex or Coworker

```txt
Access these repos:
1. Ministry Tracker: davidfontenelle80-cloud/ministry-tracker-
2. Note Clip: davidfontenelle80-cloud/note-clip
3. KHub Boilerplate if needed: davidfontenelle80-cloud/KHub-Boilerplate

Objective:
Plan and then implement a Ministry Notes feature in Ministry Tracker by adapting Note Clip's Categories + Notes + Calendar workflow. This is for Jehovah's Witness ministry use: return visits, Bible studies, interested persons, calls, messages, territory, appointments, and personal ministry reminders.

Important architecture rule:
Do NOT merge this into Ministry Tracker's existing `categories` array. Existing `categories` are service session categories used for logging and reports. Create separate fields:
- ministryNoteCategories
- ministryNotes

Source features to reuse from Note Clip:
- Category grid.
- Category add/edit/delete.
- Notes inside categories.
- All notes view.
- Status filters.
- Search.
- Note cards.
- Add/edit note modal.
- Due date and due time.
- Reminder fields.
- Appointment/location fields where useful.
- Calendar date indicators.
- Calendar day note list.
- Opening/editing a note from the calendar.

Recommended default Ministry note categories:
- Return Visits / Revisitas
- Bible Studies / Estudios bíblicos
- Interested Persons / Personas interesadas
- Calls / Llamadas
- Messages / Mensajes
- Territory / Territorio
- Appointments / Citas
- Personal / Personal

Recommended state fields:
- ministryNoteCategories: []
- ministryNotes: []

Recommended note object:
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

Stage 0/1 first:
- Review Ministry Tracker structure, app.js state, calendar, log, settings, i18n, theme, cloud backup/export/import.
- Review Note Clip js/storage.js, js/notes.js, js/calendar.js.
- Produce an implementation plan with exact files and functions.
- Confirm cache version.
- Confirm backup/export/import handling.
- Stop and wait for David approval before implementation unless David explicitly says continue.

Implementation staging after approval:
Stage 1: Data model and storage helpers only.
Stage 2: Notes/Categories UI.
Stage 3: Calendar integration.
Stage 4: Reminder foundation.
Stage 5: Visual/brand alignment.
Stage 6: QA and live verification.

What NOT to change:
- Do not change existing service-hour calculations.
- Do not change reports.
- Do not change credit hours.
- Do not replace the existing service log note field.
- Do not redesign the whole bottom navigation in MVP.
- Do not fake push notifications.
- Do not use native prompt() for app workflows.
- Do not create dead buttons or placeholder UI.

Required report:
- Summary.
- Commit hash.
- Files changed.
- Tests run.
- Screenshots if UI changed.
- Cache version before and after.
- Bugs fixed.
- Known issues.
- Mobile verification.
- Desktop verification.
- Light/dark verification.
- English/Spanish verification.
- Export/import verification.
- Cloud backup/restore verification.
- Live GitHub Pages verification.
- Remaining risks.

Stop conditions:
- If Ministry service categories and Ministry note categories are being mixed, stop.
- If the calendar behavior is unclear, stop and ask David.
- If backup/export/import would lose note data, stop.
- If service worker cache version cannot be confirmed, stop before live approval.
```

## Running Progress Log

| Date | Stage | Status | Commit | Notes |
|---|---:|---|---|---|
| 2026-06-23 | 0/1 | Planned | pending | Planning note created for Note Clip-style Ministry Notes/Categories/Calendar integration. |

## Open Questions for David

1. Should the first Notes entry point be a Home card, a Calendar button, or a bottom nav item?
2. Should the first version include person fields like phone/address, or keep it simple with title/body/category/date/reminder?
3. Should a service session be able to create a follow-up note immediately, or should that be saved for a second pass?
4. What should not be built yet?
