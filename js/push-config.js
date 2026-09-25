(function () {
  'use strict';

  window.MINISTRY_TRACKER_PUSH_CONFIG = Object.assign({
    // Public values only. Do not put VAPID private keys or Cloudflare tokens here.
    workerUrl: 'https://ministry-tracker-push.davidfontenelle80.workers.dev',
    vapidPublicKey: 'BK8suBo_HzxgEM7XP_A-CQF9R4bbspmdFZ54lhWxME0_tBVDcaJA_H9MdpicZSPV_dz_hCq9r4LcGOUq9SAJSJY',
    appName: 'Ministry Tracker'
  }, window.MINISTRY_TRACKER_PUSH_CONFIG || {});

  function loadModule(src) {
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.async = false;
    document.head.appendChild(script);
  }

  // Reusable notification control plus the Notes / Return Visits / Bible Studies organizer.
  // Both modules wait for their app dependencies before initializing.
  loadModule('js/push-toggle.js');
  loadModule('js/organizer.js');
})();
