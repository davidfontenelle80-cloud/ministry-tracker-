# Ministry Tracker — Stage Notes: v63 Audit Polish (app-sweep 1/4)

Date: 2026-07-01. Base: v62 (a4ee292).

Full static audit run (i18n parity, undefined CSS tokens, stray selectors,
precache, syntax). Results:

- i18n EN/ES: COMPLETE — 39 apparent gaps are all covered by I18N_FALLBACKS.es;
  t() resolves I18N[lang] → I18N_FALLBACKS[lang] → I18N.en. No action.
- Undefined CSS vars audit: all safe (aliases or guarded fallbacks) except:
  - var(--muted,#8a93a8) x17 and var(--color-faint,#888) x1 in injected CSS
    resolved to constant grays in both themes → now var(--text-dim,...) /
    var(--text-faint,...) so they track the theme.
- sw.js precache: icons/icon-192.png (used as notification icon) and
  icon-512.png were not precached → added, offline notifications keep icons.
- No stray .dark selectors remain. node --check clean. Manifest OK.

Cache: v62 → ministry-tracker-v63-audit-polish.
Ministry Tracker sweep COMPLETE. Next per David: Talk Arrangements, then
Overtime Tracker, then remaining apps.
