# ACTIVE_TASK.md — Live Working Memory

> **This is the single source of truth for what is happening in this repo right now.**
> It is the **FIRST** file every AI worker reads at the start of a session and the
> **LAST** file every AI worker updates before stopping. Never leave it stale.
> If this file and the repo disagree, the repo is reality — reconcile and note it here.

---

## Session / worker identity

- **Worker (WHO started it):** Claude Code (AI worker) acting for Supervisor **David Fontenelle**
- **Model:** claude-opus-4-8 (Claude Opus 4.8)
- **Session started:** 2026-07-24 EDT
- **Supervisor:** David Fontenelle (the only person who approves — a worker never self-approves)

## Status

- **Status:** IN PROGRESS
- **% complete:** Repo-side verification done; awaiting David's on-device results (0 of 12 device steps recorded)
- **Confidence:** 95% on the code-level guarantee; device outcomes pending hardware test

## Objective & task

- **Current objective:** Real-device verification of the notification **ON/OFF reset** behaviour —
  prove that turning notifications **OFF** affects **only the current device** and turning them
  back **ON** creates a **fresh subscription**, across David's two iPhones and iPad.
- **Current task (this AI run — repo side only):** Confirm the shipped service-worker cache
  version, confirm the notification client code enforces the "OFF = this device only" guarantee,
  document the on-device Push Diagnostics fields David will read back, and set up this tracker.
  **The actual device steps are performed by David on physical hardware, not by the AI worker.**
- **Last completed step:** Cloned repo to `C:\Users\David\ministry-tracker-`, fetched to
  `origin/main` (`HEAD == origin/main == 309e36c`), verified `sw.js`, `js/push.js`,
  `js/push-toggle.js`, and the Push Diagnostics panel in `js/app.js`; created this tracker.

## Repo-side findings (this AI run)

- **`sw.js` `CACHE_VERSION`:** `ministry-tracker-v77-push-toggle` — this **IS v77** (confirmed;
  older sessions had bumped it to v76, current shipped value is v77). No bump performed or needed.
- **HEAD SHA at verification:** `309e36c5fa29ced234e0d4b8eccdb1edc471e86f` (== `origin/main`).
- **Notification client files present:** `js/push.js` (subscribe / reminder sync / test push /
  diagnose), `js/push-toggle.js` (the On/Off card), and the Push Diagnostics modal in `js/app.js`.
- **"OFF = this device only" guarantee holds in code.** The OFF path is
  `disableCurrentDevice()` at **`js/push-toggle.js:87-95`**. It (1) reads **only this device's**
  browser subscription via `navigator.serviceWorker.ready` → `registration.pushManager.getSubscription()`,
  (2) calls `subscription.unsubscribe()` — a **browser-local** removal of **this endpoint only**,
  and (3) clears the local id from `localStorage` (`ministryPushSubscriptionId`). It makes **no
  HTTP call to the worker at all**, so it cannot and does not delete any other device's
  server-side subscription. (The task hypothesised an unsubscribe POST for this endpoint; the
  shipped code is stronger — a purely local unsubscribe with zero server calls, so other devices
  are categorically untouched.) Re-enabling via `enableWithFreshSubscription()`
  (`js/push-toggle.js:97-104`) calls `disableCurrentDevice()` then `MinistryPush.subscribe()`,
  which POSTs `/api/subscribe` and stores a **new** subscription id → fresh subscription.

## On-device Push Diagnostics fields (what David reads back)

