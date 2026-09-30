import '../../js/recurrence.js';
const R = globalThis.MinistryRecurrence;
/*
 * Calendar feed (subscribed calendar) for Ministry Tracker.
 *
 * Each device owns one private feed:
 *   - feed id  : random, appears in the subscribe link (read-only access)
 *   - write key: random, stays on the device, sent as "Authorization: Bearer <key>"
 * KV stores only a SHA-256 hash of the write key, never the key itself.
 *
 * Routes (wired from worker.js):
 *   POST   /api/feed/:id      save the device's current event list (write key required)
 *   DELETE /api/feed/:id      remove the feed (write key required)
 *   GET    /feed/:id.ics      serve the calendar to Apple/Google Calendar (no auth, id is the secret)
 *
 * KV cost: 1 write per save that actually changed something, 1 read per calendar refresh.
 */

export const FEED_ID_RE = /^[A-Za-z0-9_-]{22,64}$/;
export const MAX_EVENTS = 1500;
export const MAX_BODY_BYTES = 512 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function feedKey(id) {
  return `feed:${id}`;
}

function clip(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]{32,128})$/);
  return match ? match[1] : '';
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function sanitizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const date = String(raw.date || '');
  if (!DATE_RE.test(date)) return null;
  const time = TIME_RE.test(String(raw.time || '')) ? String(raw.time) : '';
  const uid = clip(raw.uid, 128).replace(/[^A-Za-z0-9_.@-]/g, '');
  if (!uid) return null;
  const duration = Math.round(Number(raw.durationMin));
  const alarm = raw.alarmMin === null || raw.alarmMin === undefined || raw.alarmMin === '' ? null : Math.round(Number(raw.alarmMin));
  const url = clip(raw.url, 600);
  return {
    uid,
    recurrence: R.normalize(raw.recurrence),
    kind: clip(raw.kind, 24),
    title: clip(raw.title, 200) || 'Ministry',
    date,
    time,
    durationMin: Number.isFinite(duration) && duration > 0 ? Math.min(duration, 24 * 60) : 30,
    location: clip(raw.location, 300),
    description: clip(raw.description, 2000),
    url: /^https:\/\//.test(url) ? url : '',
    alarmMin: time && Number.isFinite(alarm) && alarm >= 0 ? Math.min(alarm, 10080) : null,
  };
}

/* ── iCalendar output ─────────────────────────────────────────────── */

function icsEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space.
function foldLine(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      out.push(current);
      current = '';
      currentBytes = 0;
    }
    current += ch;
    currentBytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

function compactDate(date) {
  return date.replace(/-/g, '');
}

function addMinutes(date, time, minutes) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + minutes));
  const pad = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

function nextDay(date) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10).replace(/-/g, '');
}

function utcStamp(iso) {
  const t = new Date(iso || Date.now());
  return (Number.isNaN(t.getTime()) ? new Date() : t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildFeedIcs(record) {
  const name = clip(record && record.calName, 60) || 'Ministry';
  const stamp = utcStamp(record && record.updatedAt);
  // SEQUENCE + LAST-MODIFIED rise with every save, so Calendar treats edited events as changed
  // instead of keeping its old copy. Seconds since epoch fits comfortably in a 32-bit int.
  const sequence = Math.floor(updatedMs(record) / 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KHub//Ministry Tracker Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];
  const events = Array.isArray(record && record.events) ? record.events : [];
  // Expand a rolling 400-day horizon on every calendar fetch. No app-open
  // job is required to extend it. Stable occurrence UIDs let moves replace
  // their original event and pauses/skips remove it on the next refresh.
  const expanded = [];
  for (const ev of events) {
    if (!ev.recurrence) { expanded.push(ev); continue; }
    const zoneToday = R.localParts(Date.now(), ev.recurrence.timeZone).date;
    const from = R.addDays(zoneToday, -60);
    const occurrences = R.occurrences(ev.recurrence, from, R.addDays(zoneToday, 400));
    const r = ev.recurrence;
    // Explicit one-time appointments/moves remain visible even beyond the rolling horizon.
    const extra = r.paused ? (r.oneTime ? [{key:'one-time', ...r.oneTime}] : []) : Object.entries(r.exceptions).filter(([key,x]) => !x.skip && (!r.completedThrough || key > r.completedThrough)).map(([key,x]) => ({key, ...x}));
    for (const o of extra) if (o.date >= from && !occurrences.some(x => x.key === o.key)) occurrences.push(o);
    for (const o of occurrences) {
      expanded.push({ ...ev, uid: ev.uid + '.' + o.key, date: o.date, time: o.time, timeZone: r.timeZone });
    }
  }
  for (const ev of expanded) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}@ministry-tracker.khub`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `SEQUENCE:${sequence}`);
    // Times are "floating" local time, exactly like the app's .ics export: the phone shows them
    // in its own time zone, so 3:00 PM in the app is 3:00 PM on the calendar.
    if (ev.time && ev.timeZone) {
      const start = R.epoch(ev.date, ev.time, ev.timeZone);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(start + ev.durationMin * 60000)}`);
    } else if (ev.time) {
      lines.push(`DTSTART:${compactDate(ev.date)}T${ev.time.replace(':', '')}00`, `DTEND:${addMinutes(ev.date, ev.time, ev.durationMin)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(ev.date)}`, `DTEND;VALUE=DATE:${nextDay(ev.date)}`);
    }
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    if (ev.alarmMin !== null && ev.alarmMin !== undefined) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(ev.title)}`, `TRIGGER:-PT${ev.alarmMin}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function updatedMs(record) {
  return Date.parse((record && record.updatedAt) || '') || Date.now();
}

