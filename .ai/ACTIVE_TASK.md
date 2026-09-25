# ACTIVE TASK

## Status
READY FOR REVIEW

## Task
Bring Ministry Return Visits to functional parity with the important workflows in the standalone Revisita app, with special attention to manual address entry, pin placement, the Return Visit detail sheet, reminders, navigation, import/export, and Return Visit-specific settings.

Requested by David in chat on 2026-09-25.

## Scope delivered
- New Return Visit chooser now clearly offers:
  - **Here — use my location**
  - **Enter an address**
  - **Choose on the map**
- Manual address entry now supports:
  - browser/mobile street-address autofill
  - saved-address suggestions from existing Return Visits
  - up to five address matches instead of silently taking the first result
  - location-biased search when the user's GPS position is available
  - manual fallback to place the typed address on the map
  - map verification before the Return Visit is created
- Manually entered addresses remain authoritative when the user adjusts the pin.
- GPS and map-created Return Visits still reverse-geocode the pin automatically.
- Added explicit **Adjust location** during pin confirmation.
- Existing pins can be moved and return to the editor afterward.
- Opening an existing Return Visit now shows a Revisita-style detail sheet instead of dropping straight into edit mode.
- Detail sheet includes:
  - name/location and schedule
  - notes, what was left, next topic and phone
  - Call and WhatsApp
  - Directions
  - Log Visit
  - Calendar
  - Set 5-minute reminder
  - Share
  - View on map
  - Edit
  - visit history
- New/edit form now follows the standalone Revisita hierarchy more closely:
  - name
  - house/reference description
  - quick scheduling
  - date/time
  - app reminder
  - collapsible optional details
- Return Visit settings now include:
  - add to calendar on save
  - calendar app
  - calendar alarm: at time / 5 / 15 / 30 / 60 / 120 minutes
  - default 5-minute app reminder
  - enable notifications
  - test notification
  - navigation app
  - same-origin import from standalone Revisita
  - import from a Revisita JSON backup file
  - export Return Visits in Revisita-compatible JSON
  - privacy/data explanation
  - delete all Return Visits
- Imported Revisita data also brings over compatible navigation/calendar settings.
- Added **Save area offline** to pre-cache the visible Return Visit map area for rural/offline use.
- Ministry remains responsible for shared app-wide concerns instead of duplicating them:
  - theme
  - language
  - installation
  - Ministry cloud backup/account
- PWA cache bumped to v87 so installed devices receive the new Return Visit code and styles.

## Files changed
- js/revisits.js
- css/revisits.css
- sw.js
- .ai/ACTIVE_TASK.md

## Verification completed
- js/revisits.js compiles as classic JavaScript.
- js/revisit-map.js compiles as classic JavaScript.
- sw.js compiles as classic JavaScript.
- Every dialog(...) ID referenced by js/revisits.js exists in the generated dialog markup.
- Manual address flow, map verification, detail sheet, settings controls, import/export and navigation handlers are present on the feature branch.

## Real-device smoke test recommended
1. Open Notes & Reminders -> Return Visits.
2. Create a Return Visit by address:
   - type a street address
   - verify browser autofill / saved-address suggestions
   - press Search
   - select the correct match
   - confirm/adjust the map pin
   - verify the full New Return Visit sheet appears with name, reference, schedule, reminder and details.
3. Create a Return Visit with GPS and with a manually dropped pin.
4. Open a saved Return Visit from a list card and from a map marker; confirm the detail sheet appears.
5. Test Call, WhatsApp, Directions, Calendar, Set Reminder, Share, View on Map and Edit.
6. Edit a saved address and move its pin.
7. Import a standalone Revisita JSON export and verify visits/settings merge correctly.
8. Test notification permission and test notification on iPhone Home Screen PWA and Android.
9. Test Save area offline and reopen the map without network access.

## Review
Supervisor: David
Review status: NOT REVIEWED
