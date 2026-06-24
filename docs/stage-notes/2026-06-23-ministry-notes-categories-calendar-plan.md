---
title: "TEMP — Ministry Notes & Reminders Implementation Tracker"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
reference_repo: "davidfontenelle80-cloud/note-clip"
boilerplate_repo: "davidfontenelle80-cloud/KHub-Boilerplate"
stage: "Stage B — complete"
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
commit_history:
  - date: "2026-06-24"
    stage: "Stage B"
    summary: "Note Clip inspection complete. Stage B findings documented."
    inspector: "Claude (Cowork)"
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

- Do **not** "merge" Note Clip into Ministry Tracker.
- Inspect Note Clip, document how it works, then duplicate/adapt the same structure inside Ministry Tracker.
- The new feature must feel native to Ministry Tracker, not pasted from Note Clip.

## CRITICAL GUARDRAIL — DO NOT TOUCH EXISTING SERVICE CATEGORIES

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

## STAGE A — Navigation Cleanup FIRST

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

### Stop Conditions

- Stop if hour totals change.
- Stop if reports break.
- Stop if sessions cannot be edited.
- Stop if historical logs cannot be accessed.
- Stop if mobile nav becomes crowded.

### Stage A status

`pending — do not start until David approves this tracker update`

## STAGE B — Inspect Note Clip

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

- [x] `js/storage.js` — state shape, categories, notes, CRUD helpers.
- [x] `js/notes.js` — category grid, note cards, note modal, category modal, status/search/filter behavior.
- [x] `js/calendar.js` — calendar indicators, notes by date, upcoming/overdue sections, open/edit note from calendar.
- [x] `app.js` — routing/FAB behavior between notes and calendar.
- [x] `index.html` — script load order and tab structure.
- [ ] CSS files — category grid, note cards, modal, calendar rows.
- [x] i18n labels — note/category/calendar labels.
- [x] Service worker/cache files — current cache version and deploy behavior.
- [x] Backup/export/import/cloud behavior — confirm full state preservation.

### Note Clip inspection notes

```txt
COMPLETE — see Stage B Findings section below.
```

### Stage B status

`COMPLETE — 2026-06-24 — approved for Stage C planning`

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
Tests run: N/A (documentation only — no code changes)
Screenshots if UI changed: N/A
Cache version before: N/A
Cache version after: N/A
Bugs fixed: N/A
Known issues: firebase-config.js, communication.js, push.js, onboarding.js not retrieved (timeout) — not critical for Stage B
Mobile verification: N/A
Desktop verification: N/A
Light/dark verification: N/A
English/Spanish verification: N/A
Export/import verification: N/A
Cloud backup/restore verification: N/A
Live GitHub Pages verification: N/A
Remaining risks: See Stage B Recommendations → Risks section
Checklist items completed in this MD: All Stage B checklist items
Checklist items still pending: Stage A, C, D, E, F, G, H all pending
Status: APPROVED FOR STAGE C PLANNING
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
Add a new Notes & Reminders feature to Ministry Tracker by duplicating/adapting Note Clip's Categories → Notes → Calendar workflow. Do not merge Note Clip into Ministry Tracker.

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

## Stage B — Note Clip Inspection Findings

**Inspector:** Claude (Cowork)
**Date:** 2026-06-24
**Source repo inspected:** `davidfontenelle80-cloud/note-clip`
**Files read:** storage.js, notes.js, calendar.js, dashboard.js, reminders.js, app.js, settings.js, cloud-sync.js, i18n.js, sw.js, index.html, lists.js

---

### Stage B Inspection Checklist — COMPLETE

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
  lists: [ /* list objects — not relevant for ministry */ ],
  sharedItems: [ /* shared items — not relevant */ ],
  drafts: [ /* drafts — not relevant */ ],
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

#### Notes Storage Shape — ALL FIELDS

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
  reminderAt:          string,   // ISO datetime 'YYYY-MM-DDTHH:MM:00' — set by reminder bell picker
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

