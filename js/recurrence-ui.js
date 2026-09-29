/** Shared bilingual scheduling controls. Recurrence is opt-in; legacy weekly hints stay hints. */
(function (global) {
  'use strict';
  var R = global.MinistryRecurrence, handlers = {}, active = null;
  function L(en, es) { return state.lang === 'es' ? es : en; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function field(label, input) { return '<label class="rv-field"><span>' + esc(label) + '</span>' + input + '</label>'; }
  function zone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  function mountEditor(form, record, dateId, timeId) {
    var old = form.querySelector('[data-recurrence-editor]'); if (old) old.remove();
    var r = R.normalize(record && record.recurrence), box = document.createElement('fieldset');
    box.className = 'rv-schedule-box'; box.dataset.recurrenceEditor = '';
    box.innerHTML = '<legend>' + esc(L('Repeat (optional)', 'Repetir (opcional)')) + '</legend>' +
      field(L('Frequency', 'Frecuencia'), '<select data-rec-frequency><option value="">' + esc(L('Does not repeat', 'No se repite')) + '</option><option value="daily">' + esc(L('Daily', 'Diariamente')) + '</option><option value="weekly">' + esc(L('Weekly', 'Semanalmente')) + '</option><option value="monthly">' + esc(L('Monthly', 'Mensualmente')) + '</option></select>') +
      '<div data-rec-settings><div class="rv-grid-2">' + field(L('Repeat every (1–12)', 'Repetir cada (1–12)'), '<input data-rec-interval type="number" min="1" max="12" step="1" value="1">') + field(L('End date (optional)', 'Fecha final (opcional)'), '<input data-rec-end type="date">') + '</div>' +
      field(L('Time zone', 'Zona horaria'), '<input data-rec-zone maxlength="100" value="' + esc(r ? r.timeZone : zone()) + '">') +
      '<p class="rv-muted">' + esc(L('Uses the selected date’s weekday or day of month. Months without that day are skipped.', 'Usa el día de la semana o del mes de la fecha elegida. Se omiten los meses que no tienen ese día.')) + '</p>' +
      '<label class="rv-check"><input data-rec-paused type="checkbox"><span>' + esc(L('Pause repeating', 'Pausar repetición')) + '</span></label>' +
      (r ? field(L('When changing the date or time', 'Al cambiar la fecha u hora'), '<select data-rec-scope><option value="once">' + esc(L('This occurrence only', 'Solo esta ocasión')) + '</option><option value="future">' + esc(L('Change the future schedule', 'Cambiar el horario futuro')) + '</option></select>') : '') + '</div>';
    var anchor = form.querySelector('.rv-dialog-actions'); form.insertBefore(box, anchor || null);
    box.querySelector('[data-rec-frequency]').value = r ? r.frequency : '';
    box.querySelector('[data-rec-interval]').value = r ? r.interval : 1;
    box.querySelector('[data-rec-end]').value = r ? r.endDate : '';
    box.querySelector('[data-rec-paused]').checked = !!(r && r.paused);
    function update() { var on = !!box.querySelector('[data-rec-frequency]').value; box.querySelector('[data-rec-settings]').hidden = !on; box.querySelectorAll('[data-rec-settings] input,[data-rec-settings] select').forEach(function (x) { x.disabled = !on; }); }
    box.querySelector('[data-rec-frequency]').addEventListener('change', update); update();
    form.__recurrenceEdit = { prev: record ? Object.assign({}, record, { recurrence: r }) : null, dateId: dateId, timeId: timeId };
  }
  function readEditor(form, record) {
    var box = form.querySelector('[data-recurrence-editor]'); if (!box) return record;
    var meta = form.__recurrenceEdit, prev = meta.prev, old = R.normalize(prev && prev.recurrence);
    var frequency = box.querySelector('[data-rec-frequency]').value;
    if (!frequency) return Object.assign({}, record, { recurrence: null, occurrenceKey: '' });
    var date = document.getElementById(meta.dateId).value, time = document.getElementById(meta.timeId).value;
    var interval = Number(box.querySelector('[data-rec-interval]').value), endDate = box.querySelector('[data-rec-end]').value;
    var timeZone = box.querySelector('[data-rec-zone]').value.trim(), paused = box.querySelector('[data-rec-paused]').checked;
    var future = !old || old.frequency !== frequency || old.interval !== interval || old.timeZone !== timeZone || (box.querySelector('[data-rec-scope]') && box.querySelector('[data-rec-scope]').value === 'future');
    var r = old ? Object.assign({}, old, { exceptions: Object.assign({}, old.exceptions) }) : {};
    if (future) r = { startDate: date || (old && old.startDate), time: time, exceptions: {}, completedThrough: '', oneTime: null };
    Object.assign(r, { frequency: frequency, interval: interval, endDate: endDate, timeZone: timeZone, paused: paused });
    r = R.normalize(r);
    if (!r) throw new Error(L('Check the repeat start date, end date, interval and time zone.', 'Revisa la fecha inicial, la final, el intervalo y la zona horaria.'));
    var next = Object.assign({}, record, { recurrence: r, occurrenceKey: prev ? prev.occurrenceKey : '' });
    if (!future && (date !== prev.dueDate || time !== prev.dueTime)) {
      if (!date) throw new Error(L('Use Pause to suspend a recurring schedule.', 'Usa Pausar para suspender un horario recurrente.'));
      next = R.move(next, date, time, 'once');
    }
    if (!paused) next.recurrence.oneTime = null;
    return R.project(next);
  }
  function summary(record) {
    var r = R.normalize(record.recurrence); if (!r) return '';
    var units = {daily:[L('day','día'),L('days','días')],weekly:[L('week','semana'),L('weeks','semanas')],monthly:[L('month','mes'),L('months','meses')]};
    var unit = units[r.frequency][r.interval===1?0:1];
    return (r.paused ? L('Paused', 'En pausa') : L('Every ', 'Cada ') + (r.interval===1?'':r.interval+' ') + unit) + ' · ' + r.timeZone + (r.endDate ? ' · ' + L('Ends ', 'Termina ') + r.endDate : '');
  }
  function mountDetail(container, type, record) {
    var old = container.querySelector('[data-rec-detail]'); if (old) old.remove();
    if (!R.normalize(record.recurrence)) return;
    var box = document.createElement('div'); box.dataset.recDetail = ''; box.className = 'rv-schedule-box';
    box.innerHTML = '<p class="rv-muted">' + esc(summary(record)) + '</p><button class="btn btn-secondary" type="button">' + esc(L('Manage repeating schedule', 'Administrar repetición')) + '</button>';
    box.querySelector('button').addEventListener('click', function () { openManager(type, record.id); });
    container.appendChild(box);
  }
  function manager() {
    var d = document.getElementById('recurrenceManager'); if (d) return d;
    d = document.createElement('dialog'); d.id = 'recurrenceManager'; d.className = 'rv-dialog';
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-rec-action]'); if (b) perform(b.dataset.recAction); });
    document.body.appendChild(d); return d;
  }
  function openManager(type, id) {
    var h = handlers[type], record = h && h.get(id); if (!record) return;
    active = { type: type, id: id }; var r = R.normalize(record.recurrence); if (!r) return;
    var d = manager();
    d.innerHTML = '<div class="rv-dialog-body"><div class="rv-dialog-head"><h2>' + esc(L('Repeating schedule', 'Horario recurrente')) + '</h2><button class="rv-icon-btn" data-rec-action="close" aria-label="' + esc(L('Close', 'Cerrar')) + '">×</button></div><p>' + esc(summary(record)) + '</p>' +
      '<div class="rv-grid-2">' + field(L('One-time date', 'Fecha por una sola vez'), '<input id="recOnceDate" type="date" value="' + esc(record.dueDate) + '">') + field(L('Time', 'Hora'), '<input id="recOnceTime" type="time" value="' + esc(record.dueTime) + '">') + '</div>' +
      '<p class="rv-muted">' + esc(r.paused ? L('The regular schedule stays paused. You can still schedule one appointment.', 'El horario habitual sigue en pausa. Puedes programar una sola cita.') : L('Moving or skipping one occurrence leaves future dates unchanged.', 'Mover u omitir una ocasión no cambia las fechas futuras.')) + '</p>' +
      '<div class="org-detail-actions"><button class="btn btn-primary" data-rec-action="move">' + esc(L('Set one-time date', 'Fijar fecha por una vez')) + '</button><button class="btn btn-secondary" data-rec-action="skip">' + esc(L('Skip this occurrence', 'Omitir esta ocasión')) + '</button><button class="btn btn-secondary" data-rec-action="pause">' + esc(r.paused ? L('Resume repeating', 'Reanudar repetición') : L('Pause repeating', 'Pausar repetición')) + '</button><button class="btn btn-secondary" data-rec-action="stop">' + esc(L('Stop repeating; keep selected date', 'Dejar de repetir; conservar fecha elegida')) + '</button></div><p id="recSyncStatus" role="status"></p><button class="btn btn-secondary" data-rec-action="retry" hidden>' + esc(L('Retry reminder update', 'Reintentar actualización del aviso')) + '</button></div>';
    if (!d.open) d.showModal();
  }
  function perform(action) {
    var d = manager(); if (action === 'close') { d.close(); return; }
    if (!active) return;
    var h = handlers[active.type], v = h.get(active.id); if (!v) { d.close(); return; }
    var r = R.normalize(v.recurrence), date = document.getElementById('recOnceDate').value, time = document.getElementById('recOnceTime').value;
    try {
      if (action === 'move') v = R.move(v, date, time, 'once');
      if (action === 'skip') v = R.complete(v);
      if (action === 'pause') { r.paused = !r.paused; r.oneTime = null; v = R.project(Object.assign({}, v, { recurrence: r, snoozedUntil: '' })); }
      if (action === 'stop') {
        if (date && !R.validDate(date)) throw new Error(L('Choose a valid date.', 'Elige una fecha válida.'));
        v = Object.assign({}, v, { recurrence: null, occurrenceKey: '', dueDate: date, dueTime: date ? time : '', snoozedUntil: '' });
      }
      if (action !== 'retry') { v.updatedAt = new Date().toISOString(); h.save(v); openManagerAfterSave(v); }
      var label = document.getElementById('recSyncStatus'); label.textContent = L('Updating reminders…', 'Actualizando avisos…');
      var savedActive = active;
      Promise.resolve(h.sync(v)).then(function (result) {
        if (active !== savedActive || !d.open) return;
        var fail = result && result.ok === false;
        label.textContent = fail ? L('Saved. Reminder update failed; retry when online.', 'Guardado. Falló el aviso; reintenta cuando tengas conexión.') : L('Saved. Reminder schedule updated. Calendar follows its refresh schedule.', 'Guardado. Avisos actualizados. El calendario sigue su ciclo de actualización.');
        d.querySelector('[data-rec-action="retry"]').hidden = !fail;
      }).catch(function () { label.textContent = L('Saved. Could not update reminders.', 'Guardado. No se pudieron actualizar los avisos.'); d.querySelector('[data-rec-action="retry"]').hidden = false; });
    } catch (e) { document.getElementById('recSyncStatus').textContent = e.message; }
  }
  function openManagerAfterSave(v) { if (v.recurrence) openManager(active.type, active.id); else manager().querySelectorAll('[data-rec-action="move"],[data-rec-action="skip"],[data-rec-action="pause"],[data-rec-action="stop"]').forEach(function(b){b.disabled=true;}); }
  global.MinistryRecurrenceUI = { mountEditor: mountEditor, readEditor: readEditor, mountDetail: mountDetail, summary: summary, register: function (type, h) { handlers[type] = h; } };
})(window);
