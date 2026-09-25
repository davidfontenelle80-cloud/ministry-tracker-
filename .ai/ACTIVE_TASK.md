# ACTIVE TASK

## Status
IMPLEMENTED ON FEATURE BRANCH — QA / REVIEW

## Task
Redesign the Ministry Notes area into three simple card-based sections and connect scheduled items to the Home dashboard and push-notification routing.

Requested by David in chat on 2026-09-25.

## Target workflow
Top tabs:
- **Notes / Notas**
- **Return Visits / Revisitas**
- **Bible Studies / Estudios bíblicos**

### Notes
- No category grid.
- One card per note.
- Card shows title/subject; note body stays private by default.
- Optional preview toggle.
- All / Today / Upcoming / Overdue filters.
- Date/time, configurable push reminder lead time, optional phone-calendar handoff.
- Completed/delete controls.
- Existing Calendar note taps continue to open the same note through the new editor.

### Return Visits
- Preserve the existing Revisita-style person/household workflow, address-first flow, GPS/map pin, history, reminders, calendar and navigation.
- Add contact actions: Call, Text, WhatsApp and Email when corresponding data exists.
- Email is stored separately so the existing Return Visit record format remains compatible with Revisita imports.
- Notification tap shows a small quick-action card first: Navigate, Call, Open full card.

### Bible Studies
- New dedicated tab using one card per student.
- Name, phone, email, address, material/publication, next lesson/topic and notes.
- Next study date/time, configurable push reminder lead time, repeat-weekly option and optional phone-calendar handoff.
- Call, Text, WhatsApp, Email, Directions and Calendar actions.
- Log Study flow records history and schedules the next study or ends the study.
- Existing notes in the old built-in Bible Studies category are migrated into Bible Study cards instead of being deleted.

### Home dashboard
- A compact Schedule & Reminders card automatically reads the same underlying records.
- Shows Overdue, Today and the next Upcoming items from Notes, Return Visits and Bible Studies.
- Hidden when there is nothing scheduled.
- Tapping an item opens the exact note/person/student record.

### Notifications
- Notes use source type `organizer-note` and open the exact note.
- Bible Studies use source type `bible-study` and open the quick-action card.
- Return Visits keep source type `revisit` and open the quick-action card before the full Return Visit card.
- Existing push infrastructure and Cloudflare worker are reused; no parallel reminder service was created.

## Data / migration
- Existing `ministryNotes` records are retained.
- Existing Bible Study notes (`mnc-2`) are migrated once to `ministryBibleStudies` and removed from the generic Notes list.
- Existing Notes categories are cleared because Notes is now card-based rather than category-based.
- `ministryBibleStudies` and `ministryContactMeta` live in the same Ministry state blob, so existing local persistence, export/import and cloud backup continue to include them.
- One-time push migrations move existing Note reminders to the new notification route.

## Files changed
- `js/organizer.js` — new organizer/UI/migration/dashboard/notification module.
- `js/push-config.js` — loads organizer module alongside the reusable push toggle.
- `sw.js` — precaches organizer module; cache version bumped to v89.
- `.github/workflows/encoding-check.yml` — adds Node syntax checks for organizer/PWA modules.
- `.ai/ACTIVE_TASK.md` — this tracker.

## Verification
- Local draft of organizer module passed `node --check` before upload.
- PR CI is configured to run:
  - encoding/mojibake check
  - `node --check js/organizer.js`
  - `node --check js/push-config.js`
  - `node --check sw.js`

## Real-device QA still required before calling the UX fully verified
1. Refresh/reopen installed PWA and verify three tabs in English and Spanish.
2. Notes: create title-only and detailed notes; verify private body, preview toggle, reminder, calendar, Today/Upcoming/Overdue and dashboard entry.
3. Return Visits: verify existing cards/map/address workflow still works; save email; verify Call/Text/WhatsApp/Email and notification quick card.
4. Bible Studies: create/edit/log/end a study; test weekly next-date behavior; test four contact actions, directions, reminder, calendar and dashboard entry.
5. Tap real push notifications for all three record types.
6. Verify Home agenda hides when empty and routes each item correctly.
7. Verify dark/light themes, iPhone Home Screen PWA and Android/desktop responsive behavior.

## Review
Supervisor: David
Review status: PENDING REAL-DEVICE QA
