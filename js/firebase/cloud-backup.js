/**
 * cloud-backup.js - KHub Cloud Backup Module
 * Saves localStorage data to a Firebase Auth user-scoped Firestore backup.
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

  function auth() {
    return window.KHub && KHub.Firebase && KHub.Firebase.auth;
  }

  function currentUser() {
    var a = auth();
    return a ? a.currentUser : null;
  }

  function authRequiredError() {
    var err = new Error('auth-required');
    err.code = 'auth-required';
    return err;
  }

  function ensureReady(requireUser) {
    if (!window.KHub || !KHub.Firebase || !KHub.Firebase.db || !KHub.Firebase.auth) {
      return Promise.reject(new Error('Firebase not ready'));
    }
    if (requireUser !== false && !currentUser()) {
      return Promise.reject(authRequiredError());
    }
    return null;
  }

  function appRef(appId) {
    return KHub.Firebase.db.collection('backups').doc(appId);
  }

  function userRef(appId) {
    return appRef(appId).collection('users').doc(currentUser().uid);
  }

  function deviceRef(appId) {
    return userRef(appId).collection('devices').doc(getDeviceId());
  }

  function latestRef(appId) {
    return userRef(appId).collection('meta').doc('latest');
  }

  function markerKey(appId) {
    var user = currentUser();
    return 'khub-cloud-backup-' + appId + (user ? '-' + user.uid : '');
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

  function localExactKeyIsNewer(data, exactKeys) {
    var remoteKeys = (data && data.keys) || {};
    for (var i = 0; i < (exactKeys || []).length; i++) {
      var key = exactKeys[i];
      var localRaw = localStorage.getItem(key);
      var remoteRaw = remoteKeys[key];
      if (!localRaw || !remoteRaw || localRaw === remoteRaw) continue;
      try {
        var localState = JSON.parse(localRaw);
        var remoteState = JSON.parse(remoteRaw);
        if (localState && remoteState && localState.updatedAt && remoteState.updatedAt) {
          if (Date.parse(localState.updatedAt) > Date.parse(remoteState.updatedAt)) return true;
        }
      } catch (e) {}
    }
    return false;
  }

  function getLatestSnapshot(appId) {
    return latestRef(appId).get().catch(function (e) {
      console.warn('[CloudBackup] latest read skipped:', e);
      return null;
    });
  }

  window.KHub.CloudAuth = {
    currentUser: currentUser,
    onChange: function (cb) {
      var a = auth();
      if (!a) return function () {};
      return a.onAuthStateChanged(cb);
    },
    signIn: function (email, password) {
      var notReady = ensureReady(false);
      if (notReady) return notReady;
      return auth().signInWithEmailAndPassword(String(email || '').trim(), password);
    },
    signUp: function (email, password) {
      var notReady = ensureReady(false);
      if (notReady) return notReady;
      return auth().createUserWithEmailAndPassword(String(email || '').trim(), password);
    },
    signOut: function () {
      var a = auth();
      return a ? a.signOut() : Promise.resolve();
    },
    resetPassword: function (email) {
      var notReady = ensureReady(false);
      if (notReady) return notReady;
      return auth().sendPasswordResetEmail(String(email || '').trim());
    }
  };

  window.KHub.CloudBackup = {
    save: function (appId, exactKeys, scanPrefix) {
      var notReady = ensureReady(true);
      if (notReady) return notReady;

      var user = currentUser();
      var iso = new Date().toISOString();
      var payload = {
        appId: appId,
        uid: user.uid,
        email: user.email || '',
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
        savedAtISO: iso,
        deviceId: getDeviceId(),
        keys: collectKeys(exactKeys, scanPrefix)
      };

      return deviceRef(appId).set(payload).then(function () {
        return latestRef(appId).set(payload);
      }).then(function () {
        markSaved(appId, iso);
        return iso;
      });
    },

    restore: function (appId, exactKeys, scanPrefix, onSuccess) {
      var notReady = ensureReady(true);
      if (notReady) return notReady;

      return getLatestSnapshot(appId).then(function (latestSnap) {
        if (latestSnap && latestSnap.exists) return latestSnap;
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
      var notReady = ensureReady(true);
      if (notReady) {
        return notReady.catch(function (e) {
          if (e && e.code === 'auth-required') return false;
          throw e;
        });
      }

      return getLatestSnapshot(appId).then(function (snap) {
        if (!snap || !snap.exists) return false;
        var data = snap.data() || {};
        var remoteISO = savedAtISO(data);
        var localISO = localStorage.getItem(markerKey(appId));
        if (remoteISO && localISO && Date.parse(remoteISO) <= Date.parse(localISO)) return false;
        if (localExactKeyIsNewer(data, exactKeys)) return false;
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

    isSignedIn: function () {
      return !!currentUser();
    },

    autoSave: function (appId, exactKeys, scanPrefix) {
      if (!window.KHub || !KHub.Firebase || !KHub.Firebase.db || !KHub.Firebase.auth) return;
      var saving = false;
      function doSave() {
        if (saving || !currentUser()) return;
        saving = true;
        KHub.CloudBackup.save(appId, exactKeys, scanPrefix)
          .catch(function (e) { console.warn('[CloudBackup] autoSave failed:', e); })
          .then(function () { saving = false; }, function () { saving = false; });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') doSave();
      });
      window.addEventListener('pagehide', function () { doSave(); });
      return doSave;
    }
  };
})();