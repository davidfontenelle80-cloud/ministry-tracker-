# ACTIVE TASK

## Status
READY FOR REVIEW

## Task
Unify Ministry's follow-up workflow around three simple card-based areas — Notes, Return Visits, and Bible Studies — and feed anything scheduled into the Home dashboard.

Requested by David in chat on 2026-09-25.

## Product decisions implemented
- The top of Notes & Reminders now has three tabs:
  - **Notes / Notas**
  - **Return Visits / Revisitas**
  - **Bible Studies / Estudios bíblicos**
- Notes are now flat cards, not category-first.
- Note cards show the title/subject and schedule only; the note body stays private until the card is opened.
- Return Visits keep the Revisita-style person card and map/address workflow.
- Bible Studies use the same person-card pattern as Return Visits, but with study-specific fields and history.
- Anything scheduled in Notes, Return Visits, or Bible Studies feeds the Home **Today's agenda** card.

## Notes
- Add Note creates one card directly; there is no category selection in the new Notes UI.
- Filters: Today, Upcoming, Overdue, All.
- Full note card supports:
  - large note body
  - due date/time
  - arbitrary push reminder lead time in minutes
  - one-tap Set Reminder
  - Add to Calendar
  - iPhone ICS calendar alarm when a reminder is enabled
  - Complete/Reopen
  - Edit
  - Delete
- Existing Ministry note data is preserved and reused.
- Existing Calendar note taps now open the new note card workflow through the overridden note opener.

## Return Visits
- Existing GPS / typed-address / map-pin / move-pin workflows remain.
- Existing card-first workflow remains: opening a person shows the action/detail card; Edit is a separate action.
- Added contact support:
  - Call
  - Text
  - WhatsApp
  - Email
- Added Email field to Return Visit data and editor.
- Push reminder lead time is now configurable per Return Visit instead of fixed at 5 minutes.
- Return Visit changes refresh the Home agenda immediately.
- Tapping a Return Visit push notification now opens a small reminder card first with:
  - Navigate
  - Call
  - Full Card
- Full Card then opens the normal Return Visit detail card.

## Bible Studies
- New dedicated `state.ministryBibleStudies[]` collection.
- One card per student.
- Filters: Today, Upcoming, Overdue, All.
- Student fields:
  - name
  - phone
  - email
  - address
  - study notes
  - publication/material
  - lesson/chapter
  - next date/time
  - weekly-repeat preference
  - custom reminder minutes
  - study history
- Detail card actions:
  - Call
  - Text
  - WhatsApp
  - Email
  - Directions
  - Log Study
  - Calendar
  - Set Reminder
  - Edit
  - Delete
- Logging a study stores a dated history entry and can advance the next study date.
- Weekly studies prefill the next date one week later when logging.
- Device calendar:
  - iPhone/iPad uses ICS
  - other platforms use Google Calendar create links
  - iPhone ICS includes a custom VALARM reminder when enabled
- Push notifications use sourceType `bible-study`.
- Tapping a Bible Study push notification opens the same quick reminder card pattern: Navigate / Call / Full Card.
- Active Bible Study reminders are restored on startup only when notification permission is already granted, so startup never triggers an unsolicited permission prompt.

## Home dashboard
- Added **Today's agenda** near the top of Home.
- Pulls from:
  - Notes
  - Return Visits
  - Bible Studies
- Shows:
  - Today
  - Overdue
  - next Upcoming items
- Each dashboard row opens its exact underlying card; no duplicate records are created.

## Shared behavior
- Ministry remains the source of truth for language, theme, app install, local storage, export/import, and cloud backup.
- Bible Studies was added to APP_CONFIG defaults so migration/reset behavior is safe.
- Full-state backup/export automatically includes Bible Studies.
- Return Visit and Bible Study navigation respects the saved Return Visit navigation preference where applicable.
- Notification routing continues through the existing service worker sourceType/sourceId mechanism.
- PWA cache bumped to **v89-organizer-studies-dashboard** and organizer JS/CSS are precached.

## Files changed
- index.html
- css/organizer.css (new)
- js/organizer.js (new)
- js/app.js
- js/revisits.js
- sw.js
- .ai/ACTIVE_TASK.md

