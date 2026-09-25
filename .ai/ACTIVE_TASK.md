# ACTIVE TASK

## Status
READY FOR REVIEW

## Task
Bring the integrated Ministry Return Visits experience closer to the standalone Revisita workflow, especially GPS/location behavior, manual address entry, verification, and navigation handoff.

Requested by David in chat on 2026-09-25 with explicit authorization to implement.

## Scope delivered
- Return Visits requests the device location automatically the first time the Revisits experience is opened during an app session.
- When permission is granted, the map opens centered on the user's current GPS position.
- Tapping **Use my location** always makes a fresh browser geolocation request so the browser/OS can prompt for permission when needed.
- GPS-created visits now go through the same map confirmation step as manually placed pins instead of skipping verification.
- The confirmation panel shows the reverse-geocoded address, coordinates, and GPS accuracy when available.
- Added **Enter an address** when creating a revisit.
- Manual address search geocodes the address and then requires visual pin verification on the map before the visit form opens.
- Existing revisit addresses can be re-searched on the map to move/verify the saved pin.
- Address/location text on revisit cards is tappable and starts the navigation flow.
- Directions can launch Google Maps, Apple Maps, or Waze.
- By default the navigation popup asks which map app to use; the user can remember a choice for future taps.
- Existing Today / Map / All views, visit history, calendar handoff, push reminder, import and cloud-backup behavior remain intact.
- PWA cache version bumped so installed devices receive the updated revisit code and styles.

## Files changed
- js/revisits.js
- css/revisits.css
- sw.js
- .ai/ACTIVE_TASK.md

## Verification completed
- Classic JavaScript syntax compilation passes for js/revisits.js.
- Service worker syntax compilation passes.
- Confirmed manual address search, GPS confirmation, navigation chooser, and tappable-location handlers are present on the feature branch.
- This branch starts from current main.

## Real-device smoke test still recommended
1. Open Notes -> Return Visits on iPhone/Android and verify the browser/OS location permission appears when permission has not yet been granted.
2. Confirm the map centers on the current location after permission is granted.
3. Tap **Use my location**, verify the accuracy/address/coordinates, then confirm the pin.
4. Create a revisit by manually entering an address and verify the map pin before saving.
5. Tap a saved address/location and verify the Google Maps / Apple Maps navigation chooser.
6. Check that remembering a navigation app sends later taps directly to that app.
7. Verify existing calendar and 5-minute push reminder behavior still works.

## Review
Supervisor: David
Review status: NOT REVIEWED
