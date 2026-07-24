(function () {
  'use strict';

  var CARD_ID = 'mtNotifStatus';
  var LOCAL_ID_KEY = 'ministryPushSubscriptionId';
  var rendering = false;

  function isSpanish() {
    var lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (lang.indexOf('es') === 0) return true;
    try {
      return String(localStorage.getItem('mtLanguage') || localStorage.getItem('khub-language') || '').toLowerCase() === 'es';
    } catch (e) {
      return false;
    }
  }

  function copy() {
    return isSpanish() ? {
      title: 'Notificaciones',
      description: 'Activa o desactiva las notificaciones en este dispositivo. Volver a activarlas crea una suscripción nueva.',
      on: 'Activadas',
      off: 'Desactivadas',
      unavailable: 'No disponibles',
      denied: 'Bloqueadas en Ajustes',
      working: 'Actualizando…',
      test: 'Enviar notificación de prueba',
      debug: 'Ver diagnóstico',
      enabled: 'Las notificaciones se activaron con una suscripción nueva.',
      disabled: 'Las notificaciones se desactivaron en este dispositivo.',
      failed: 'No se pudo actualizar la configuración de notificaciones.',
      testSent: 'Se envió la notificación de prueba.',
      testFailed: 'No se pudo enviar la notificación de prueba.',
      code: 'Código de estado'
    } : {
      title: 'Notifications',
      description: 'Turn notifications on or off for this device. Turning them back on creates a fresh subscription.',
      on: 'On',
      off: 'Off',
      unavailable: 'Unavailable',
      denied: 'Blocked in Settings',
      working: 'Updating…',
      test: 'Send test notification',
      debug: 'View diagnostics',
      enabled: 'Notifications were enabled with a fresh subscription.',
      disabled: 'Notifications were turned off on this device.',
      failed: 'Notification settings could not be updated.',
      testSent: 'The test notification was sent.',
      testFailed: 'The test notification could not be sent.',
      code: 'Status code'
    };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getBrowserSubscription() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (registration) {
      return registration.pushManager ? registration.pushManager.getSubscription() : null;
    }).catch(function () { return null; });
  }

  function getState() {
    var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    var permission = ('Notification' in window) ? Notification.permission : 'unsupported';
    return getBrowserSubscription().then(function (subscription) {
      return {
        supported: supported,
        permission: permission,
        subscription: subscription,
        enabled: supported && permission === 'granted' && !!subscription
      };
    });
  }

  function clearLocalSubscriptionId() {
    try { localStorage.removeItem(LOCAL_ID_KEY); } catch (e) {}
  }

  function disableCurrentDevice() {
    return getBrowserSubscription().then(function (subscription) {
      if (!subscription) return false;
      return subscription.unsubscribe().catch(function () { return false; });
    }).then(function () {
      clearLocalSubscriptionId();
      return { ok: true };
    });
  }

  function enableWithFreshSubscription() {
    return disableCurrentDevice().then(function () {
      if (!window.MinistryPush || typeof window.MinistryPush.subscribe !== 'function') {
        throw new Error('Push client unavailable.');
      }
      return window.MinistryPush.subscribe();
    });
  }

  function statusCode(state) {
    if (!state.supported) return 'PUSH_UNSUPPORTED';
    if (state.permission === 'denied') return 'PUSH_PERMISSION_DENIED';
    if (state.enabled) return 'PUSH_ENABLED_SUBSCRIBED';
    if (state.permission === 'granted') return 'PUSH_GRANTED_NO_SUBSCRIPTION';
    return 'PUSH_PERMISSION_NOT_REQUESTED';
  }

  function announce(message, isError) {
    var node = document.getElementById('mtPushToggleMessage');
    if (!node) return;
    node.textContent = message || '';
    node.style.color = isError ? 'var(--danger, #dc2626)' : 'var(--text-dim, currentColor)';
  }

  function setBusy(busy) {
    var button = document.getElementById('mtPushToggle');
    var test = document.getElementById('mtPushTest');
    if (button) button.disabled = !!busy;
    if (test) test.disabled = !!busy;
  }

  function render() {
    if (rendering) return;
    var card = document.getElementById(CARD_ID);
    if (!card) return;
    rendering = true;
    getState().then(function (state) {
      var text = copy();
      var label = state.enabled ? text.on : text.off;
      if (!state.supported) label = text.unavailable;
      if (state.permission === 'denied') label = text.denied;
      var code = statusCode(state);
      card.innerHTML = ''
        + '<div class="row-between" style="gap:14px;align-items:center;">'
        +   '<div class="flex-1">'
        +     '<div class="text-xs uppercase tracking-wider text-dim font-semibold">' + escapeHtml(text.title) + '</div>'
        +     '<div class="text-xs text-faint" style="margin-top:5px;line-height:1.45;">' + escapeHtml(text.description) + '</div>'
        +   '</div>'
        +   '<button id="mtPushToggle" type="button" role="switch" aria-checked="' + (state.enabled ? 'true' : 'false') + '"'
        +     ' class="btn ' + (state.enabled ? 'btn-primary' : 'btn-secondary') + '" style="min-width:112px;justify-content:center;">'
        +     '<i class="fa-solid ' + (state.enabled ? 'fa-bell' : 'fa-bell-slash') + '"></i> '
        +     '<span>' + escapeHtml(label) + '</span>'
        +   '</button>'
        + '</div>'
        + '<div class="row gap-2" style="margin-top:10px;flex-wrap:wrap;">'
        +   '<button id="mtPushTest" type="button" class="btn btn-secondary text-xs"' + (state.enabled ? '' : ' disabled') + '>'
        +     '<i class="fa-solid fa-paper-plane"></i> ' + escapeHtml(text.test)
        +   '</button>'
        +   '<button id="mtPushDiagnostics" type="button" class="btn btn-secondary text-xs">'
        +     '<i class="fa-solid fa-stethoscope"></i> ' + escapeHtml(text.debug)
        +   '</button>'
        + '</div>'
        + '<div class="text-tiny text-faint" style="margin-top:8px;">' + escapeHtml(text.code) + ': <span class="font-mono">' + escapeHtml(code) + '</span></div>'
        + '<div id="mtPushToggleMessage" role="status" aria-live="polite" class="text-xs" style="min-height:18px;margin-top:6px;"></div>';

      document.getElementById('mtPushToggle').addEventListener('click', function () {
        var latestText = copy();
        setBusy(true);
        announce(latestText.working, false);
        var action = state.enabled ? disableCurrentDevice() : enableWithFreshSubscription();
        action.then(function (result) {
          if (result && result.ok === false) throw new Error(result.error || latestText.failed);
          announce(state.enabled ? latestText.disabled : latestText.enabled, false);
          setTimeout(render, 500);
        }).catch(function (error) {
          announce((error && error.message) || latestText.failed, true);
          setBusy(false);
        });
      });

      document.getElementById('mtPushTest').addEventListener('click', function () {
        var latestText = copy();
        setBusy(true);
        announce(latestText.working, false);
        if (!window.MinistryPush || typeof window.MinistryPush.sendTestPush !== 'function') {
          announce(latestText.testFailed, true);
          setBusy(false);
          return;
        }
        window.MinistryPush.sendTestPush().then(function (result) {
          if (!result || result.ok === false) throw new Error((result && result.error) || latestText.testFailed);
          announce(latestText.testSent, false);
          setBusy(false);
        }).catch(function (error) {
          announce((error && error.message) || latestText.testFailed, true);
          setBusy(false);
        });
      });

      document.getElementById('mtPushDiagnostics').addEventListener('click', function () {
        if (typeof window.showMinistryPushDebug === 'function') {
          window.showMinistryPushDebug();
        } else if (window.MinistryPush && window.MinistryPush.diagnose) {
          window.MinistryPush.diagnose().then(function (diagnostics) {
            window.alert(JSON.stringify(diagnostics, null, 2));
          });
        }
      });
    }).finally(function () {
      rendering = false;
    });
  }

  function boot() {
    var attempts = 0;
    function tryRender() {
      attempts += 1;
      if (document.getElementById(CARD_ID) && window.MinistryPush) {
        render();
        return;
      }
      if (attempts < 40) setTimeout(tryRender, 250);
    }
    tryRender();
    document.addEventListener('click', function (event) {
      if (event.target && (event.target.closest('[data-lang-set]') || event.target.closest('#langToggle'))) {
        setTimeout(render, 100);
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(render, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.MinistryPushToggle = {
    render: render,
    enableFresh: enableWithFreshSubscription,
    disableCurrentDevice: disableCurrentDevice,
    getState: getState
  };
})();