## Verification completed
- js/app.js classic JavaScript syntax passes.
- js/revisits.js classic JavaScript syntax passes.
- js/organizer.js classic JavaScript syntax passes.
- sw.js classic JavaScript syntax passes.
- Organizer dialog references were checked against generated dialog IDs; no missing IDs found.
- index.html contains:
  - three top tabs
  - Bible Studies content root
  - Home agenda root
  - organizer CSS
  - organizer JS
- Push backend accepts arbitrary sourceType values, so `bible-study` uses the existing reminder API without worker changes.

## Real-device smoke test recommended
1. Notes tab:
   - Add a note
   - verify only its title is visible in the list
   - open full note
   - set date/time and custom reminder
   - add to Calendar
2. Return Visits:
   - verify existing address/map workflow still works
   - add phone + email
   - test Call, Text, WhatsApp, Email
   - set a non-5-minute reminder
3. Bible Studies:
   - create a student
   - test all four contact actions
   - set schedule/reminder
   - add to Calendar
   - log a study and verify history/next date
4. Home:
   - verify all three scheduled record types appear in Today's agenda
   - tap each and confirm the exact card opens
5. Push:
   - trigger one Return Visit reminder and one Bible Study reminder
   - tap notification
   - verify quick card shows Navigate / Call / Full Card
6. English / Spanish, light / dark, and iPhone Home Screen PWA.

## Review
Supervisor: David
Review status: NOT REVIEWED


## Person-card entry refinement — 2026-09-25
- New Return Visit and Bible Study entry forms now lead with the same core person information:
  1. Name
  2. Phone number
  3. Address
  4. Schedule
  5. Optional type-specific details
- Phone is recommended, not required. The form explains that adding it enables Call, Text, and WhatsApp after saving.
- First-time entry screens do not show contact/navigation actions before a record exists.
- Saved person cards only show actions supported by the information actually present:
  - Call/Text/WhatsApp only when there is a usable phone number
  - Email only when there is an email address
  - Directions / map navigation only when there is an address or map pin
- A missing phone number produces a small **Add phone** prompt on saved Return Visit and Bible Study cards. It opens Edit and focuses the phone field.
- Return Visit descriptive house references remain visible, but are no longer treated as a navigation destination unless an address or pin exists.
- Return Visit list cards no longer show Directions when no address/pin exists.
- Bible Study cards no longer show empty contact controls.
- Regular Notes remain note/reminder cards rather than person/contact cards, so phone/address logic does not apply to Notes.
- PWA cache bumped to **v91-person-card-entry**.

### Verification
- js/revisits.js syntax passes.
- js/organizer.js syntax passes.
- sw.js syntax passes.
- Static order checks confirm both person forms place Name → Phone → Address before schedule/optional details.
- Static checks confirm Return Visit directions are conditional and both person types have missing-phone prompts.


## Today + overdue + reminder action refinement — 2026-09-25
- Notes still open on **Today** by default.
- The Today view now renders in two visual groups:
  1. today's notes, sorted by due date/time
  2. **Needs Attention** directly underneath for overdue notes
- Overdue note cards use an amber/orange attention treatment and show the original due date/time.
- The Overdue filter shows a small count badge when overdue items exist.
- Mobile filter tabs keep their text labels visible instead of relying on icons alone.
- Other filters remain available: Today, Upcoming, Overdue, All.
- Push notification workflow now supports:
  - **Done** for Notes
  - **Log Visit** for Return Visits
  - **Log Study** for Bible Studies
  - **Snooze 15m**
  - **Dismiss**
- Dismiss closes the notification/quick card without deleting or completing the underlying record.
- Snooze schedules a fresh push 15 minutes later and keeps the record in its existing Today/Overdue position.
- Tapping a normal notification opens the in-app quick reminder card for Notes, Return Visits, and Bible Studies.
- Native notification action buttons are supplied when the platform supports Web Push actions; if the OS does not display them, the in-app quick card provides the same controls.
- Return Visit and Bible Study snooze state is preserved so subsequent reminder sync does not overwrite a future snooze.
- PWA cache bumped to **v92-today-reminder-actions**.

### Verification targets
- Today notes sort by time and overdue notes render underneath.
- Overdue cards and badge use amber/orange attention styling.
- Mobile filter labels remain readable.
- Normal notification tap opens a quick card.
- Note Done marks the note complete.
- Return Visit Done routes to Log Visit.
- Bible Study Done routes to Log Study.
- Snooze 15m reschedules without changing the record's due date/time.
- Dismiss closes the alert and leaves the record untouched.
