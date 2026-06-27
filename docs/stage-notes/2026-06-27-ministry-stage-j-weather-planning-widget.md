---
title: "STAGE J — Weather Planning Widget"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
status: "planned"
created: "2026-06-27"
owner: "David"
supervisor: "App Supervisor / Builder Sol"
source_tracker: "docs/stage-notes/2026-06-23-ministry-notes-categories-calendar-plan.md"
current_authorized_stage_before_this: "Stage I — Reminder Push Notifications / Notification Foundation"
next_after_stage_i: "Stage J — Weather Planning Widget"
implementation_status: "planning/spec only — no app code changed"
---

# STAGE J — Weather Planning Widget

## Status

`planned — do not start until Stage I reminder notifications are approved`

This file exists so the weather scope is not lost while Codex/Cowork/ChatGPT sessions rotate.

Stage J is a future enhancement after the reminder notification work. It must not be mixed into Stage I.

## User-approved concept

David approved the weather concept as a Ministry Tracker dashboard enhancement:

- Add a compact weather chip to the Home dashboard.
- The chip should feel native to the current dark/light Ministry Tracker design.
- The chip should be similar in spirit to the Note Clip weather/status chip, but adapted to Ministry Tracker.
- Tapping the chip opens a modal or bottom sheet with consolidated weather details.
- The modal should help the user plan ministry activity by hour and by week.

## Product goal

Give the user quick, ministry-relevant weather awareness without disrupting the core purpose of the app: logging field service time.

The weather feature should help answer:

- Is the weather good for walking territory today?
- Should I go out earlier or later?
- Is rain likely later today?
- What does the next 5 days look like?
- Should I plan calls/visits around heat, rain, wind, or storms?

## Home dashboard chip

### Placement

Preferred placement: Home dashboard quick-chip row near:

- `Log yesterday →`
- `time to hit week`
- monthly/goal chip

The weather chip should not push the timer/progress card too far down. If horizontal space is tight, it may live in the horizontal chip scroller.

### Chip content

Show compact current conditions:

- Weather icon
- Current temperature
- Short condition
- Optional high/low if space allows

Example:

```txt
🌤 64° Partly Cloudy
```

Expanded example when space allows:

```txt
🌤 64°   Partly Cloudy
H: 74°  L: 58°
```

### Chip behavior

- Entire chip is tappable.
- Tapping opens weather details modal/bottom sheet.
- If data is stale/offline, show last updated text or offline state.
- Do not make weather the primary dashboard focus.

## Weather modal / bottom sheet

### Default view

When opened, the modal should default to a concise planning view with:

- Current temperature
- Current condition
- Feels like
- High / low
- Humidity
- Wind
- Rain chance
- Short daily summary
- Field service condition insight
- 5-day forecast row/list

### Forecast tabs / funnel

The modal should funnel information from simplest to deeper:

1. **Today summary** at the top.
2. **Field Service Insight** directly under current conditions.
3. **Forecast tabs** below that:
   - `5-Day` default
   - `Hourly`
   - `10-Day` optional if supported by the chosen API

Recommended tab behavior:

- Open modal → show `5-Day` by default because it helps weekly planning.
- Tap `Hourly` → show hour-by-hour forecast for today.
- Tap `10-Day` → show extended outlook if API supports it.

### 5-day forecast

Default forecast view.

Each day should show:

- Day label
- Weather icon
- Condition
- High / low
- Rain chance if meaningful
- Tappable row or card if later expansion is desired

Example:

```txt
Fri  🌤  Partly Cloudy       74° / 58°
Sat  ☀️  Sunny               78° / 60°
Sun  🌦  Scattered Showers   72° / 56°   30%
Mon  🌤  Partly Cloudy       75° / 59°
Tue  🌤  Mostly Sunny        76° / 60°
```

### Hourly forecast

Hourly forecast should support planning the same day.

Each hour should show:

- Time
- Icon
- Temperature
- Condition
- Rain chance, if available
- Wind, if space allows

Example:

```txt
Now   🌤 64° Partly Cloudy
8 AM  🌤 66° Partly Cloudy
9 AM  🌤 68° Partly Cloudy
10 AM ☀️ 70° Sunny
11 AM ☀️ 72° Sunny
12 PM ☀️ 74° Mostly Sunny
```

### 10-day forecast

Optional. Only include if API and UI support it cleanly.

Do not fake 10-day data. If only 7 or 8 days are available, label it accurately.

## Field service planning insight

Add a small ministry-specific insight panel. It should be helpful but not overpromising.

Examples:

```txt
Good conditions for field service
Comfortable with low wind and low rain chance.
```

```txt
Rain expected after 3 PM
Plan walking territory earlier if possible.
```

```txt
Hot afternoon
Consider earlier morning activity and bring water.
```

```txt
Windy conditions
Consider calls, visits, or indoor plans if needed.
```

Possible inputs:

- Temperature
- Feels-like temperature
- Rain chance
- Wind speed
- Severe weather flag if available
- UV index if available

## Location behavior

### Preferred flow

1. Ask user for location permission when weather is first used.
2. If granted, use current location.
3. Save only the minimum needed preference/last weather data.
4. Refresh weather within cache rules.

