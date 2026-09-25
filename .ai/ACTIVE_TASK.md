# ACTIVE TASK

## Status
READY FOR REVIEW

## Task
Streamline Notes now that Return Visits has its own dedicated tab, and make the Return Visit workflow address-first with the map optional.

Requested by David in chat on 2026-09-25.

## Scope delivered
- Removed the old built-in **Return Visits / Revisitas** category from Notes.
- Existing notes that were stored in that old category are preserved and moved to **All Notes / no category**.
- Removed developer-only **Test Push** and **Push diagnostics** controls from the normal Notes UI.
- Updated Notes helper text so Notes is clearly for general ministry notes, while Return Visits is separate.
- A Return Visit can now be saved with a typed address **without requiring a map pin**.
- New address flow:
  - type the address
  - **Continue** directly to the person/household Return Visit form
  - or choose **Find on map** to locate/verify a pin
- **Find on map** now always produces a visible outcome:
  - best address match opens on the map for pin verification
  - if no match is found, the map opens so the user can place the pin manually
- Address-only Return Visits can still use Directions / navigation from the app; Google Maps, Apple Maps, and Waze receive the saved address when no GPS pin exists.
- Address-only Return Visits continue to support:
  - person/household name
  - notes
  - phone / WhatsApp
  - next topic
  - visit history
  - return date/time
  - app reminder
  - calendar handoff
- Calendar events no longer generate fake 0,0 coordinates when a Return Visit has only an address.
- Map views show only Return Visits that actually have a pin.
- Existing address-only Return Visits can later be geocoded, viewed on the map, and assigned/moved to a pin.
- PWA cache bumped to v88.

## Files changed
- js/app.js
- js/revisits.js
- sw.js
- .ai/ACTIVE_TASK.md

## Verification completed
- js/app.js syntax passes.
- js/revisits.js syntax passes.
- sw.js syntax passes.
- Old default Return Visits Notes category is no longer present.
- Notes Test Push / diagnostics button markup is no longer present.
- Safe migration for notes formerly in mnc-1 is present.
- Address-only Return Visit normalization, address-based navigation, optional-map address flow, and pinned-only map filtering are present.

## Real-device smoke test recommended
1. Notes: verify the old Return Visits category and debug buttons are gone, while old notes remain in All Notes.
2. Return Visits -> New -> Enter an address -> Continue: verify the full person/household form opens immediately.
3. Save an address-only Return Visit with name, notes, date/time and reminder.
4. Reopen it and start Directions with Apple Maps or Google Maps.
5. Add it to Calendar and confirm the saved address appears correctly.
6. Return Visits -> New -> Enter an address -> Find on map: verify the map opens with a pin or manual placement fallback.
7. Create with GPS and with a manually dropped pin; verify those flows remain unchanged.

## Review
Supervisor: David
Review status: NOT REVIEWED
