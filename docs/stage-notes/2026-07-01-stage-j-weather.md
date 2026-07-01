# Ministry Tracker — Stage Notes: Stage J — Weather

Date: 2026-07-01

## Summary

Added a live weather card to the Home (dashboard) screen. Uses Open-Meteo APIs — no API key
required, no secrets committed, no backend proxy. Full offline graceful degradation via
localStorage cache with 30-minute TTL.

## Weather API

| API | URL | Key required |
|-----|-----|--------------|
| Forecast (WMO) | `https://api.open-meteo.com/v1/forecast` | None |
| Geocoding | `https://geocoding-api.open-meteo.com/v1/search` | None |

CORS-enabled, HTTPS, free tier supports 10,000 calls/day — well within any single-user PWA.

## Placement

**Screen**: Home (`#screen-home`)  
**Container**: `<div id="wxContainer" style="margin-bottom: 20px;"></div>`  
**Position**: Between the "This week" bars card and the "Service year" card (middle of home screen scroll)

Rationale: visible after the session rings (primary action) but before the year-level stats.
Seeing current weather + ministry outlook immediately helps users decide whether to go out.

## Features Implemented

### Current conditions
- Temperature (large display, °C)
- WMO weather code → emoji + label (EN/ES)
- Feels-like temperature
- Wind speed (km/h)
- Precipitation probability (%)

### Ministry Outlook (logic)
| Signal | Threshold | Verdict |
|--------|-----------|---------|
| Rain > 60% OR temp > 40°C/< 5°C OR wind > 50 km/h OR code ≥ 61 | any | ⛔ Not ideal |
| Rain 30–60% OR temp 35–40°C/5–10°C OR wind 30–50 km/h | any | ⚠️ Use caution |
| All else | — | ✅ Good for ministry |

### Hourly forecast
- Next 12 hours (skips elapsed hours)
- Scrollable horizontal strip
- Emoji / temp / rain% per hour

### 7-day forecast
- Daily high/low, emoji, precipitation %
- "Today" label for day 0

### Location
- GPS via `navigator.geolocation` (prompts user on first load if no cache)
- Manual city search via Open-Meteo Geocoding (top 5 results)
- Location persisted in `localStorage` key `mt_weather_location`

### Cache
- Key: `mt_weather_v1` in localStorage
- TTL: 30 minutes
- On fresh load: show cached immediately, silently re-fetch if stale
- Age stamp shown: "5 min ago" (fresh) or "⚠️ Updated 42 min ago" (stale)
- Graceful offline: stale cache shown with age warning

### Internationalization
- Bilingual EN/ES via `state.lang` (reads existing app state)
- All labels, outlook text, day names, section headers

### CSS
- Injected at runtime by `injectWeatherCSS()` in the weather module IIFE
- No separate CSS file added — self-contained in app.js
- Respects `data-theme="light"` / `data-theme="dark"` via CSS variable overrides
- Skeleton loading animation while fetching

## Architecture

Weather module is an IIFE appended to the end of `js/app.js`:

```js
(function(App) { ... })(window.App = window.App || {});
```

Exposes `App.Weather` with methods: `init`, `refresh`, `useGPS`, `searchCity`, `selectCity`,
`showLocationPicker`, `hideLocationPicker`, `retry`.

`renderHome()` calls `App.Weather.init()` on every render cycle (every `renderAll()` call).
Cache hits are synchronous/instant; no performance penalty for re-renders.

## Files Changed

| File | Change |
|------|--------|
| `js/app.js` | Appended weather IIFE block (~220 lines); added `App.Weather.init()` call at end of `renderHome()` |
| `index.html` | Added `<div id="wxContainer">` between week-bars card and service-year card |
| `sw.js` | Cache version bump v54 → v55 |

## Cache Bump

`ministry-tracker-v54-report-green-polish` → `ministry-tracker-v55-weather`

## Commit

SHA: `95616d4d84d3aa4375eeb3cc0a39ca60221824b9`  
Message: `Stage J: Weather — Open-Meteo, GPS/city, hourly + 7-day forecast, ministry outlook, CSS injection, cache v55`

## Verification

- GitHub Pages: deployed ✓
- Live sw.js: `const CACHE_VERSION = 'ministry-tracker-v55-weather';` ✓
- Live app.js: 2× `open-meteo` references, 3× `Stage J` markers ✓
- Live index.html: `wxContainer` present ✓
- No API keys committed ✓
- No secrets in code ✓
- Worker / Push / Firebase / Talk Arrangements / Note Clip: untouched ✓
- Syntax check: `node --check` passed clean ✓

## Not Started / Next

- Stage I: Real-device notification tap routing verification (unchanged, still pending)
- Stage K: Version 1.0 Release Candidate QA (planned — not started)