**Note:** `reminderAt` is NOT in the default object in `addNote()` — it is added later by `updateNote()` through the reminder bell picker in `reminders.js`. Any Ministry adaptation must explicitly include it in the default object.

#### Relationships

- `note.categoryId` → `category.id` (soft FK, nullable)
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

`css .category-grid` — CSS grid. Cards show:
- Icon (PNG img if `ic_` prefix, else emoji/text)
- Edit button (✎) and Delete button (×) visible on card-top
- Category name
- Note count: `n notes`
- Click anywhere on card (except buttons) to open notes for that category

#### Category Add Flow

1. In categories view, FAB triggers `App.Notes.onFab()` → `_openCatModal(null)`
2. Modal collects: `name` (required), `icon` (text field accepting PNG filename or emoji)
3. `_saveCat('')` → `App.Storage.addCategory({ name, icon })` → re-render
4. No color picker in category modal (color defaults to `#F7F0B6`)

#### Category Edit Flow

1. ✎ button on card → `_editCat(id)` → `_openCatModal(cat)`
2. Prefills name and icon
3. `_saveCat(id)` → `App.Storage.updateCategory(id, { name, icon })` → re-render

#### Category Delete Flow — IMPORTANT

When a category has notes and is deleted:
- A confirmation modal shows two options:
  - **"Remove category tag only"** → `deleteCategory(id, false)` → notes remain, their `categoryId` becomes `null`
  - **"Delete notes too"** → `deleteCategory(id, true)` → notes are hard-deleted
- When a category has zero notes: simple `confirm()` → `deleteCategory(id, false)`

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

`_archiveNote(id)` → `updateNote(id, { archived: true })`. No confirmation required. Archived notes only appear under the "Archived" status tab.

#### Complete/Reopen Behavior

`_completeNote(id)` → `updateNote(id, { completed: true, status: 'completed' })`. No "reopen" UI is implemented in Note Clip — completed notes can only be accessed via the "Completed" status tab. Re-editing a completed note would not reset completed status automatically.

---

### NOTE OBJECT — ALL FIELDS (Definitive)

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
Validation: name must not be empty — shows toast error if blank.
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
- Delete (red), Complete (✓), Archive — then Cancel / Save

#### Save Flow

`_saveNote(id)` reads all inputs. Validation: title AND body both empty → toast error, return. Otherwise calls `addNote(patch)` or `updateNote(id, patch)`, closes modal, re-renders notes, optionally refreshes dashboard reminders.

#### Delete Flow

`_deleteNote(id)` → native `confirm()` dialog → `App.Storage.deleteNote(id)`. If called from modal (`fromModal=true`), also closes the modal.

#### Edit Flow

`_editNote(id)` → finds note in state → `_openNoteModal(note)` with prefilled values.

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
1. Calls `App.showTab('notes')` — switches to the Notes tab
2. `setTimeout(() => App.Notes?._editNote?.(id), 0)` — opens note edit modal on next tick

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
  - `dueDate < today` — past due date, OR
  - `dueDate === today` AND `dueTime` set AND `new Date(dueDate + 'T' + dueTime) < now` — same day, time already passed
- Sorted ascending, limited to 8

#### Reminder Logic (Two Layers)

Layer A — In-app popup (`reminders.js`):
- `App.Reminders.checkReminders()` runs on init, every 60 seconds, and on `visibilitychange`
- `_reminderTime(n)` calculates the fire time:
  - `n.reminderAt` (direct ISO) → exact timestamp (highest priority)
  - `n.reminder === 'same_day'` → `dueDate` at 08:00
  - `n.reminder === 'day_before'` → day before `dueDate` at 08:00
  - `n.reminder === '1h_before'` → `dueDate + dueTime - 1h`
  - `n.reminder === '2h_before'` → `dueDate + dueTime - 2h`
  - `dueDate + dueTime` with no reminder → fires at exact due datetime
- Popup bar appears with Open / Snooze (1h) / Dismiss actions
- Dismissed notes stored in `noteClip_notified` localStorage key by note ID + signature
- Snoozed notes stored in `noteClip_snoozed` key with snooze-until timestamp

