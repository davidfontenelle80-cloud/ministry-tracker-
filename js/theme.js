/**
 * theme.js -- Ministry Tracker theme bootstrap
 *
 * Keep this aligned with app.js state.theme so startup does not flash
 * dark -> light -> dark. Older KHub theme keys are ignored because this
 * app stores its real preference inside ministry-tracker-v4.
 */
(function () {
  'use strict';

  const APP_STATE_KEY = 'ministry-tracker-v4';
  const META_COLORS = { dark: '#07080C', light: '#FFFFFF' };
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function readAppThemePreference() {
    try {
      const raw = localStorage.getItem(APP_STATE_KEY);
      if (!raw) return 'auto';
      const parsed = JSON.parse(raw);
      return parsed && ['auto', 'light', 'dark'].includes(parsed.theme) ? parsed.theme : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function resolveTheme(preference) {
    if (preference === 'dark') return 'dark';
    if (preference === 'light') return 'light';
    return mediaQuery.matches ? 'dark' : 'light';
  }

  function updateMetaColor(theme) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = META_COLORS[theme] || META_COLORS.dark;
  }

  function apply(preference) {
    const requested = ['auto', 'light', 'dark'].includes(preference) ? preference : readAppThemePreference();
    const resolved = resolveTheme(requested);
    document.documentElement.setAttribute('data-theme', resolved);
    updateMetaColor(resolved);

    const icon = document.getElementById('themeIcon');
    if (icon) {
      if (requested === 'auto') icon.className = 'fa-solid fa-circle-half-stroke';
      else icon.className = resolved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    if (window.KHub?.emit) window.KHub.emit('theme:change', { preference: requested, resolved });
  }

  function applyFromAppState() {
    apply(readAppThemePreference());
  }

  mediaQuery.addEventListener('change', () => {
    if (readAppThemePreference() === 'auto') applyFromAppState();
  });

  // Apply as soon as this script loads, using the app's real state key.
  applyFromAppState();

  window.KHub = window.KHub || {};
  window.KHub.Theme = {
    apply,
    applyFromAppState,
    get current() {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    },
  };

  document.addEventListener('DOMContentLoaded', applyFromAppState);
})();
