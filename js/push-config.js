(function () {
  'use strict';

  window.MINISTRY_TRACKER_PUSH_CONFIG = Object.assign({
    // Public values only. Do not put VAPID private keys or Cloudflare tokens here.
    workerUrl: 'https://ministry-tracker-push.davidfontenelle80.workers.dev',
    vapidPublicKey: 'BK8suBo_HzxgEM7XP_A-CQF9R4bbspmdFZ54lhWxME0_tBVDcaJA_H9MdpicZSPV_dz_hCq9r4LcGOUq9SAJSJY',
    appName: 'Ministry Tracker'
  }, window.MINISTRY_TRACKER_PUSH_CONFIG || {});
})();