Open via the **stethoscope** button on the Notifications card ("View diagnostics" / "Ver
diagnóstico") or the header push-debug button. Modal title: **"Push diagnostics"** /
**"Diagnóstico de notificaciones"** (`js/app.js:2565-2607`). Exact row labels, in order:

- `workerUrl`
- `worker /api/health`  → `ok (200)` when the Cloudflare worker is reachable
- `permission`  → `granted` / `denied` / `default`
- `standalone (installed)`  → `yes` / `NO`
- `Apple iPhone/iPad`  → `yes` / `no`
- `blocked reason`  → env block message, or `—` when clear
- `subscriptionId`  → present when ON, `—` after OFF on that device
- `SW controller`  → `active` / `none`
- then section **"Last reminder sync"**: `timestamp`, `sourceId`, `fireAt`, `postReached`,
  `ok`, `error`, `status`, `skippedReason`, `dueBucketMinute`

## 12 verification steps (performed by David on real devices)

1. On **iPhone A**, open the app from its Home Screen icon (standalone). In Push diagnostics
   confirm `standalone (installed)=yes`, `SW controller=active`, `worker /api/health=ok (200)`.
2. On **iPhone A**, turn Notifications **ON**. Confirm the toggle reads **On**, status code
   `PUSH_ENABLED_SUBSCRIBED`, and a non-empty `subscriptionId` appears in diagnostics.
3. On **iPhone A**, tap **Send test notification** and confirm the notification arrives.
4. Repeat steps 1–3 on **iPhone B** and on the **iPad**; each must arrive at its own device.
5. Record all three `subscriptionId` values — they must be **distinct** (one per device).
6. On **iPhone A**, turn Notifications **OFF**. Confirm toggle reads **Off**, code
   `PUSH_GRANTED_NO_SUBSCRIPTION`, and `subscriptionId` now shows `—` in A's diagnostics.
7. On **iPhone B** and **iPad** (untouched), confirm they still read **On** and their
   `subscriptionId` values are **unchanged** from step 5.
8. Send a test notification to **iPhone B** and **iPad** — both must still receive it
   (proves OFF on A did not remove their subscriptions server-side).
9. Create/trigger a real ministry-note reminder — confirm **B** and **iPad** receive it and
   **A does not** (A is unsubscribed).
10. On **iPhone A**, turn Notifications **back ON**. Confirm a **new** `subscriptionId`
    (different from the value recorded for A in step 5) — a fresh subscription.
11. Send a test/real notification to **iPhone A** and confirm it arrives again.
12. Cross-check on all three devices: no console errors, `worker /api/health=ok`, and the app's
    other features (notes, calendar, reports, timer) behave normally.

## Results table (David fills in as devices report)

| # | Step | iPhone A | iPhone B | iPad | Notes |
|---|------|----------|----------|------|-------|
| 1 | Standalone + SW + health | | | | |
| 2 | ON → subscribed + id | | | | |
| 3 | Test notification arrives | | | | |
| 4 | ON on B & iPad | n/a | | | |
| 5 | Three distinct subscriptionIds | | | | A: __ B: __ iPad: __ |
| 6 | A OFF → id cleared | | n/a | n/a | |
| 7 | B & iPad still ON, id unchanged | n/a | | | |
| 8 | Test still reaches B & iPad | n/a | | | |
| 9 | Real reminder: B & iPad yes, A no | | | | |
| 10 | A back ON → NEW id | | n/a | n/a | new id: __ |
| 11 | A receives again | | n/a | n/a | |
| 12 | No console errors / other features OK | | | | |

## Files that MUST NOT change (this verification)

- Application logic unrelated to the notification toggle: ministry tracking, notes, calendar,
  reports, timer, authentication, backup, translation/i18n, and any unrelated UI.
- Cloudflare credentials and worker secrets; **VAPID private keys** (never touch or commit).
- `KHub-Boilerplate` and every other app/repo.
- **No secret or full push endpoint** is ever written into this repo or this tracker.
- Notification client files (`js/push.js`, `js/push-toggle.js`, notification UI in `js/app.js`,
  `sw.js`) change **only if a reproducible defect is found** — which requires David's device
  test; it cannot be found in a repo-only run. If notification code changes, **then** bump
  `CACHE_VERSION` (v77 → v78); otherwise leave it at v77.

## Next step if interrupted

Repo-side verification is complete and this tracker is committed/pushed (docs only). The
remaining work is **David running the 12 device steps** and reporting outcomes into the results
table. If resuming as a worker: re-read this file, run `git status` (expect clean) and confirm
`HEAD == origin/main`; do **not** modify app code — wait for David's device results, then only
act on a **reproducible** defect he reports.

## Stop condition

For this AI run: stop once `CACHE_VERSION` is confirmed (v77), the "OFF = this device only" code
guarantee is documented with `file:line`, the Push Diagnostics labels are listed, this tracker is
committed and pushed (docs only), the tree is clean, and `HEAD == origin/main`. **Reached.**

## Repo vs tracker reconciliation

- The repo had **no `.ai/ACTIVE_TASK.md`** (it tracks history under `docs/stage-notes/`). This
  tracker was **created fresh** to the KHub AI Session Continuity Standard, so there was no prior
  tracker Markdown to disagree with the repo — nothing to reconcile. Content herein matches the
  pushed repo state at `309e36c`.

## Last updated

- **2026-07-24 EDT** by Claude Code (claude-opus-4-8)

---

## Supervisor Review

> **Only the Supervisor (David) edits this section. Workers never self-approve.**

- **Review status:** NOT REVIEWED
  <!-- One of: NOT REVIEWED / APPROVED / APPROVED WITH OBSERVATIONS / REQUIRES CHANGES / BLOCKED -->
- **Reviewed by:**
- **Reviewed at:**
- **Observations / required changes:**