Layer B — Browser Notification API:
- If `Notification.permission === 'granted'` and `settings.notificationsEnabled === true`
- `new Notification(title, { body, icon, tag })` fires and marks notes as notified
- Layer B takes precedence — if browser notification fires, Layer A popup is skipped
- FCM push via `App.Push.subscribe()` and `App.Push.syncReminder()` — requires `push.js` (not inspected)

---

### EXPORT / IMPORT

#### How Categories Are Exported

`App.Storage.exportJSON()` serializes `getState()` — the ENTIRE state including `categories`. No selective export.

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

No import UI found in `settings.js` or `storage.js` — there is a `restore` i18n key defined but no `importJSON()` function observed in the inspected files. Cloud restore (`restoreFromCloud()`) uses `App.Storage.setState(restored)` which completely replaces the state.

#### Risks When Adapting to Ministry Tracker

1. **Key collision** — Ministry Tracker's existing export uses a different storage key and structure. If Ministry Notes are added to the same export object, the structure must be cleanly namespaced.
2. **Missing restore UI** — Ministry Tracker already has import/restore. The new `ministryNotes` and `ministryNoteCategories` arrays must be explicitly preserved in the existing import/export logic.
3. **`_cleanState()` in cloud-sync** — Note Clip's cloud backup strips to a whitelist. Ministry Tracker must add `ministryNotes` and `ministryNoteCategories` to any equivalent whitelist.
4. **setState() replaces entirely** — Restoring from cloud or importing would overwrite all notes. No merge strategy exists.

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

`restoreFromCloud()` → reads Firestore doc → `_cleanState(data.state)` → `App.Storage.setState(restored)`.
This is a FULL state replace. No partial merge.

#### Risks When Adapting to Ministry Tracker

1. **Ministry Tracker uses a different Firestore path.** Confirm the ministry app's backup path before connecting. Do not reuse Note Clip's path.
2. **`_cleanState()` whitelist must be updated** to include `ministryNoteCategories` and `ministryNotes`.
3. **Full replace on restore** — any Ministry Notes added after a backup will be lost on restore.
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
| `by_category` | By Category | Por Categoría |
| `categories` | Categories | Categorías |
| `add_note` | Add Note | Agregar Nota |
| `edit_note` | Edit Note | Editar Nota |
| `add_category` | Add Category | Nueva Categoría |
| `edit_category` | Edit Category | Editar Categoría |
| `delete_category` | Delete Category | Eliminar Categoría |
| `cat_delete_q` | (delete confirm) | (delete confirm) |
| `cat_delete_tag` | Remove category tag only | Quitar solo la categoría |
| `cat_delete_all` | Delete notes too | Eliminar las notas también |
| `note_title` | Title | Título |
| `note_body` | Content | Contenido |
| `note_due` | Due Date | Fecha límite |
| `note_due_time` | Due Time | Hora |
| `note_reminder` | Reminder | Recordatorio |
| `note_appt` | Appointment | Cita |
| `note_location` | Location | Lugar |
| `note_address` | Address | Dirección |
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
| `cal_upcoming` | Upcoming | (not found in i18n — needs adding) |
| `cal_overdue` | Overdue | (not found in i18n — needs adding) |
| `cal_no_notes_day` | (not found) | (needs adding) |

**Note:** `cal_upcoming`, `cal_overdue`, `cal_no_notes_day`, `cal_no_overdue`, `cal_nothing_due` are used in `calendar.js` but are NOT present in the i18n.js `STRINGS` object inspected. These keys will fall back to the key name itself. Ministry Tracker must add these keys.

#### Risks When Adapting to Ministry Tracker

1. Ministry Tracker already has its own i18n object. The new Notes & Reminders keys must be merged into that object — not imported from Note Clip's `App.I18n`.
2. Ministry-specific label names differ: "Return Visits / Revisitas", "Bible Studies / Estudios bíblicos", etc. These are not in Note Clip's i18n at all.
3. Ministry Tracker is bilingual by nature. All new keys must have both EN and ES translations at time of implementation — no EN-only placeholders.
4. Missing calendar i18n keys (`cal_overdue`, `cal_no_notes_day`, etc.) must be added.

