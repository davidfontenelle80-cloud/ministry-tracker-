/**
 * cloud-backup.js - KHub Cloud Backup Module
 * Saves localStorage data to Firestore as both a device backup and shared latest device save.
 * The shared latest device save lets the same app restore the newest state on another device.
 */
(function () {
  'use strict';

  window.KHub = window.KHub || {};

  function getDeviceId() {
    var id = localStorage.getItem('khub-device-id');
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem('khub-device-id', id);
    }
    return id;
  }

  function appRef(appId) {
    return KHub.Firebase.db.collection('backups').doc(appId);
  }

  function deviceRef(appId) {
    return appRef(appId).collection('devices').doc(getDeviceId());
  }

  function latestRef(appId) {
    return appRef(appId).collection('devices').doc('latest');
  }

  function markerKey(appId) {
    return 'khub-cloud-backup-' + appId;
  }

  function collectKeys(exactKeys, scanPrefix) {
    var result = {};
    (exactKeys || []).forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v !== null) result[k] = v;
    });
    if (scanPrefix) {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith(scanPrefix)) result[k] = localStorage.getItem(k);
      }
    }
    return result;
  }

  function savedAtISO(data) {
    if (!data) return '';
    if (data.savedAtISO) return data.savedAtISO;
    if (data.savedAt && typeof data.savedAt.toDate === 'function') return data.savedAt.toDate().toISOString();
    return '';
  }

  function writeKeys(savedKeys) {
    Object.keys(savedKeys || {}).forEach(function (k) {
      localStorage.setItem(k, savedKeys[k]);
    });
  }

  function markSaved(appId, iso) {
    localStorage.setItem(markerKey(appId), iso || new Date().toISOString());
  }

  function ensureReady() {
    if (!window.KHub || !KHub.Firebase || !KHub.Firebase.db) {
      return Promise.reject(new Error('Firebase not ready'));
    }
    return null;
  }

  window.KHub.CloudBackup = {
    save: function (appId, exactKeys, scanPrefix) {
      var notReady = ensureReady();
      if (notReady) return notReady;

      var iso = new Date().toISOString();
      var payload = {
        appId: appId,
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
        savedAtISO: iso,
        deviceId: getDeviceId(),
        keys: collectKeys(exactKeys, scanPrefix)
      };

      return Promise.all([
        deviceRef(appId).set(payload),
        latestRef(appId).set(payload)
      ]).then(function () {
        markSaved(appId, iso);
        return iso;
      });
    },

    restore: function (appId, exactKeys, scanPrefix, onSuccess) {
      var notReady = ensureReady();
      if (notReady) return notReady;

      return latestRef(appId).get().then(function (latestSnap) {
        if (latestSnap.exists) return latestSnap;
        return deviceRef(appId).get();
      }).then(function (snap) {
        if (!snap.exists) return Promise.reject(new Error('no-backup'));
        var data = snap.data() || {};
        writeKeys(data.keys);
        markSaved(appId, savedAtISO(data));
        if (typeof onSuccess === 'function') onSuccess(data);
        return data;
      });
    },

    restoreLatestIfNewer: function (appId, exactKeys, scanPrefix, onSuccess) {
      var notReady = ensureReady();
      if (notReady) return notReady;

      return latestRef(appId).get().then(function (snap) {
        if (!snap.exists) return false;
        var data = snap.data() || {};
        var remoteISO = savedAtISO(data);
        var localISO = localStorage.getItem(markerKey(appId));
        if (remoteISO && localISO && Date.parse(remoteISO) <= Date.parse(localISO)) return false;
        writeKeys(data.keys);
        markSaved(appId, remoteISO);
        if (typeof onSuccess === 'function') onSuccess(data);
        return true;
      }).catch(function (e) {
        console.warn('[CloudBackup] restoreLatestIfNewer failed:', e);
        return false;
      });
    },

    lastSaved: function (appId) {
      return localStorage.getItem(markerKey(appId));
    },

    autoSave: function (appId, exactKeys, scanPrefix) {
      if (!window.KHub || !KHub.Firebase || !KHub.Firebase.db) return;
      var saving = false;
      function doSave() {
        if (saving) return;
        saving = true;
        KHub.CloudBackup.save(appId, exactKeys, scanPrefix)
          .catch(function (e) { console.warn('[CloudBackup] autoSave failed:', e); })
          .then(function () { saving = false; }, function () { saving = false; });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') doSave();
      });
      window.addEventListener('pagehide', function () { doSave(); });
    }
  };
})();