/**
 * sw-register.js — KHub SW manager + event bus (pipe-calc pattern, fleet standard)
 * Bootstrap, shared namespace, event bus, and service worker manager.
 *
 * SW update strategy:
 *  - On every page load: call registration.update() (browser re-fetches sw.js)
 *  - Every 12 hours (tracked via localStorage timestamp): call registration.update() again
 *  - When a new SW enters "waiting" state:
 *      • If page is "safe" (no open modals, no focused inputs, no dirty forms): reload quietly
 *      • Otherwise: show the update banner so the user can choose when to refresh
 *  - When user clicks Refresh on banner: send SKIP_WAITING → SW activates → page reloads
 *  - When SW broadcasts RELOAD_READY (after activation): reload if not already reloading
 */
(function () {
  'use strict';

  // ── Event bus ──────────────────────────────────────────────
  const _listeners = {};

  function on(event, fn)  { (_listeners[event] = _listeners[event] || []).push(fn); }
  function off(event, fn) { _listeners[event] = (_listeners[event] || []).filter(f => f !== fn); }
  function emit(event, data) { (_listeners[event] || []).forEach(fn => { try { fn(data); } catch (e) { console.error('[KHub] Event error:', e); } }); }

  // ── Notification route handling ────────────────────────────
  const NOTIFICATION_ROUTE_KEY = 'khub_pending_notification_route';

  function routeFromLocation() {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('screen') !== 'notes') return null;
      return {
        type: 'NOTIFICATION_CLICK_ROUTE',
        screen: 'notes',
        sourceType: u.searchParams.get('sourceType') || 'ministry-note',
        sourceId: u.searchParams.get('sourceId') || '',
        url: u.href,
      };
    } catch (e) {
      return null;
    }
  }

  function rememberNotificationRoute(route) {
    if (!route || route.screen !== 'notes') return;
    try { sessionStorage.setItem(NOTIFICATION_ROUTE_KEY, JSON.stringify(route)); } catch (e) {}
  }

  function readPendingNotificationRoute() {
    const fromUrl = routeFromLocation();
    if (fromUrl) return fromUrl;
    try {
      const raw = sessionStorage.getItem(NOTIFICATION_ROUTE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearPendingNotificationRoute() {
    try { sessionStorage.removeItem(NOTIFICATION_ROUTE_KEY); } catch (e) {}
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('screen') === 'notes') {
        u.searchParams.delete('screen');
        u.searchParams.delete('sourceType');
        u.searchParams.delete('sourceId');
        if (u.hash === '#notification') u.hash = '';
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  }

  function applyNotificationRoute(route, attempt = 0) {
    if (!route || route.screen !== 'notes') return false;
    if (typeof window.switchScreen !== 'function') {
      if (attempt < 20) setTimeout(() => applyNotificationRoute(route, attempt + 1), 150);
      return false;
    }
    try {
      window.switchScreen('notes');
      if (route.sourceType === 'ministry-note' && route.sourceId && typeof window.openMinistryNoteModal === 'function') {
        setTimeout(() => window.openMinistryNoteModal('', route.sourceId), 250);
      }
      clearPendingNotificationRoute();
      emit('notification:route', route);
      return true;
    } catch (e) {
      console.warn('[KHub.SW] Notification route failed:', e);
      if (attempt < 20) setTimeout(() => applyNotificationRoute(route, attempt + 1), 150);
      return false;
    }
  }

  function schedulePendingNotificationRoute() {
    const route = readPendingNotificationRoute();
    if (!route) return;
    rememberNotificationRoute(route);
    setTimeout(() => applyNotificationRoute(route), 350);
  }

  // ── Safe-state detection ───────────────────────────────────
  // "Safe" = no user interaction that would be disrupted by a reload.
  // Extend this list as your app grows (e.g. unsaved form data checks).
  function isSafeToReload() {
    // Any modal open?
    if (document.querySelector('.modal-backdrop')) return false;
    // Any input/textarea/select focused?
    const focused = document.activeElement;
    if (focused && ['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName)) return false;
    // Any form with dirty (unsaved) data?
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const inputs = form.querySelectorAll('input, textarea, select');
      for (const input of inputs) {
        if (input.value !== input.defaultValue) return false;
      }
    }
    // Don't reload if a push subscription sync is in-flight
    if (window.__ministryPushSyncActive) return false;
    return true;
  }

  // ── SW manager ────────────────────────────────────────────
  const UPDATE_CHECK_KEY = 'khub_last_update_check';
  const UPDATE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

  const SW = {
    registration: null,
    _reloading: false,

    async register() {
      if (!('serviceWorker' in navigator)) {
        console.warn('[KHub.SW] Service workers not supported.');
        return;
      }

      try {
        SW.registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        console.log('[KHub.SW] Registered. Scope:', SW.registration.scope);
      } catch (err) {
        console.warn('[KHub.SW] Registration failed:', err);
        return;
      }

      if (SW.registration.waiting && navigator.serviceWorker.controller) {
        console.log('[KHub.SW] Update already waiting. Safe to reload:', isSafeToReload());
        if (isSafeToReload()) SW._activateAndReload();
        else SW._showBanner();
      }

      // ── Listen for a newly installing SW ──────────────────
      SW.registration.addEventListener('updatefound', () => {
        const newSW = SW.registration.installing;
        if (!newSW) return;

        console.log('[KHub.SW] New SW installing…');

        newSW.addEventListener('statechange', () => {
          console.log('[KHub.SW] New SW state:', newSW.state);

          // New SW is installed and waiting; an existing SW is in control
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[KHub.SW] Update ready. Safe to reload:', isSafeToReload());

            if (isSafeToReload()) {
              // Quiet path: no user interaction in progress — reload silently
              SW._activateAndReload();
            } else {
              // Noisy path: user is doing something — show the banner
              SW._showBanner();
            }
          }
        });
      });

      // ── Listen for messages from the SW ───────────────────
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'RELOAD_READY' && !SW._reloading) {
          console.log('[KHub.SW] SW activated — reloading page.');
          SW._reloading = true;
          location.reload();
          return;
        }
        if (event.data?.type === 'NOTIFICATION_CLICK_ROUTE') {
          rememberNotificationRoute(event.data);
          applyNotificationRoute(event.data);
        }
      });

      // ── Force update check on every startup ───────────────
      SW._checkForUpdate({ force: true });

      // ── Schedule 12-hour periodic check ──────────────────
      SW._schedulePeriodicCheck();
    },

    // Called on page load — always triggers a SW re-fetch.
    // Also called by the periodic timer.
    _checkForUpdate(options = {}) {
      if (!SW.registration) return;

      const last  = parseInt(localStorage.getItem(UPDATE_CHECK_KEY) || '0', 10);
      const now   = Date.now();
      const due   = now - last >= UPDATE_INTERVAL_MS;

      // Always check on startup; periodic checks use the 12-hour gate.
      if (options.force || last === 0 || due) {
        console.log('[KHub.SW] Checking for updates…');
        SW.registration.update()
          .then(() => localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now())))
          .catch(err => console.warn('[KHub.SW] Update check failed:', err));
      }
    },

    // Re-check every hour; only triggers a real update if 12h have passed.
    _schedulePeriodicCheck() {
      setInterval(() => SW._checkForUpdate(), 60 * 60 * 1000); // check every hour
    },

    _showBanner() {
      const notice = document.getElementById('update-notice');
      if (notice) notice.hidden = false;
    },

    _hideBanner() {
      const notice = document.getElementById('update-notice');
      if (notice) notice.hidden = true;
    },

    // Send SKIP_WAITING → SW activates → broadcasts RELOAD_READY → we reload.
    _activateAndReload() {
      SW._hideBanner();
      if (SW.registration?.waiting) {
        SW.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange fires when new SW takes over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!SW._reloading) {
            SW._reloading = true;
            location.reload();
          }
        }, { once: true });
      } else {
        SW._checkForUpdate({ force: true });
        SW._showBanner();
      }
    },

    // Public: called when user clicks "Refresh" on the update banner
    applyUpdate() {
      console.log('[KHub.SW] User triggered update.');
      SW._activateAndReload();
    },
  };

  // ── Bootstrap ──────────────────────────────────────────────
  function init() {
    console.log(`[KHub] ${KHub.Config.appName} v${KHub.Config.version} (${KHub.Config.env})`);

    // Register SW
    SW.register();

    emit('app:ready');
    schedulePendingNotificationRoute();
    window.addEventListener('load', schedulePendingNotificationRoute);
    console.log('[KHub] App ready.');
  }

  // ── Expose on window.KHub ─────────────────────────────────
  window.KHub = window.KHub || {};
  Object.assign(window.KHub, { on, off, emit, SW });

  document.addEventListener('DOMContentLoaded', init);
})();
