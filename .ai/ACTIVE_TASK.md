# ACTIVE TASK

## Status
READY FOR REVIEW

## Task
Integrate the standalone Revisita workflow into Ministry Tracker under the existing Notes screen as a separate **Notes | Revisits** experience.

Requested by David in chat on 2026-09-25 with explicit authorization to implement.

## Scope delivered
- Keep ordinary Ministry notes intact and separate from revisit records.
- Add a simple Revisits experience with Today, Map, and All views.
- GPS "use my location" flow plus tap-to-place and moveable map pins.
- OpenStreetMap map with active/today/all/nearby filters.
- Return-visit cards with Call, Directions, Open, and Log Visit actions.
- Visit history, what was left, next topic, and quick +1 week / +2 weeks / +1 month rescheduling.
- Add-to-calendar workflow with iPhone/ICS alarms and Google Calendar handoff.
- Optional 5-minute app push reminder using Ministry's existing notification infrastructure.
- Include revisit state automatically in Ministry's existing local/cloud backup payload.
- One-time import option for data already stored by the standalone Revisita app on the same origin.
- English/Spanish UI and dark/light theme compatibility.
- Cache new assets and viewed OpenStreetMap tiles in the PWA service worker.

## Files changed
- index.html
- css/revisits.css
- js/revisit-map.js
- js/revisits.js
- sw.js
- .ai/ACTIVE_TASK.md

## Verification completed
- Classic JavaScript syntax compilation passed for js/revisit-map.js.
- Classic JavaScript syntax compilation passed for js/revisits.js.
- Service worker syntax compilation passed after cache-list validation.
- Branch is based directly on current main and has no base divergence.
- Confirmed index.html includes the new stylesheet, Notes/Revisits selector, and both revisit scripts.
- Confirmed existing Ministry cloud backup serializes the entire ministry-tracker-v4 state, so revisit state is included without a second cloud store.

## Still needs real-device smoke test
This chat environment cannot exercise iPhone GPS permission prompts, launch the native Calendar app, or receive a real Web Push notification. On the deployed build, verify:
1. Notes still works normally.
2. Revisits -> New -> Here requests GPS and opens the new-visit form.
3. Revisits -> Map allows tap/confirm/move pin.
4. Calendar opens with the correct visit/date and a 5-minute alarm in ICS mode.
5. A timed visit with the app-reminder checkbox schedules and receives the push notification.
6. Dark/light and EN/ES both render correctly.

## Review
Supervisor: David
Review status: NOT REVIEWED
