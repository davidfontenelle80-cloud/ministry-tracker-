# ACTIVE_TASK.md — Live Working Memory

> **This is the single source of truth for what is happening in this repo right now.**
> It is the **FIRST** file every AI worker reads at the start of a session and the
> **LAST** file every AI worker updates before stopping. Never leave it stale.
> If this file and the repo disagree, the repo is reality — reconcile and note it here.

---

## Session / worker identity

- **Worker (WHO started it):** Claude Code (AI worker) acting for Supervisor **David Fontenelle**
- **Model:** claude-sonnet-5
- **Session started:** 2026-09-14
- **Supervisor:** David Fontenelle (the only person who approves — a worker never self-approves)

## Status

- **Status:** DONE (repo-side) — on feature branch, NOT merged to main, NOT deployed
- **% complete:** 100% implemented and manually verified in a local preview. Awaiting David's
  approval to merge/deploy.
- **Confidence:** High — verified via direct state inspection and real click-driven UI tests in a
  local preview (see below), not just code review.

## Objective & task

- **Current objective:** Add a **Pause / Resume** control to the ministry timer (which previously
  only had Start, Stop, and the +/- Adjustment buttons) that **persists across the app being fully
  closed and reopened** — pause, close the app, reopen later, resume from exactly the same elapsed
  time, no double-counting or lost time.
- **Branch:** `feature/timer-pause-resume` (created off `main` at commit `b2e7efb`, not pushed).
- **Files changed:** `js/app.js`, `index.html`, `css/main.css`. No other files touched.

## How it works

- The timer was already wall-clock based: `state.activeTimer.startISO` is the only source of
  truth, and elapsed is always computed as `now − startISO` (never an incrementing counter). The
  whole `state` object (including `activeTimer`) is written to `localStorage` on every change via
  `saveState()`, so a running timer already survived reload/close before this change.
- Pause adds one field: `state.activeTimer.pausedAt` (ISO timestamp, `null`/absent when running).
  A helper `getActiveElapsedSec()` computes elapsed against `pausedAt` instead of `Date.now()`
  whenever it's set — so the displayed time freezes, including across a full close/reopen, since
  `pausedAt` is just another persisted state field.
- Resume shifts `startISO` forward by however long the pause lasted (`Date.now() − pausedAt`) and
  clears `pausedAt`. This reuses the exact mechanism the existing +/- Adjustment buttons already
  use (shifting `startISO`), so elapsed continues seamlessly with no separate "accumulated time"
  field needed.
- `stopTimer()` now stops at `pausedAt` (if paused) instead of `Date.now()`, so stopping a paused
  timer never counts the time spent sitting paused.
- The existing +/- Adjustment buttons and the tap-to-set (`timerDisplay` click) handler were
  updated to reference the same paused-aware elapsed calculation, so adjusting time while paused
  works correctly and does not accidentally unfreeze the display.
- New UI: a small Pause/Resume button next to the round Start/Stop button on the Timer screen, and
  a matching Pause/Resume button in the live banner (shown whenever a timer is running/paused,
  across every screen). Status label shows "Paused" in amber when paused.
- New i18n strings added (`pause`/`resume`/`paused`, both `en` and `es`).

## Verification performed (this AI run)

Served the app locally (`node` static file server on `localhost:8935`, since no build step exists)
and drove it via a headless preview browser, reading `state`/DOM directly for precise assertions:

1. Start → elapsed increments normally. ✓
2. Pause (via the on-screen button, real DOM click through the wired handler) → status flips to
   "Paused" (amber), display freezes; confirmed frozen after an additional 2s wait. ✓
3. Full page reload while paused (simulates fully closing and reopening the app — `localStorage`
   is the only thing that survives a real close) → `activeTimer.pausedAt` and `startISO` both
   restored exactly; live banner shows "Paused" and the same frozen time immediately on load. ✓
4. Resume → elapsed continues from the frozen value (9s → 11s after 2s), not restarted and not
   jumped to the full wall-clock gap. ✓
5. +5 min Adjustment while paused → elapsed grows by exactly 5 min on top of the frozen value, and
   stays frozen afterward (doesn't start ticking again). ✓
6. Stop while paused → saved session duration equals the elapsed time **at the moment of pause**
   (600s → 10 min saved), correctly ignoring 3 additional real seconds that passed after stopping
   a paused timer. ✓
7. Regression: normal (never-paused) Start → tap-to-set to 20 min → Stop still saves a 20 min
   session. ✓
8. Regression: Pause → Resume → Stop via the **confirm-close modal** ("Save & stop" button, the
   existing `confirmClose` setting) still works correctly end-to-end. ✓
9. No new console errors introduced. (One pre-existing, unrelated console error — a service-worker
   script fetch failure — appears on every load regardless of this change; it is an artifact of
   the ad-hoc local static server used for preview, not of the timer code, and was present before
   any edits.)

No automated test suite exists in this repo (`TEST-CHECKLIST.md` is a generic manual KHub PWA
checklist with no timer-specific items, and `node scripts/khub-check.mjs` referenced in
`CLAUDE.md` does not exist in this repo). Verification above was manual/scripted against a live
preview instead.

## Files that MUST NOT change (this task)

- Nothing outside `js/app.js`, `index.html`, `css/main.css` was touched.
- Notification/push code, Firebase/cloud backup, Cloudflare worker, and all unrelated screens
  (calendar, notes, reports, settings) were not modified.

## Next step if interrupted / resuming

- Repo is on `feature/timer-pause-resume`, working tree clean, all changes committed to that
  branch only. `main` is untouched.
- **Nothing has been pushed, merged, or deployed.** David needs to review the diff (or try it
  himself) and explicitly approve before merging to `main` / deploying to GitHub Pages.
- If resuming: `git log feature/timer-pause-resume` for the commit, `git diff main...HEAD` for the
  full change.

## Stop condition

Stop once Pause/Resume is implemented, persists correctly across a simulated close/reopen, all
interactions with Start/Stop/Adjustment are verified sane, the branch is committed (not merged/
pushed/deployed), and this tracker reflects that state. **Reached.**

## Repo vs tracker reconciliation

- This tracker previously documented a **separate, unrelated** task: real-device verification of
  the notification ON/OFF reset behavior (commit `b2e7efb`), which was repo-side-complete but
  still awaiting David running 12 manual steps on physical devices — that device verification was
  **never recorded as done** here. That work is untouched by this session (no notification/push
  files were touched) and remains exactly as `b2e7efb` left it on `main`. If David has since run
  those device steps, their results still need to be filled into that commit's results table (see
  `git show b2e7efb:.ai/ACTIVE_TASK.md` for the original table) — this file no longer carries that
  table since it belongs to a finished, merged task and would otherwise get stale here on a
  different branch. This tracker now reflects only the current feature branch's task, per the
  "single source of truth for what is happening right now" rule.

## Last updated

- **2026-09-14** by Claude Code (claude-sonnet-5)

---

## Supervisor Review

> **Only the Supervisor (David) edits this section. Workers never self-approve.**

- **Review status:** NOT REVIEWED
  <!-- One of: NOT REVIEWED / APPROVED / APPROVED WITH OBSERVATIONS / REQUIRES CHANGES / BLOCKED -->
- **Reviewed by:**
- **Reviewed at:**
- **Observations / required changes:**
