# Recurring organizer schedules

Optional recurrence is shared by Notes (including reminders), Bible Studies, and Return Visits. Existing records remain one-time appointments. The former study `repeatWeekly` flag remains a logging hint and is not silently converted to an automatic series.

## Controls

In each editor, choose Does not repeat, Daily, Weekly, or Monthly; an interval of 1–12; an optional end date; and a time zone. The date selects the weekday/day of month. Monthly schedules skip months without that day. Time zones use IANA names, initially the device's zone. Timed reminders require a notification subscription and permission.

Existing series default date/time edits to **This occurrence only**. Choose **Change the future schedule** to restart the future schedule at the selected date/time. Changing frequency, interval, or time zone likewise restarts the schedule. Changing only the end date preserves exceptions.

The detail card offers **Manage repeating schedule**:

- Move one occurrence without changing later dates.
- Skip one occurrence.
- Pause or resume the regular schedule.
- While paused, optionally schedule one appointment; the regular schedule stays paused.
- Stop repeating and retain the selected one-time date (or no date).

Completing a recurring note or logging a recurring study/visit completes that occurrence and suggests the next one. Ending a return visit completes the entire record. Recurring notification actions carry the original occurrence key so a late notification does not complete a later session.

## Calendar and push

The existing subscribed Ministry calendar automatically receives schedule changes through `saveState`. The Worker expands recurring schedules on **each calendar fetch**, from 60 days ago through 400 days ahead. It uses stable UIDs per original occurrence. A move updates that occurrence; a skip/pause removes it. The rolling horizon extends without reopening the app. Times are calculated in the schedule's time zone and emitted as UTC. Existing one-time events keep their previous floating-time behavior. Calendar updates remain subject to the phone's subscription refresh schedule. The feed has no calendar alarms by default; alerts still come from Ministry push.

The push Worker keeps the rule and exceptions with the pending reminder. After successful delivery it queues the next occurrence. Reminder and due-bucket TTLs extend to cover dates beyond the old 28-day retention. It checks the reminder revision before delivery and again before requeueing so observed intervening edits/deletes are not resurrected. Transient failures are indexed for another attempt. The browser serializes updates per record and journals failed changes/deletions locally, retrying on app load, foregrounding, and returning online.

Daylight saving: the selected wall-clock time is maintained. A nonexistent spring-forward time shifts forward by the gap for that occurrence; an ambiguous fall-back time uses the first instance. Later dates keep the chosen wall-clock time.

## Validation and release

Run:

```sh
node --test cloudflare/ministry-tracker-push/test/*.test.mjs
node scripts/check-encoding.mjs .
# Start a localhost-only preview, then use a disposable, isolated browser:
python -m http.server 8765 --bind 127.0.0.1
node tests/recurrence-browser.mjs
```

The browser test needs Playwright and Chromium. `MINISTRY_CHROME` can point at an existing Chromium binary; `CODEX_PRIMARY_RUNTIME_NODE_MODULES` is optional. External requests are blocked, so no real visits, pushes, or calendar feeds are used.

Ship both the Worker and frontend together: **deploy the Worker first**, then publish the frontend/cache update. An older Worker cannot continue recurring reminders after the first delivery. Use disposable test records for a phone acceptance test before relying on real reminders. This branch does not deploy anything or migrate phone data.

## Existing infrastructure limits

The existing push store is Cloudflare KV, not a transactional queue. Revision checks prevent observed stale requeues; they do not provide atomic compare-and-swap or exactly-once push delivery under simultaneous Worker executions or eventual consistency. The due-bucket scanner retains the existing ten-minute lookback; a Worker outage longer than that can miss the queued delivery until it is resynchronized. The calendar feed remains device-owned, and cloud backup remains full-state backup rather than live multi-device synchronization. These existing boundaries are unchanged by recurrence.
