---
title: "Ministry Tracker — Design & Architecture Bible"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
created: "2026-06-27"
status: "active planning reference"
supervisor: "App Supervisor / Builder Sol"
primary_tracker: "docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md"
handoff: "docs/stage-notes/2026-06-27-ministry-current-handoff-and-remaining-work.md"
weather_spec: "docs/stage-notes/2026-06-27-ministry-stage-j-weather-planning-widget.md"
---

# Ministry Tracker — Design & Architecture Bible

## Purpose

This document is the prep blueprint for the remaining Ministry Tracker work. It is designed so Codex/Cowork/Claude/ChatGPT can resume the project without relying on chat history.

This is documentation only. No app code was changed for this file.

## Current verified state

- Stages A–H are complete or code-complete based on prior supervisor review.
- Hotfix repaired the Stage F malformed regex crash and Stage G duplicate `var` regression.
- Stage H polish commit verified: `2483f8b`.
- Current verified cache: `ministry-tracker-v40-stage-h-qa-polish`.
- Stage I is next: Reminder Push Notifications / Notification Foundation.
- Stage J is planned after Stage I: Weather Planning Widget.

## Repo source-of-truth files

Read these first, in this order:

1. `docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md`
2. `docs/stage-notes/2026-06-27-ministry-current-handoff-and-remaining-work.md`
3. `docs/stage-notes/2026-06-27-ministry-stage-j-weather-planning-widget.md`
4. This file.

If the primary tracker and repo disagree, stop and update the primary tracker first.

## Product principles

- Ministry Tracker's main job is still field service time tracking.
- Notes, reminders, notifications, and weather support ministry planning; they should not dominate the app.
- New features should feel native to Ministry Tracker, not copied visually from another app.
- Preserve existing reports, timer, calendar, sessions, service categories, export/import, and cloud backup.
- Do not mix Ministry Notes data with service logging categories.

## Core data guardrails

Existing service category data:

```js
categories: []
```

is for service/session logging and reports only.

Ministry Notes data remains separate:

```js
ministryNoteCategories: []
ministryNotes: []
```

Never repurpose, rename, merge, or cross-wire these structures.

## Current remaining roadmap

### Stage I — Reminder Push Notifications / Notification Foundation

Status: next active stage.

Goal: make saved reminder date/time fields produce real, verified user notifications where browser/PWA support allows.

Must document approach before coding:

- Option A: Firebase Cloud Messaging with backend/scheduled trigger.
- Option B: Local browser notifications only.
- Option C: Hybrid approach.

Required outcomes:

- Permission request flow.
- Permission denied state.
- Permission granted state.
- Reminder scheduling.
- Reminder editing/rescheduling.
- Reminder deletion/cancellation.
- Completed/archived notes do not fire future reminders.
- Notification click opens the relevant note or app context.
- iOS/PWA limitations documented.
- EN/ES labels.
- Light/dark unaffected.
- Export/import unaffected.
- Cloud backup unaffected.
- Live verification.

### Stage J — Weather Planning Widget

Status: planned after Stage I.

Goal: add dashboard weather chip and tap-to-open weather modal/bottom sheet for current, hourly, 5-day, and optional 10-day planning.

Spec file:

`docs/stage-notes/2026-06-27-ministry-stage-j-weather-planning-widget.md`

GitHub issue:

`#1 — Stage J — Weather Planning Widget`

### Final Release QA

Status: after Stage I and J.

Goal: full release candidate audit.

Required outcomes:

- Mobile verified.
- Desktop verified.
- Light/dark verified.
- English/Spanish verified.
- Export/import verified.
- Cloud backup verified.
- GitHub Pages live verified.
- Temporary MD cleanup/removal only after David/Supervisor approval.

## UX standards

### Dashboard

Dashboard should remain calm and focused.

Priority order:

1. Greeting/status.
2. Quick chips.
3. Timer/progress card.
4. Main action buttons.
5. Secondary context.

Weather chip belongs in the quick-chip row, not as a large dashboard section.

### Modals and bottom sheets

Use existing Ministry Tracker modal/card style.

- Rounded corners.
- Existing theme variables.
- Clear close/cancel action.
- Mobile scroll support.
- No native `prompt()`.
- No fake success messages.

### Cards

Cards should use:

- Existing radius.
- Existing background variables.
- Subtle borders.
- Strong enough contrast in dark mode.
- No loud neon styling.

Stage H category card polish established the preferred pattern: keep accent color but use a subtle full-frame border in dark mode.

### Buttons and touch targets

- Use semantic buttons.
- Icon buttons require aria-labels.
- Minimum touch target should be comfortable on mobile.
- Destructive actions require confirm or undo.

