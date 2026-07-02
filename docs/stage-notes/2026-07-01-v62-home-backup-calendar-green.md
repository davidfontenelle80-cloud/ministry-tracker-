# Ministry Tracker — Stage Notes: v62 Home Backup + Calendar + Deep Emerald

Date: 2026-07-01
Base: v61 (dafd32d), deployed and device-verified — push notifications confirmed
working app-open AND app-closed by David.

## Fixes (from David's device screenshots)

1. Home backup banner ("Respaldo y restauración" card on Inicio):
   - Cloud Save / Cloud Restore spans were hardcoded English (separate from the
     Settings card fixed in v61). Now lbl_homeCloudSave / lbl_homeCloudRestore
     → cloudSaveBtn/cloudRestoreBtn keys ("Guardar en la nube" / "Restaurar
     desde la nube").
   - Banner now collapsible, collapsed by default: header row (icon + title +
     last-backup status) is the toggle, chevron indicator, buttons hidden until
     expanded. State persisted (mtHomeBackupOpen). Collapse helper generalized
     to _initCollapseSection(toggleId, bodyId, chevronId, storeKey).

2. Calendar "Notas de este día" WHITE BOX in dark mode — root cause: injected
   .cal-notes-panel CSS used undefined tokens with light fallbacks
   (var(--card-bg,#fff), var(--hover,#f1f5f9), var(--text-muted,#64748b)) and a
   dark override on a `.dark` class that the app never sets (it uses
   [data-theme="dark"]). All cal-panel rules now use real tokens: --surface,
   --border, --text, --text-dim, --surface-sub, --accent. Works in both themes.

3. Dark green deepened to the Informes hero emerald (David: "the green from the
   informes is the color I want across all the app"):
   | Token (dark) | v61 | v62 |
   |---|---|---|
   | --color-primary / --accent | #10b981 | #059669 |
   | --color-primary-dark / --accent-dark | #059669 | #047857 |
   | --color-primary-strong | #34d399 | #10b981 |
   css/dark-mode.css dark block matched. Light mode unchanged (#10b981/#047857,
   same family as the hero gradient). Reports hero untouched.

## Cache bump

ministry-tracker-v61-rc-stabilization → ministry-tracker-v62-home-backup-calendar-green

## Push status

CONFIRMED WORKING by David on device: open-app and closed-app delivery. The
stale "No se pudo cargar" toast in his screenshots predates the v61 deploy
(screenshots 6:45pm EDT; v61 live ~7:57pm EDT). Watch on v62.

## Verification

node --check clean (app.js, sw.js). Files: index.html, js/app.js, css/main.css,
css/dark-mode.css, sw.js, this MD.