---

### ACCESSIBILITY

#### Button Labels

- FAB has `aria-label="Add new"` (from index.html)
- Calendar day cells are `<button>` elements with `aria-label="{ds}"` (the date string)
- Category card delete/edit buttons use `title="Edit"` and `title="Delete"` — no `aria-label`
- Nav tabs have `aria-label` on each button (Dashboard, Notes, Lists, etc.)

#### Modal Focus Handling

- On modal open: `document.getElementById('note-title').focus()` and `document.getElementById('cat-name').focus()` — first input receives focus
- No focus trap implemented — Tab can leave the modal
- Escape key handler in `app.js` closes modals via `document.querySelector('.modal-backdrop')?.remove()`

#### Mobile Tap Targets

- Note card and category card are full-width tappable areas
- Color swatches are small (no explicit min size found in inspected code)
- Status tab buttons exist but no explicit min-height in the inspected JS
- Modal action buttons use `.btn` class — size depends on CSS
- `cal-day` cells in calendar are `<button>` elements — size depends on grid cell CSS

---

### RECOMMENDATIONS FOR MINISTRY TRACKER ADAPTATION

#### 1. Recommended Ministry Adaptation Approach

**Copy directly (structure and logic):**
- `addNote` / `updateNote` / `deleteNote` pattern → replicate as `addMinistryNote` / `updateMinistryNote` / `deleteMinistryNote`
- `addCategory` / `updateCategory` / `deleteCategory` with two-path delete → replicate as `addMinistryNoteCategory` etc.
- `generateId()` — reuse the same utility or Ministry Tracker's existing ID generator
- Status tab filter pattern
- Note card render pattern (adapt styles to Ministry Tracker theme)
- Category grid pattern
- Note modal section structure (title, body, priority, status, due date, reminder, appointment/location)
- Calendar day indicator pattern (`has-note` class on days with notes)
- Upcoming/overdue logic from `calendar.js`
- Reminder check pattern from `reminders.js` (Layer A in-app popup at minimum)

**Adapt (not copy directly):**
- Storage key — use Ministry Tracker's existing key, add `ministryNoteCategories` and `ministryNotes` to its state shape
- Category grid icons — use Ministry-appropriate icons/labels (Return Visits, Bible Studies, etc.) instead of Note Clip's icons
- i18n keys — merge into Ministry Tracker's existing i18n object, use Ministry-appropriate labels
- Cloud backup whitelist — add new arrays to Ministry Tracker's existing backup logic
- Calendar integration — wire `ministryNotes` into Ministry Tracker's existing calendar, which already has its own rendering logic
- Note modal status labels — adapt to ministry context (e.g. "Awaiting Response" = useful for return visits)
- Color palette — can reuse Note Clip's 6 pastel colors or adopt ministry theme colors
- FAB behavior — wire into Ministry Tracker's existing FAB or add a separate FAB for Notes tab

