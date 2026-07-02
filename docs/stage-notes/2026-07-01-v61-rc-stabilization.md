# Ministry Tracker — Stage Notes: v61 RC Stabilization (supersedes unshipped v60)

Date: 2026-07-01
Status: COMMITTED LOCALLY ONLY — remote push blocked (GitHub connector not authorized). Remote/live remain v59.

## Scope

Priority 0 push hardening + on-device debug visibility, Priority 1 unified green
system, Priority 2 UI/i18n stabilization. No new features. Worker untouched
(proven healthy via live /api/health + CORS preflight probes).

## Push (P0)

Proven by live probes:
- Worker /api/health → ok:true, KV + VAPID + delivery + due-bucket scheduler all present.
- OPTIONS preflight /api/reminders with Origin https://davidfontenelle80-cloud.github.io → 204 with correct CORS headers.
- Conclusion: "Error al sincronizar recordatorio: No se pudo cargar" = Safari "Load failed",
  a client-side fetch abort (SW-update reload race), not a worker/CORS failure.

Fixes:
1. js/push.js — jsonFetch now sets keepalive:true, so /api/subscribe and
   /api/reminders POSTs survive page reloads triggered by SW activation.
2. js/app.js — pending-sync marker (localStorage mtPendingReminderSync) written
   when a reminder sync starts, cleared on success/postReached; on next boot
   resumePendingReminderSync() re-runs any interrupted sync.
3. js/app.js — new on-screen Push Debug modal (stethoscope button beside Test
   Push on the Notes screen): workerUrl, live /api/health reachability,
   permission, subscriptionId, SW controller state, and the full
   __ministryLastPushSyncDebug payload (sourceId, fireAt, postReached, ok,
   error, status, skippedReason, dueBucketMinute). Readable on iPhone without a console.

## Green system (P1)

Dark theme tokens (css/main.css) moved off neon mint to premium emerald:
| Token | Before | After |
|---|---|---|
| --color-primary / --accent | #5be3a0 | #10b981 |
| --color-primary-dark / --accent-dark | #3fbf84 | #059669 |
| --color-primary-strong | #74f0b6 | #34d399 |

v61 addendum — ROOT CAUSE of inconsistent greens: css/dark-mode.css (KHub
fallback layer) defines a competing token set on html[data-theme] selectors
that OUTRANK main.css's :root/[data-theme] blocks. Dark mode was actually
rendering mint #34d399 regardless of main.css; light mode was rendering
#10b981/#047857 — i.e. the Reports green David approved as the reference.

Fix: BOTH files now agree on the Reports reference family (emerald
400/500/600/700): light primary #10b981 / dark #047857 / strong #059669;
dark-theme primary #10b981 / dark #059669 / strong #34d399.
dark-mode.css mint (#34d399/#6ee7b7) tokens replaced in place.
Weather stray greens unified: #22c55e→#10b981, #4ade80→#34d399,
#16a34a→#059669 plus matching rgba tints. Cal-panel blue accent fallbacks
(#4f8ef7) → token family. v54 Reports hero gradient untouched.

## UI stabilization (P2)

- css/notes-card-borders.css was orphaned (never linked) → now linked in
  index.html and precached. Notes premium borders restored.
- sw.js: runtime cache for cdnjs/gstatic/googleapis → Font Awesome nav icons
  and fonts survive offline/CDN failure.
- Backup & Restore (Settings "Data" card): now collapsible, collapsed by
  default, chevron header, state persisted (mtBackupSectionOpen).
- Backup i18n fixed: header lbl_data → backupTitle ("Backup & Restore" /
  "Respaldo y restauración"); new keys cloudSaveBtn ("Cloud Save"/"Guardar en
  la nube"), cloudRestoreBtn ("Cloud Restore"/"Restaurar desde la nube"),
  cloudHeader ("Cloud"/"Nube"); exportBtn "Export Backup", importBtn
  "Import from File"; lastBackup/newShort already existed ("Último respaldo",
  "nuevas").
- Weather i18n: "Tap to expand" → "Toca para expandir"; advisory "+N more" →
  "+N más".
- iOS date/time inputs: CSS normalization so empty fields render as clean
  44px controls, not blank oversized bars.

## Cache bump

ministry-tracker-v59-push-race-fix → ministry-tracker-v61-rc-stabilization

## Verification

- node --check passed: app.js, push.js, sw-register.js, sw.js, config.js, i18n.js.
- index.html div balance verified.
- NOT yet verified (requires device + deploy): Test Push, scheduled open/closed-app
  reminders, notification tap route, visual pass light/dark EN/ES.

## Files changed

index.html, css/main.css, sw.js, js/app.js, js/push.js, this MD.
