# Ministry Tracker — Stage Notes: v54 Report Green Polish

Date: 2026-07-01

## Summary

Targeted dark-mode color fix for the Reports section monthly report hero card.

## Problem

In dark mode, the `.card-accent` hero card used `background: var(--accent)` which resolved to `#5be3a0` — a bright neon mint green. Light mode already had a refined emerald gradient override. The dark-mode card looked visually cheaper/louder by comparison.

## Root cause

`css/main.css` base `.card-accent` rule sets `background: var(--accent)` (#5be3a0).
Light mode had `[data-theme="light"] .card-accent` with `linear-gradient(135deg, #0c7f53, #12a06a)`.
Dark mode had **no override** — it fell through to the raw accent token.

## Fix applied

Added one CSS block to `css/main.css` immediately after the light-mode override:

```css
[data-theme="dark"] .card-accent {
  background: linear-gradient(135deg, #047857, #065f46);
}
```

Color change:
| Mode | Before | After |
|------|--------|-------|
| Dark | `#5be3a0` (flat neon mint, `var(--accent)`) | `linear-gradient(135deg, #047857, #065f46)` |
| Light | unchanged | unchanged |

Contrast: `#fff` on `#047857` ≈ 7:1 (WCAG AAA). `#fff` on `#065f46` ≈ 9.5:1. Both pass.

## Scope

- Only file changed (besides sw.js): `css/main.css`
- `.card-accent` appears exactly once in `index.html` (Reports hero card only)
- Light mode: untouched
- Notes, Calendar, Worker, Firebase, Push, Talk Arrangements, Note Clip: untouched
- Stage J Weather: not started

## Cache bump

v53 `ministry-tracker-v53-notes-ui-polish` → v54 `ministry-tracker-v54-report-green-polish`

## Commit

SHA: `ae0166823b4a563543b666829cbd1505ade588a6`
Message: `v54: tone down dark-mode report card hero green (#5be3a0 → gradient #047857-#065f46)`

## Verification

- GitHub Pages build: completed / success
- Live sw.js: `const CACHE_VERSION = 'ministry-tracker-v54-report-green-polish';` ✓
- Live main.css: `[data-theme="dark"] .card-accent` block present with gradient ✓
- Light mode: `[data-theme="light"] .card-accent` block unchanged ✓

## Stage I status

Unchanged: `backend-deployed, frontend-live, not live-approved`

## Next

- Stage I real-device notification tap routing verification (unchanged requirement)
- Stage J Weather: still planned only, not started