**Build fresh:**
- "Notes & Reminders" tab pane and bottom nav slot (replaces Log per Stage A)
- Ministry-specific default categories (8 preset)
- Ministry-appropriate empty states with bilingual text
- Calendar integration reading from `ministryNotes` rather than Note Clip's `notes`
- Any "add note from calendar day" flow (Note Clip doesn't have this — Ministry Tracker should)
- Search within notes (Note Clip has no user-facing search UI)
- `personName` and `phone` fields (not in Note Clip — needed for ministry return visits)

---

#### 2. Risks

| Risk | Severity | Description |
|------|----------|-------------|
| Service category collision | CRITICAL | Must NOT touch or rename `state.categories` — this array belongs to service logging. All new data goes in `ministryNoteCategories`. |
| Cloud backup whitelist | HIGH | `_cleanState()` equivalent in Ministry Tracker must be updated to include the two new arrays. |
| Export/import gap | HIGH | Ministry Tracker's export/import logic must be updated before notes are tested — otherwise notes will be silently dropped on import. |
| Cache version not bumped | HIGH | Service worker must be updated on every code change or users will see stale app. |
| `reminderAt` field absent from default | MEDIUM | The `reminderAt` field is not in `addNote()`'s default object — it must be explicitly added to the Ministry notes default shape. |
| Two-path category delete | MEDIUM | If implemented incorrectly, deleting a category could silently orphan notes or hard-delete them unintentionally. |
| Missing i18n keys | MEDIUM | `cal_overdue`, `cal_no_notes_day`, `cal_no_overdue`, `cal_nothing_due`, `cal_nothing_upcoming` must be added before calendar is tested. |
| No reopen/uncomplete flow | LOW | Note Clip has no "reopen completed note" UI. Ministry Tracker should decide if this is needed. |
| No search UI | LOW | Note Clip has no search in the notes pane. Ministry Tracker may want this for large contact lists. |
| `shared.js` tab not relevant | INFO | Skip entirely — not needed in Ministry Tracker. |
| `lists.js` not relevant | INFO | Skip entirely — not needed for Ministry Notes. |

---

#### 3. Reusable Components (Direct Reuse)

- `generateId()` pattern — reuse or use Ministry Tracker's existing equivalent
- `addNote / updateNote / deleteNote` CRUD pattern — reuse with field name prefix
- `addCategory / updateCategory / deleteCategory` CRUD pattern — reuse with prefix
- Status filter tab pattern (`buildStatusTabs()`)
- Note card render pattern (`buildNoteCard()`)
- Category grid render pattern (`buildCategoryGrid()`)
- Note modal structure with collapsed `<details>` sections for due date and appointment
- Color swatch picker pattern
- `_noteRows()` pattern from `calendar.js` for note lists in calendar sections
- `_reminderTime()` logic from `reminders.js` — exact timing calculation
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
  { id: 'mncat_rv',    name: 'Return Visits',         nameEs: 'Revisitas',            icon: '👤', color: '#BDD5EA' },
  { id: 'mncat_bs',    name: 'Bible Studies',          nameEs: 'Estudios bíblicos',    icon: '📖', color: '#C5E2C5' },
  { id: 'mncat_ip',    name: 'Interested Persons',     nameEs: 'Personas interesadas', icon: '🌱', color: '#F7D9B0' },
  { id: 'mncat_calls', name: 'Calls',                  nameEs: 'Llamadas',             icon: '📞', color: '#D4C5E2' },
  { id: 'mncat_msgs',  name: 'Messages',               nameEs: 'Mensajes',             icon: '✉️', color: '#F7F0B6' },
  { id: 'mncat_terr',  name: 'Territory',              nameEs: 'Territorio',           icon: '🗺️', color: '#BDD5EA' },
  { id: 'mncat_appt',  name: 'Appointments',           nameEs: 'Citas',                icon: '📅', color: '#F2C4B0' },
  { id: 'mncat_pers',  name: 'Personal',               nameEs: 'Personal',             icon: '📝', color: '#F7F0B6' },
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

#### 6. Proposed Implementation Order for Stages C–H

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

`COMPLETE — approved for Stage C planning`

**Note Clip files inspected:**
- js/storage.js ✅
- js/notes.js ✅
- js/calendar.js ✅
- js/dashboard.js ✅
- js/reminders.js ✅
- js/app.js ✅
- js/settings.js ✅
- js/firebase/cloud-sync.js ✅
- js/i18n.js ✅
- js/lists.js ✅
- sw.js ✅
- index.html ✅

**Files not retrieved (timed out, not critical for Stage B):**
- js/firebase/firebase-config.js (init config; App.Firebase.init() referenced in cloud-sync.js)
- js/communication.js (drafts/messaging; not relevant for ministry notes)
- js/push.js (FCM push layer; relevant for Stage F, not Stage C/D)
- js/onboarding.js (first-run flow; not needed for ministry adaptation)
