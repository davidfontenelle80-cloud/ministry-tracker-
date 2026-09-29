/**
 * calendar-feed.js — Ministry Tracker
 *
 * Keeps one subscribed calendar ("Ministry") in sync with the app.
 * The phone subscribes once to a private link; after that every save in the app
 * updates the Worker copy, and the phone's calendar refreshes on its own.
 *
 * Why this file wraps saveState(): every edit path in the app (return visits, notes,
 * Bible studies, restores) ends in the global saveState(), so hooking it here means
 * no edits to app.js / revisits.js / organizer.js.
 *
 * Per-device by design: config lives in its own localStorage key (not in `state`),
 * so it is not copied by exports or cloud backup, and two devices never overwrite
 * each other's feed.
 */
(function (global) {
  'use strict';

  var STORE_KEY = 'khub-calendar-feed-v1';
  var DEBOUNCE_MS = 2500;
  var PAST_DAYS = 60;
  var debounceTimer = null;
  var inFlight = null;
  var cfg = loadCfg();

  /* ── small helpers ─────────────────────────────────────────────── */
  function S() { try { return state; } catch (_) { return null; } } // global `let state` from app.js
  function L(en, es) { var s = S(); return s && s.lang === 'es' ? es : en; }
  function workerUrl() {
    var c = global.MINISTRY_TRACKER_PUSH_CONFIG || {};
    return String(c.workerUrl || '').replace(/\/+$/, '');
  }
  function say(msg) { if (typeof global.toast === 'function') global.toast(msg); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function randomToken(bytes) {
    var a = new Uint8Array(bytes);
    global.crypto.getRandomValues(a);
    var bin = '';
    for (var i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function loadCfg() {
    try {
      var c = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (c && typeof c === 'object') return c;
    } catch (_) { /* ignore */ }
    return { enabled: false };
  }
  function saveCfg() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (_) { /* ignore */ } }
  function hash(text) { // FNV-1a, only used to skip unchanged uploads
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  }
  function todayKey(offsetDays) {
    var d = new Date(); d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hasCoords(v) {
    return v && v.lat !== null && v.lat !== undefined && v.lat !== '' && v.lng !== null && v.lng !== undefined && v.lng !== '' &&
      Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng));
  }
  function mapLink(v) {
    var target = hasCoords(v) ? (+Number(v.lat).toFixed(6)) + ',' + (+Number(v.lng).toFixed(6)) : String(v.address || '').trim();
    return target ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(target) : '';
  }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var TIME_RE = /^\d{2}:\d{2}$/;

  /* ── what goes on the calendar ─────────────────────────────────── */
  // Phone numbers and emails are intentionally never sent.
  function buildEvents() {
    var st = S();
    if (!st) return [];
    var since = todayKey(-PAST_DAYS);
    var out = [];
    function keep(date) { return DATE_RE.test(date || '') && date >= since; }
    function time(t) { return TIME_RE.test(t || '') ? t : ''; }

    (st.ministryRevisits || []).forEach(function (v) {
      if (!v || v.status === 'completed' || !keep(v.dueDate)) return;
      var place = [v.reference, v.address].filter(Boolean).join(' · ');
      out.push({
        uid: 'rv-' + v.id, kind: 'revisit',
        title: L('Return Visit: ', 'Revisita: ') + (v.name || ''),
        date: v.dueDate, time: time(v.dueTime), durationMin: 30,
        location: place || (hasCoords(v) ? (+Number(v.lat).toFixed(6)) + ', ' + (+Number(v.lng).toFixed(6)) : ''),
        description: [v.nextTopic ? L('Next topic: ', 'Próximo tema: ') + v.nextTopic : '', v.leftWith ? L('Left: ', 'Dejó: ') + v.leftWith : ''].filter(Boolean).join('\n'),
        url: mapLink(v)
      });
    });
    (st.ministryNotes || []).forEach(function (n) {
      if (!n || n.archived || n.completed || n.status === 'done' || n.status === 'completed' || !keep(n.dueDate)) return;
      out.push({
        uid: 'note-' + n.id, kind: 'note',
        title: n.title || L('Note', 'Nota'),
        date: n.dueDate, time: time(n.dueTime), durationMin: 30,
        description: String(n.body || '')
      });
    });
    (st.ministryBibleStudies || []).forEach(function (s) {
      if (!s || s.status === 'completed' || !keep(s.dueDate)) return;
      out.push({
        uid: 'bs-' + s.id, kind: 'study',
        title: L('Bible Study: ', 'Estudio bíblico: ') + (s.name || ''),
        date: s.dueDate, time: time(s.dueTime), durationMin: 60,
        location: s.address || '',
        description: [s.publication, s.lesson, s.notes].filter(Boolean).join('\n')
      });
    });
    out.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    return out;
  }

  /* ── network ───────────────────────────────────────────────────── */
  function api(method, body) {
    return fetch(workerUrl() + '/api/feed/' + encodeURIComponent(cfg.id), {
      method: method,
      headers: Object.assign({ authorization: 'Bearer ' + cfg.key }, body ? { 'content-type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || data.ok === false) {
          var err = new Error(data.error || ('HTTP ' + res.status));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function syncNow(force) {
    if (!cfg.enabled || !cfg.id || !cfg.key || !workerUrl()) return Promise.resolve({ skipped: true });
    if (inFlight) return inFlight.then(function () { return syncNow(force); });
    var events = buildEvents();
    var payload = { app: 'ministry-tracker', calName: L('Ministry', 'Ministerio'), events: events };
    var h = hash(JSON.stringify(payload));
    if (!force && h === cfg.lastHash) return Promise.resolve({ skipped: true, unchanged: true });
    inFlight = api('POST', payload).then(function (data) {
      cfg.lastHash = h; cfg.lastSyncAt = new Date().toISOString(); cfg.lastError = ''; cfg.lastCount = events.length;
      saveCfg(); renderCard();
      return data;
    }).catch(function (e) {
      cfg.lastError = e && e.message ? e.message : 'sync failed';
      saveCfg(); renderCard();
      throw e;
    }).finally(function () { inFlight = null; });
    return inFlight;
  }
  function scheduleSync() {
    if (!cfg.enabled) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { syncNow(false).catch(function () { /* retried on next save / open */ }); }, DEBOUNCE_MS);
  }

  /* ── on / off / reset ──────────────────────────────────────────── */
  function applyCalendarOnSaveGuard() {
    var st = S();
    document.documentElement.classList.toggle('cal-feed-on', !!cfg.enabled);
    if (cfg.enabled && st && st.revisitSettings && st.revisitSettings.calendarOnSave) {
      cfg.prevCalendarOnSave = true;
      st.revisitSettings.calendarOnSave = false; // avoid duplicate one-off .ics events
      saveCfg();
    }
  }
  function enable() {
    if (!workerUrl()) { say(L('Calendar service is not configured.', 'El servicio de calendario no está configurado.')); return Promise.resolve(); }
    cfg = { enabled: true, id: randomToken(18), key: randomToken(32), lastHash: '', prevCalendarOnSave: cfg.prevCalendarOnSave };
    saveCfg();
    return syncNow(true).then(function () {
      applyCalendarOnSaveGuard();
      if (typeof global.saveState === 'function') global.saveState();
      renderCard();
      say(L('Calendar feed is on. Now tap “Subscribe”.', 'El calendario está activado. Ahora toca “Suscribirse”.'));
    }).catch(function (e) {
      cfg = { enabled: false };
      saveCfg(); renderCard();
      say(e && e.status === 404
        ? L('The calendar service isn’t live yet. Try again after it’s deployed.', 'El servicio de calendario aún no está activo. Inténtalo después de publicarlo.')
        : L('Could not turn on the calendar feed. Check your connection.', 'No se pudo activar el calendario. Revisa tu conexión.'));
    });
  }
  function disable() {
    if (!confirm(L('Turn off the calendar feed? The app will stop updating it. Afterwards, delete the “Ministry” subscription in your phone’s Calendar.',
      '¿Desactivar el calendario? La app dejará de actualizarlo. Después borra la suscripción “Ministerio” en el Calendario del teléfono.'))) return Promise.resolve();
    var old = cfg;
    var done = function () {
      var st = S();
      if (old.prevCalendarOnSave && st && st.revisitSettings) { st.revisitSettings.calendarOnSave = true; if (typeof global.saveState === 'function') global.saveState(); }
      cfg = { enabled: false }; saveCfg();
      document.documentElement.classList.remove('cal-feed-on');
      renderCard();
      say(L('Calendar feed turned off.', 'Calendario desactivado.'));
    };
    return api('DELETE').then(done, done);
  }
  function resetLink() {
    if (!confirm(L('Make a new private link? The old link stops working and you will need to subscribe again.',
      '¿Crear un enlace privado nuevo? El anterior dejará de funcionar y tendrás que suscribirte otra vez.'))) return Promise.resolve();
    var prev = cfg.prevCalendarOnSave;
    return api('DELETE').catch(function () { /* old one may already be gone */ }).then(function () {
      cfg = { enabled: false, prevCalendarOnSave: prev };
      return enable();
    });
  }

  function httpsLink() { return cfg.id ? workerUrl() + '/feed/' + cfg.id + '.ics' : ''; }
  function webcalLink() { return httpsLink().replace(/^https:/, 'webcal:'); }
  function copyLink() {
    var link = httpsLink();
    var ok = function () { say(L('Link copied.', 'Enlace copiado.')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(ok, function () { prompt(L('Copy this link', 'Copia este enlace'), link); });
    else prompt(L('Copy this link', 'Copia este enlace'), link);
  }

  /* ── Settings card ─────────────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById('calFeedStyles')) return;
    var st = document.createElement('style');
    st.id = 'calFeedStyles';
    st.textContent =
      '.cal-feed-on [data-rv-view-calendar],.cal-feed-on [data-org-note-calendar],.cal-feed-on [data-org-study-calendar],' +
      '.cal-feed-on label.rv-check:has(#orgNoteCalendarOnSave),.cal-feed-on label.rv-check:has(#orgStudyCalendarOnSave),' +
      '.cal-feed-on label.rv-check:has([data-rv-setting="calendarOnSave"]),.cal-feed-on label.rv-field:has([data-rv-setting="calendarMode"]){display:none!important}' +
      '#calFeedCard .cal-feed-actions{display:flex;flex-wrap:wrap;gap:8px}#calFeedCard .cal-feed-actions>*{flex:1 1 auto;justify-content:center;text-decoration:none}';
    document.head.appendChild(st);
  }
  function ensureCard() {
    var existing = document.getElementById('calFeedCard');
    if (existing) return existing;
    var screen = document.getElementById('screen-settings');
    if (!screen) return null;
    var card = document.createElement('div');
    card.id = 'calFeedCard';
    card.className = 'card stack-3';
    card.style.marginBottom = '16px';
    var anchor = document.getElementById('mtNotifStatus');
    if (anchor && anchor.parentNode === screen) anchor.insertAdjacentElement('afterend', card);
    else screen.appendChild(card);
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cal-feed]');
      if (!b) return;
      var act = b.getAttribute('data-cal-feed');
      if (act === 'subscribe') return; // plain link, let the browser hand it to Calendar
      e.preventDefault();
      if (b.disabled) return;
      b.disabled = true;
      var p = act === 'on' ? enable() : act === 'off' ? disable() : act === 'reset' ? resetLink() : act === 'sync' ? syncNow(true).then(function () { say(L('Calendar updated.', 'Calendario actualizado.')); }, function () { say(L('Could not update. Will retry.', 'No se pudo actualizar. Se reintentará.')); }) : null;
      if (act === 'copy') copyLink();
      Promise.resolve(p).finally(function () { b.disabled = false; });
    });
    return card;
  }
  function fmtWhen(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(L('en-US', 'es-ES'), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function renderCard() {
    var card = ensureCard();
    if (!card) return;
    var title = '<div class="text-xs uppercase tracking-wider text-dim font-semibold">' + esc(L('Calendar feed', 'Calendario suscrito')) + '</div>';
    if (!cfg.enabled) {
      card.innerHTML = title +
        '<div class="text-sm">' + esc(L('Show your return visits, notes, and Bible studies in your phone’s calendar. Changes and deletes in the app update the calendar automatically.',
          'Muestra tus revisitas, notas y estudios en el calendario del teléfono. Los cambios y borrados en la app se actualizan solos.')) + '</div>' +
        '<div class="text-tiny text-faint">' + esc(L('Private to this device. Phone numbers are never included.', 'Privado para este dispositivo. Nunca se incluyen números de teléfono.')) + '</div>' +
        '<div class="cal-feed-actions"><button type="button" class="btn btn-primary" data-cal-feed="on"><i class="fa-solid fa-calendar-check"></i> ' + esc(L('Turn on', 'Activar')) + '</button></div>';
      return;
    }
    var status = cfg.lastError
      ? '<span style="color:var(--danger)">' + esc(L('Last update failed — will retry on next save.', 'Falló la última actualización; se reintentará al guardar.')) + '</span>'
      : esc(L('Updated ', 'Actualizado ') + fmtWhen(cfg.lastSyncAt) + ' · ' + (cfg.lastCount || 0) + ' ' + (cfg.lastCount === 1 ? L('event', 'evento') : L('events', 'eventos')));
    card.innerHTML = title +
      '<div class="text-sm">' + esc(L('On. Subscribe once, then your calendar follows the app.', 'Activado. Suscríbete una vez y el calendario seguirá la app.')) + '</div>' +
      '<div class="text-tiny text-faint">' + status + '</div>' +
      '<div class="cal-feed-actions">' +
        '<a class="btn btn-primary" data-cal-feed="subscribe" href="' + esc(webcalLink()) + '"><i class="fa-solid fa-calendar-plus"></i> ' + esc(L('Subscribe', 'Suscribirse')) + '</a>' +
        '<button type="button" class="btn btn-secondary" data-cal-feed="copy"><i class="fa-solid fa-link"></i> ' + esc(L('Copy link', 'Copiar enlace')) + '</button>' +
      '</div>' +
      '<div class="cal-feed-actions">' +
        '<button type="button" class="btn btn-secondary" data-cal-feed="sync"><i class="fa-solid fa-rotate"></i> ' + esc(L('Update now', 'Actualizar')) + '</button>' +
        '<button type="button" class="btn btn-secondary" data-cal-feed="reset">' + esc(L('New link', 'Nuevo enlace')) + '</button>' +
        '<button type="button" class="btn btn-secondary" data-cal-feed="off">' + esc(L('Turn off', 'Desactivar')) + '</button>' +
      '</div>' +
      '<div class="text-tiny text-faint">' + esc(L('iPhone checks for changes on its own schedule. To make it faster: Settings › Calendar › Accounts › Fetch New Data › every 15 minutes. Your app reminders still come from this app.',
        'El iPhone busca cambios por su cuenta. Para que sea más rápido: Ajustes › Calendario › Cuentas › Obtener datos › cada 15 minutos. Los avisos siguen llegando desde esta app.')) + '</div>';
  }

  /* ── wiring ────────────────────────────────────────────────────── */
  function hookSaveState() {
    var original = global.saveState;
    if (typeof original !== 'function' || original.__calFeedHooked) return typeof original === 'function';
    var wrapped = function () {
      var result = original.apply(this, arguments);
      try { scheduleSync(); } catch (_) { /* never break saving */ }
      return result;
    };
    wrapped.__calFeedHooked = true;
    global.saveState = wrapped;
    return true;
  }
  function init() {
    if (!hookSaveState()) { setTimeout(init, 250); return; }
    ensureStyles();
    applyCalendarOnSaveGuard();
    renderCard();
    var screen = document.getElementById('screen-settings');
    if (screen && global.MutationObserver) {
      new MutationObserver(function () { if (screen.classList.contains('active')) renderCard(); })
        .observe(screen, { attributes: true, attributeFilter: ['class'] });
    }
    // Catch anything saved while offline, and dates that just rolled past the window.
    if (cfg.enabled) scheduleSync();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') scheduleSync(); });
    global.addEventListener('online', scheduleSync);
  }

  global.MinistryCalendarFeed = {
    buildEvents: buildEvents, syncNow: syncNow, enable: enable, disable: disable,
    isEnabled: function () { return !!cfg.enabled; }, link: httpsLink
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
