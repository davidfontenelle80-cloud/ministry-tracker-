# Ministry Tracker

Field service hour tracker for a JW congregation. Tracks hours by category (regular witnessing, group witnessing, LDC, etc.), monthly/annual goals, streaks, and multi-publisher reports. EN/ES bilingual.

**Zoom:** locked (`user-scalable=no`, `maximum-scale=1.0`) per owner decision — accidental pinches destabilize the app in field use; all text-entry inputs stay ≥16px, so readability and iOS auto-zoom prevention hold regardless (KHub UX-STANDARDS §2).

## Current Codex Task — Credit Hours Bug

GitHub issue: #2 — Credit hours save but do not stay visible / reflect correctly in Reports.

### User-reported problem

Regular ministry hours are saving correctly. Credit hours are not reliably saving or being reflected in the Reports screen.

### Likely root cause

Credit hours are stored separately from regular service sessions:

- Regular time: `state.sessions`
- Credit time: `state.creditEntries`
- Legacy credit map: `state.creditByMonth`

The Reports month dropdown is currently built from regular sessions only. That means a month with credit hours but no regular sessions can disappear from the dropdown or look like it did not save. Also, manual credit save writes to `creditEntries` but does not keep `creditByMonth` synchronized.

### File to update

`js/app.js`

### Required fix

1. Update `renderReports()` so the Reports month dropdown includes months from:
   - `state.sessions`
   - `state.creditEntries`
   - `Object.keys(state.creditByMonth || {})`

2. Update `getMonthCredit(mk)` so it:
   - totals matching `creditEntries` first
   - falls back to legacy `state.creditByMonth[mk]` if no entry total exists
   - accepts legacy values as minutes, hours strings, or objects with `minutes` / `hours`

3. Update `openCreditEditModal()` save handler so saving credit hours:
   - writes one manual monthly credit entry to `state.creditEntries`
   - updates `state.creditByMonth[mk] = mins`
   - deletes both stores for that month when credit is set to `0`
   - calls `saveState()`, `closeModal()`, `renderAll()`, and `toast(t('save'))`

### Suggested implementation details

Use manual credit id:

```js
const manualId = 'c_manual_month_' + mk;
```

When saving, remove previous manual credit entries for the same month before adding the new one.

Preferred credit entry shape:

```js
{
  id: manualId,
  date: mk + '-01',
  minutes: mins,
  type: 'manualMonthlyCredit',
  note: 'Manual monthly credit total',
  updatedAt: new Date().toISOString(),
}
```

### Acceptance test

1. Open Reports.
2. Choose or navigate to a month with no regular service sessions.
3. Tap Credit.
4. Enter credit hours and save.
5. Confirm the credit card updates immediately.
6. Leave Reports and return.
7. Refresh/reopen the app.
8. Confirm the month is still selectable and the credit remains.
9. Confirm regular field service totals did not change.

## Deploy

Push to `main` — GitHub Pages serves from root.

## KHub standard

Full KHub standard: `sw.js`, `js/config.js`, `js/i18n.js`, `js/theme.js`, `js/error-boundary.js`, `js/a11y.js`, `js/perf.js`, `js/components/`, `css/` (4 layers), `.eslintrc.json`, `.prettierrc`

## Version

v1.0.0 — Restructured to KHub standard 2026-06-05
