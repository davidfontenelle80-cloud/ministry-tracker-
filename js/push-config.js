(function () {
  'use strict';

  window.MINISTRY_TRACKER_PUSH_CONFIG = Object.assign({
    // Public values only. Do not put VAPID private keys or Cloudflare tokens here.
    workerUrl: 'https://ministry-tracker-push.davidfontenelle80.workers.dev',
    vapidPublicKey: 'BK8suBo_HzxgEM7XP_A-CQF9R4bbspmdFZ54lhWxME0_tBVDcaJA_H9MdpicZSPV_dz_hCq9r4LcGOUq9SAJSJY',
    appName: 'Ministry Tracker'
  }, window.MINISTRY_TRACKER_PUSH_CONFIG || {});

  // Load the reusable device-specific notification control without changing
  // the large app bundle. The module waits for push.js and the Settings card.
  var script = document.createElement('script');
  script.src = 'js/push-toggle.js';
  script.defer = true;
  document.head.appendChild(script);
})();
