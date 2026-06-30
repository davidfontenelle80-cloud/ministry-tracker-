(function () {
  'use strict';

  var DEFAULT_CONFIG = {
    workerUrl: '',
    vapidPublicKey: '',
    appName: 'Ministry Tracker'
  };

  function cfg() {
    var external = window.MINISTRY_TRACKER_PUSH_CONFIG || {};
    return {
      workerUrl: String(external.workerUrl || DEFAULT_CONFIG.workerUrl || '').replace(/\/+$/, ''),
      vapidPublicKey: String(external.vapidPublicKey || DEFAULT_CONFIG.vapidPublicKey || '').trim(),
      appName: String(external.appName || DEFAULT_CONFIG.appName)
    };
  }

  function isConfigured() {
    var c = cfg();
    return !!(c.workerUrl && c.vapidPublicKey);
  }

  function requireConfigured() {
    if (!isConfigured()) {
      throw new Error('Background push is not configured. Set MINISTRY_TRACKER_PUSH_CONFIG.workerUrl and vapidPublicKey.');
    }
    return cfg();
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function uint8ArrayToUrlBase64(bytes) {
    var raw = '';
    var arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    for (var i = 0; i < arr.length; i++) raw += String.fromCharCode(arr[i]);
    return window.btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function subscriptionUsesKey(subscription, vapidPublicKey) {
    if (!subscription || !subscription.options || !subscription.options.applicationServerKey) return true;
    return uint8ArrayToUrlBase64(subscription.options.applicationServerKey) === String(vapidPublicKey || '').replace(/=+$/g, '');
  }

  function getSubscriptionId() {
    try { return localStorage.getItem('ministryPushSubscriptionId') || ''; } catch (e) { return ''; }
  }

  function setSubscriptionId(id) {
    try {
      if (id) localStorage.setItem('ministryPushSubscriptionId', id);
    } catch (e) {}
  }

  function log(action, details) {
    try {
      console.info('[MinistryPush]', action, Object.assign({
        workerUrl: cfg().workerUrl,
        hasVapidPublicKey: !!cfg().vapidPublicKey
      }, details || {}));
    } catch (e) {}
  }

  function jsonFetch(url, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    return fetch(url, options).then(function (res) {
      return res.text().then(function (txt) {
        var data = {};
        if (txt) {
          try { data = JSON.parse(txt); } catch (e) { data = { raw: txt }; }
        }
        if (!res.ok) {
          var err = new Error(data.error || data.message || ('Push request failed: ' + res.status));
          err.status = res.status;
          err.data = data;
          log('request:failed', { url: url, status: res.status, message: err.message });
          throw err;
        }
        return data;
      });
    });
  }

  function diagnose() {
    var c = cfg();
    return Promise.resolve({
      configured: isConfigured(),
      workerUrl: c.workerUrl,
      hasVapidPublicKey: !!c.vapidPublicKey,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
      permission: ('Notification' in window) ? Notification.permission : 'unsupported',
      subscriptionId: getSubscriptionId()
    });
  }

  function subscribe() {
    var c = requireConfigured();
    if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Service workers are not supported.'));
    if (!('PushManager' in window)) return Promise.reject(new Error('PushManager is not supported.'));
    if (!('Notification' in window)) return Promise.reject(new Error('Notifications are not supported.'));

    var permissionFlow = Notification.permission === 'granted'
      ? Promise.resolve('granted')
      : Notification.requestPermission();

    return permissionFlow.then(function (permission) {
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      log('subscribe:permission-granted');
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing && subscriptionUsesKey(existing, c.vapidPublicKey)) return existing;
        if (existing) {
          log('subscribe:refreshing-stale-subscription');
          return existing.unsubscribe().then(function () { return null; });
        }
        return null;
      }).then(function (existing) {
        if (existing) return existing;
        log('subscribe:creating-browser-subscription');
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(c.vapidPublicKey)
        });
      });
    }).then(function (sub) {
      return jsonFetch(c.workerUrl + '/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          app: 'ministry-tracker',
          subscription: sub,
          userAgent: navigator.userAgent
        })
      }).then(function (data) {
        setSubscriptionId(data.id || data.subscriptionId || '');
        log('subscribe:saved', { subscriptionId: data.id || data.subscriptionId || '' });
        return data;
      });
    });
  }

  function syncReminder(sourceType, sourceId, title, body, fireAt) {
    var c = requireConfigured();
    return subscribe().then(function (subData) {
      log('reminder:sync', { sourceType: sourceType, sourceId: sourceId, fireAt: fireAt });
      return jsonFetch(c.workerUrl + '/api/reminders', {
        method: 'POST',
        body: JSON.stringify({
          app: 'ministry-tracker',
          subscriptionId: subData.id || subData.subscriptionId || getSubscriptionId(),
          sourceType: sourceType,
          sourceId: sourceId,
          title: title,
          body: body || '',
          fireAt: fireAt
        })
      });
    });
  }

  function clearReminder(sourceType, sourceId) {
    var c = requireConfigured();
    var id = getSubscriptionId();
    if (!id) return Promise.resolve({ ok: true, skipped: 'no-subscription' });
    var url = c.workerUrl + '/api/reminders/' + encodeURIComponent(sourceType) + '/' + encodeURIComponent(sourceId);
    url += '?subscriptionId=' + encodeURIComponent(id);
    log('reminder:clear', { sourceType: sourceType, sourceId: sourceId, subscriptionId: id });
    return jsonFetch(url, { method: 'DELETE' });
  }

  function sendTestPush() {
    var c = requireConfigured();
    return subscribe().then(function (subData) {
      log('test-push:send', { subscriptionId: subData.id || subData.subscriptionId || getSubscriptionId() });
      return jsonFetch(c.workerUrl + '/api/test-push', {
        method: 'POST',
        body: JSON.stringify({
          app: 'ministry-tracker',
          subscriptionId: subData.id || subData.subscriptionId || getSubscriptionId(),
          title: 'Ministry Tracker',
          body: 'Test reminder notification'
        })
      });
    });
  }

  window.MinistryPush = {
    isConfigured: isConfigured,
    diagnose: diagnose,
    subscribe: subscribe,
    syncReminder: syncReminder,
    clearReminder: clearReminder,
    sendTestPush: sendTestPush
  };

  window.MinistryPushDebug = {
    diagnose: diagnose,
    subscribe: subscribe,
    testPush: sendTestPush,
    getSubscriptionId: getSubscriptionId
  };
})();