## Reminder notification UX

### Note modal

Reminder controls should remain inside the note modal:

- Due date.
- Due time.
- Reminder toggle.
- Priority.
- Status.
- Completed.
- Archived.

### Notification prompt

Do not ask for notification permission too early.

Preferred flow:

1. User creates or edits a note.
2. User turns on reminder.
3. User selects date/time.
4. App explains notification permission is needed.
5. User taps enable notifications.
6. Browser permission prompt appears.

### Permission denied

If denied:

- Save the reminder data.
- Do not claim notification is scheduled.
- Show clear status: reminder saved, notification permission denied.
- Provide a way to retry or explain browser settings.

### iOS/PWA limitations

Document clearly. Do not promise behavior that iOS/Safari/PWA cannot support.

## Weather UX

### Home weather chip

Compact, calm chip:

```txt
🌤 64° Partly Cloudy
```

Optional expanded version:

```txt
🌤 64°  H:74 L:58
```

### Weather modal funnel

Open modal → show most useful information first.

Recommended order:

1. Current weather summary.
2. Field service insight.
3. Forecast tabs.
4. 5-day forecast default.
5. Hourly tab for same-day planning.
6. Optional 10-day tab only if accurate and provider supports it.

### Weather API preference

Prefer no-key/public-safe provider if possible because GitHub Pages is static.

Likely best first candidate: Open-Meteo style provider, because it can avoid exposing a private API secret.

If a provider requires a private key, do not place that key in frontend code. Use a backend/proxy approach or choose a different provider.

## Suggested file responsibilities

Current app appears mostly centered around `js/app.js`. Future work should be surgical.

Potential files:

- `js/app.js` — existing state/UI logic.
- `sw.js` — cache and possible notification service worker work.
- `index.html` — only if script/container changes are needed.
- CSS files — only if styles cannot safely remain in existing patterns.
- stage notes MD files — must be updated after each stage.

Avoid broad refactors unless required to fix a verified defect.

## QA master checklist

Before final approval:

- App loads.
- No console errors.
- Home works.
- Timer works.
- Calendar works.
- Notes & Reminders works.
- Reports works.
- Existing service categories unchanged.
- Existing report totals unchanged.
- Credit hours unchanged.
- Log History works inside Reports.
- Add/edit/delete categories.
- Add/edit/delete notes.
- Calendar note panel works.
- Adding note from calendar works.
- Reminder fields save.
- Reminder notifications verified if implemented.
- Weather chip/modal verified if implemented.
- Mobile verified.
- Desktop verified.
- Light mode verified.
- Dark mode verified.
- English verified.
- Spanish verified.
- Export/import verified.
- Cloud backup verified.
- GitHub Pages verified.
- Cache version current.

## Release gates

### Gate 1 — Stage I Approval

Do not approve unless notification behavior is honestly documented and tested.

If true background push cannot be guaranteed, record limitation and do not market it as full push notifications.

### Gate 2 — Stage J Approval

Do not approve unless weather data is real, API approach is safe, and offline/error states do not break Home.

### Gate 3 — Final Release

Do not delete temporary MD until:

- Feature complete.
- QA complete.
- Mobile verified.
- Desktop verified.
- Light/dark verified.
- English/Spanish verified.
- Export/import verified.
- Cloud backup verified.
- GitHub Pages live approved.
- Final summary recorded.

## Boilerplate improvement candidates

Potential reusable systems for KHub Boilerplate:

- Notification permission/service abstraction.
- Weather chip/modal abstraction.
- Better service worker cache/version dashboard.
- Standard stage tracker template.
- Standard QA report template.
- Shared bottom-sheet modal component.
- Shared mobile chip row component.
- Shared offline/last-updated status component.

## Known project risks

- Primary tracker frontmatter may still be stale.
- Stage I can be overpromised if browser/PWA/iOS limitations are ignored.
- Weather providers with private keys are unsafe on plain GitHub Pages.
- Large `js/app.js` makes syntax mistakes easier; require `node --check js/app.js` before every deploy.
- Service worker cache can make live app look stale even when repo is correct.

## Required worker report format

Every remaining stage report must include:

- Summary.
- Commit hashes.
- Files changed.
- Tests run.
- Cache before/after.
- Screenshots if UI changed.
- Mobile verification.
- Desktop verification.
- Light verification.
- Dark verification.
- English verification.
- Spanish verification.
- Export/import verification.
- Cloud backup verification.
- GitHub Pages verification.
- Known issues.
- Remaining risks.
- MD updated confirmation.
- Current completion percentage.
- Next authorized stage.

## Final note

The next worker should not start from chat memory. Start from the repo and these MD files.
