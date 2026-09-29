/** Shared recurrence rules for the browser, calendar feed, and push Worker. */
(function (root) {
  'use strict';
  var DAY = 86400000, formatters = new Map();
  function formatter(zone) {
    if (!formatters.has(zone)) {
      var f = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      if (formatters.size > 100) formatters.clear();
      formatters.set(zone, f);
    }
    return formatters.get(zone);
  }
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s)) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s; }
  function validTime(s) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
  function addDays(s, n) { return new Date(Date.parse(s + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10); }
  function zoneValid(s) { try { formatter(s); return !!s; } catch (_) { return false; } }
  function localParts(ms, zone) {
    var p = {};
    formatter(zone).formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute };
  }
  // Fall-back chooses the first matching instant; a missing spring-forward time
  // moves forward by the gap (02:30 becomes 03:30), keeping the following week at 02:30.
  function epoch(date, time, zone) {
    if (!validDate(date) || !validTime(time) || !zoneValid(zone)) return NaN;
    var wall = Date.parse(date + 'T' + time + ':00Z'), offsets = [];
    [-36, 0, 36].forEach(function (hours) {
      var at = wall + hours * 3600000, parts = localParts(at, zone);
      var offset = Date.parse(parts.date + 'T' + parts.time + ':00Z') - at;
      if (offsets.indexOf(offset) < 0) offsets.push(offset);
    });
    var candidates = offsets.map(function (offset) {
      var ms = wall - offset, p = localParts(ms, zone);
      return { ms: ms, delta: Date.parse(p.date + 'T' + p.time + ':00Z') - wall };
    });
    var exact = candidates.filter(function (x) { return x.delta === 0; }).sort(function (a, b) { return a.ms - b.ms; });
    if (exact.length) return exact[0].ms;
    var later = candidates.filter(function (x) { return x.delta > 0; }).sort(function (a, b) { return a.delta - b.delta; });
    return later.length ? later[0].ms : NaN;
  }
  function matches(r, date) {
    if (!validDate(date) || date < r.startDate || (r.endDate && date > r.endDate)) return false;
    var days = Math.round((Date.parse(date) - Date.parse(r.startDate)) / DAY);
    if (r.frequency === 'daily') return days % r.interval === 0;
    if (r.frequency === 'weekly') return days % (7 * r.interval) === 0;
    var a = r.startDate.split('-').map(Number), b = date.split('-').map(Number);
    return a[2] === b[2] && ((b[0] - a[0]) * 12 + b[1] - a[1]) % r.interval === 0;
  }
  function normalize(raw) {
    if (!raw || ['daily', 'weekly', 'monthly'].indexOf(raw.frequency) < 0 || !validDate(raw.startDate)) return null;
    if (raw.time && !validTime(raw.time)) return null;
    if (!zoneValid(raw.timeZone)) return null;
    var interval = raw.interval === undefined ? 1 : Number(raw.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 12) return null;
    if (raw.endDate && (!validDate(raw.endDate) || raw.endDate < raw.startDate)) return null;
    var r = { frequency: raw.frequency, interval: interval, startDate: raw.startDate, time: raw.time || '', timeZone: raw.timeZone,
      endDate: raw.endDate || '', paused: raw.paused === true, exceptions: {}, completedThrough: validDate(raw.completedThrough) ? raw.completedThrough : '' };
    Object.keys(raw.exceptions || {}).sort().slice(-500).forEach(function (key) {
      var x = raw.exceptions[key];
      if (!matches(r, key) || !x || typeof x !== 'object') return;
      if (x.skip === true) r.exceptions[key] = { skip: true };
      else if (validDate(x.date) && (!x.time || validTime(x.time))) r.exceptions[key] = { date: x.date, time: x.time || '' };
    });
    r.oneTime = raw.oneTime && validDate(raw.oneTime.date) && (!raw.oneTime.time || validTime(raw.oneTime.time)) ? { date: raw.oneTime.date, time: raw.oneTime.time || '' } : null;
    return r;
  }
  function occurrences(raw, from, to) {
    var r = normalize(raw), out = [];
    if (!r || !validDate(from) || !validDate(to)) return out;
    function add(key, date, time) { if (date >= from && date <= to) out.push({ key: key, date: date, time: time, timeZone: r.timeZone }); }
    if (r.paused) { if (r.oneTime) add('one-time', r.oneTime.date, r.oneTime.time); return out; }
    var start = from > r.startDate ? from : r.startDate, end = r.endDate && r.endDate < to ? r.endDate : to;
    // Bounded range, independent of how old the series is.
    for (var d = start, i = 0; d <= end && i < 4000; d = addDays(d, 1), i++) {
      if (!matches(r, d) || (r.completedThrough && d <= r.completedThrough) || r.exceptions[d]) continue;
      add(d, d, r.time);
    }
    // Include moves into this range even when their original date is outside it.
    Object.keys(r.exceptions).forEach(function (key) {
      var x = r.exceptions[key];
      if (!x.skip && (!r.completedThrough || key > r.completedThrough)) add(key, x.date, x.time);
    });
    return out.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time) || a.key.localeCompare(b.key); });
  }
  function futureOccurrences(r, from) {
    if (r.paused) return r.oneTime && r.oneTime.date >= from ? [{key:'one-time',date:r.oneTime.date,time:r.oneTime.time,timeZone:r.timeZone}] : [];
    var start = from > r.startDate ? from : r.startDate;
    var items = occurrences(r, from, addDays(start, 400));
    // One-time moves can be arbitrarily far ahead, even after the series ends.
    Object.keys(r.exceptions).forEach(function(key){
      var x=r.exceptions[key];
      if(!x.skip && x.date>=from && (!r.completedThrough || key>r.completedThrough) && !items.some(function(o){return o.key===key;})) items.push({key:key,date:x.date,time:x.time,timeZone:r.timeZone});
    });
    return items.sort(function(a,b){return (a.date+a.time).localeCompare(b.date+b.time)||a.key.localeCompare(b.key);});
  }
  function next(raw, afterMs, minutes, inclusive) {
    var r = normalize(raw); if (!r) return null;
    minutes = Math.max(0, Math.min(10080, Number(minutes) || 0));
    var from = localParts(afterMs, r.timeZone).date;
    // Up to yearly intervals, plus the longest allowed reminder lead time.
    var items = futureOccurrences(r, from);
    for (var i = 0; i < items.length; i++) {
      var o = items[i], at = epoch(o.date, o.time || '00:00', r.timeZone), fire = at - minutes * 60000;
      if (inclusive ? fire >= afterMs : fire > afterMs) return Object.assign({}, o, { at: at, fireAt: new Date(fire).toISOString() });
    }
    return null;
  }
  function project(record, nowMs) {
    var r = normalize(record.recurrence); if (!r) return record;
    var date = localParts(nowMs == null ? Date.now() : nowMs, r.timeZone).date;
    var items = futureOccurrences(r, date);
    var o = items[0];
    return Object.assign({}, record, { recurrence: r, dueDate: o ? o.date : '', dueTime: o ? o.time : '', occurrenceKey: o ? o.key : '' });
  }
  function move(record, date, time, scope) {
    var r = normalize(record.recurrence); if (!r) return Object.assign({}, record, { dueDate: date, dueTime: time });
    if (!validDate(date) || (time && !validTime(time))) throw new Error('Choose a valid date and time.');
    if (scope === 'future') {
      if (r.endDate && date > r.endDate) throw new Error('The date is after the repeat end date.');
      r.startDate = date; r.time = time; r.exceptions = {}; r.completedThrough = ''; r.oneTime = null;
    } else if (r.paused) r.oneTime = { date: date, time: time };
    else {
      var current = project(record), key = record.occurrenceKey || current.occurrenceKey;
      if (!key || key === 'one-time') throw new Error('There is no occurrence to move. Change the future schedule instead.');
      r.exceptions[key] = { date: date, time: time };
    }
    return project(Object.assign({}, record, { recurrence: r, snoozedUntil: '' }));
  }
  function complete(record, occurrenceKey) {
    var r = normalize(record.recurrence); if (!r) return record;
    var key = occurrenceKey || record.occurrenceKey || project(record).occurrenceKey;
    if (occurrenceKey && occurrenceKey !== 'one-time' && !matches(r, occurrenceKey)) return record;
    if (r.paused) r.oneTime = null;
    else if (key) r.exceptions[key] = { skip: true };
    return project(Object.assign({}, record, { recurrence: r, snoozedUntil: '' }));
  }
  root.MinistryRecurrence = { normalize: normalize, occurrences: occurrences, next: next, project: project, move: move, complete: complete, epoch: epoch, localParts: localParts, addDays: addDays, validDate: validDate, validTime: validTime };
})(typeof window === 'undefined' ? globalThis : window);