/* ── Route handlers ───────────────────────────────────────────────── */

function feedIdFromApiPath(pathname) {
  const parts = pathname.split('/').filter(Boolean); // ['api','feed',id]
  return parts.length === 3 ? parts[2] : '';
}

async function authorize(store, id, request) {
  const key = bearer(request);
  if (!key) return { ok: false, status: 401, error: 'Missing feed key.' };
  const hash = await sha256Hex(key);
  const existing = await store.get(feedKey(id), 'json');
  if (existing && !timingSafeEqualHex(existing.keyHash, hash)) return { ok: false, status: 403, error: 'Wrong feed key.' };
  return { ok: true, hash, existing };
}

export async function handleFeedUpsert(request, env, pathname, deps) {
  const { json, headers, requireStore } = deps;
  const id = feedIdFromApiPath(pathname);
  if (!FEED_ID_RE.test(id)) return json({ ok: false, error: 'Invalid feed id.' }, 400, headers);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: 'Feed too large.' }, 413, headers);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: 'Feed too large.' }, 413, headers);
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400, headers);
  }
  if (data && data.app && data.app !== 'ministry-tracker') return json({ ok: false, error: 'Unsupported app.' }, 400, headers);
  if (!Array.isArray(data && data.events)) return json({ ok: false, error: 'events must be an array.' }, 400, headers);
  if (data.events.length > MAX_EVENTS) return json({ ok: false, error: 'Too many events.' }, 413, headers);

  const store = requireStore(env);
  const auth = await authorize(store, id, request);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, headers);

  if (data.events.some((ev) => ev && ev.recurrence && !R.normalize(ev.recurrence))) return json({ ok: false, error: 'Invalid recurrence.' }, 400, headers);
  const events = data.events.map(sanitizeEvent).filter(Boolean);
  const record = {
    keyHash: auth.hash,
    calName: clip(data.calName, 60) || 'Ministry',
    createdAt: (auth.existing && auth.existing.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events,
  };
  await store.put(feedKey(id), JSON.stringify(record));
  return json({ ok: true, count: events.length, updatedAt: record.updatedAt }, 200, headers);
}

export async function handleFeedDelete(request, env, pathname, deps) {
  const { json, headers, requireStore } = deps;
  const id = feedIdFromApiPath(pathname);
  if (!FEED_ID_RE.test(id)) return json({ ok: false, error: 'Invalid feed id.' }, 400, headers);
  const store = requireStore(env);
  const auth = await authorize(store, id, request);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, headers);
  if (auth.existing) await store.delete(feedKey(id));
  return json({ ok: true, deleted: Boolean(auth.existing) }, 200, headers);
}

export async function handleFeedIcs(request, env, pathname, deps) {
  const { requireStore } = deps;
  const match = pathname.match(/^\/feed\/([A-Za-z0-9_-]{22,64})(?:\.ics)?$/);
  const notFound = () => new Response('Not found\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (!match) return notFound();
  const record = await requireStore(env).get(feedKey(match[1]), 'json');
  if (!record) return notFound();
  const body = buildFeedIcs(record);
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="ministry.ics"',
      // Never let a phone or proxy reuse an old copy: a pull-to-refresh must download fresh.
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      pragma: 'no-cache',
      'last-modified': new Date(updatedMs(record)).toUTCString(),
      'x-robots-tag': 'noindex',
    },
  });
}