### Permission denied fallback

If permission is denied:

- Show manual city/ZIP entry.
- Let user save fallback location.
- Do not nag the user repeatedly.

### Offline / failure behavior

If weather cannot refresh:

- Show last known weather if available.
- Show `Last updated` timestamp.
- Show a gentle offline message.
- Do not block the app.
- Do not break Home dashboard.

## Data provider / API decision

Before coding Stage J, choose and document the provider.

Options to evaluate:

### Option A — Open-Meteo or similar no-key API

Pros:

- No private API key in frontend.
- Better fit for GitHub Pages.
- Safer for static hosting.

Cons:

- May need weather-code mapping for icons/conditions.
- Feature set may be simpler than paid weather providers.

### Option B — OpenWeatherMap / WeatherAPI style provider

Pros:

- Familiar weather data model.
- Current/hourly/daily data available depending on plan.

Cons:

- Private API key should not be exposed in GitHub Pages frontend.
- May require proxy/backend or restricted key strategy.

### Option C — Backend/proxy approach

Pros:

- Protects API secrets.
- Allows caching and provider abstraction.

Cons:

- Adds backend complexity.
- Needs deployment and maintenance.

## Security guardrail

Because Ministry Tracker is hosted on GitHub Pages/static frontend, do not expose private API secrets in frontend code.

If the provider requires an API key, document a safe approach before implementation.

## Suggested data model

Keep weather state separate from Ministry note/session/report data.

Suggested state:

```js
weather: {
  enabled: false,
  locationMode: 'auto', // auto | manual
  manualLocation: '',
  units: 'imperial',
  lastCoords: null,
  lastUpdated: null,
  current: null,
  hourly: [],
  daily: [],
  provider: null,
  permissionState: null
}
```

Migration must be safe for existing users.

Do not alter existing:

- `sessions`
- `categories`
- `ministryNoteCategories`
- `ministryNotes`
- reports/credit data

## Caching strategy

- Cache successful weather response for 30–60 minutes.
- Do not call provider every render.
- Refresh when:
  - weather chip/modal opens and cache is stale
  - user pulls/taps refresh
  - app starts and stale data exists, if lightweight
- Use last known data offline.

## i18n / language

Support English and Spanish labels.

Required labels include:

- Weather
- Weather Today
- Feels Like
- High
- Low
- Humidity
- Wind
- Rain Chance
- Hourly
- 5-Day
- 10-Day
- Last Updated
- Use Current Location
- Enter City or ZIP
- Good conditions for field service
- Rain expected later
- Hot afternoon
- Updated minutes ago

## Light / dark mode

- Must match existing Ministry Tracker theme.
- Use CSS variables where possible.
- No hard-coded colors that break dark/light mode.
- Modal and chip should use existing card radius, shadow, spacing, and focus styles.

## Accessibility

- Weather chip must be keyboard/focus accessible.
- Weather chip needs aria-label with current condition.
- Modal needs close button and focus handling.
- Icons cannot be the only source of information.
- Forecast tabs must be readable by screen readers.

## Files likely involved

Stage J may touch:

- `js/app.js`
- `sw.js`
- possibly `index.html`
- possibly CSS files if weather-specific styles should not be inline
- this stage note / primary temporary MD

Do not touch unrelated files.

## Guardrails

- Do not begin Stage J before Stage I is approved.
- Do not break timer/report/calendar/notes flows.
- Do not expose API secrets.
- Do not claim GPS/weather works without testing permission granted and denied paths.
- Do not fake 5-day/10-day data.
- Do not make weather required for using the app.
- Do not block app startup on weather failure.
- Do not mix weather state with ministry notes or service categories.

## Stop conditions

STOP if:

- API key would be exposed in frontend.
- Provider cannot support required forecast views.
- Location permission flow breaks app startup.
- Weather errors break the Home dashboard.
- Cache/service worker changes break offline app loading.
- Existing service data changes.
- Export/import drops existing state.
- Cloud backup behavior is unclear.

## Required Stage J tests

- App loads with weather disabled/no permission yet.
- Weather chip appears in Home without crowding layout.
- Tap weather chip opens modal/bottom sheet.
- Current location permission granted flow works.
- Permission denied flow works.
- Manual city/ZIP fallback works.
- 5-day forecast default displays accurately.
- Hourly forecast displays accurately.
- 10-day forecast only appears if supported.
- Offline/last-known state works.
- Weather provider failure handled gracefully.
- English labels verified.
- Spanish labels verified.
- Light mode verified.
- Dark mode verified.
- Mobile verified.
- Desktop verified.
- No console errors.
- Export/import unaffected.
- Cloud backup unaffected.
- Cache bumped if deployable files change.
- Live GitHub Pages verified.

## Handoff note for Codex

Before implementing Stage J, Codex must:

1. Read the primary temporary MD.
2. Read this Stage J spec.
3. Verify current repo state and current active stage.
4. Confirm Stage I has been approved.
5. Choose and document provider/approach.
6. Only then begin coding.

## Current planned order

1. Finish/approve Stage I — Reminder Push Notifications.
2. Stage J — Weather Planning Widget.
3. Final release QA.
4. Final MD cleanup/removal only after David/Supervisor approval.
