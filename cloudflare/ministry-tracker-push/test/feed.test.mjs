// Run: node --test cloudflare/ministry-tracker-push/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { buildFeedIcs, sanitizeEvent } from '../feed.js';

function makeKv() {
  const map = new Map();
  let writes = 0;
  return {
    map,
    get writes() { return writes; },
    async get(key, type) { const v = map.get(key); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    async put(key, value) { writes += 1; map.set(key, value); },
    async delete(key) { map.delete(key); },
  };
}
const ORIGIN = 'https://davidfontenelle80-cloud.github.io';
const env = () => ({ PUSH_STORE: makeKv(), ALLOWED_ORIGIN: ORIGIN });
const ID = 'AbCdEfGhIjKlMnOpQrStUv12';
const KEY = 'k'.repeat(43);
function req(method, path, { key, body } = {}) {
  const headers = { origin: ORIGIN };
  if (key) headers.authorization = `Bearer ${key}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`https://w.example${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const sample = [
  { uid: 'rv-abc', kind: 'revisit', title: 'Return Visit: Ana', date: '2026-10-02', time: '15:00', durationMin: 30, location: 'Calle 5, Hartford', description: 'Next topic: Hope\nLeft: tract', url: 'https://www.google.com/maps/search/?api=1&query=x', alarmMin: 5 },
  { uid: 'note-1', kind: 'note', title: 'Call Nelson', date: '2026-10-03', time: '', durationMin: 30 },
];

test('save then serve a feed', async () => {
  const e = env();
  let res = await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { app: 'ministry-tracker', calName: 'Ministry', events: sample } }), e);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).count, 2);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const stored = e.PUSH_STORE.map.get(`feed:${ID}`);
  assert.ok(!stored.includes(KEY), 'write key must never be stored in plain text');

  res = await worker.fetch(req('GET', `/feed/${ID}.ics`), e);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/calendar/);
  const ics = await res.text();
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /X-WR-CALNAME:Ministry/);
  assert.match(ics, /UID:rv-abc@ministry-tracker\.khub/);
  assert.match(ics, /DTSTART:20261002T150000\r\nDTEND:20261002T153000/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261003\r\nDTEND;VALUE=DATE:20261004/);
  assert.match(ics, /LOCATION:Calle 5\\, Hartford/);
  assert.match(ics, /TRIGGER:-PT5M/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line}`);
});

test('update replaces the event (edit moves it, delete removes it)', async () => {
  const e = env();
  await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: sample } }), e);
  const moved = [{ ...sample[0], date: '2026-10-09', time: '10:30' }];
  const res = await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: moved } }), e);
  assert.equal(res.status, 200);
  const ics = await (await worker.fetch(req('GET', `/feed/${ID}.ics`), e)).text();
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.match(ics, /DTSTART:20261009T103000/);
  assert.doesNotMatch(ics, /20261002/);
  assert.doesNotMatch(ics, /Call Nelson/);
});

test('wrong or missing key cannot overwrite or delete someone else\'s feed', async () => {
  const e = env();
  await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: sample } }), e);
  let res = await worker.fetch(req('POST', `/api/feed/${ID}`, { key: 'x'.repeat(43), body: { events: [] } }), e);
  assert.equal(res.status, 403);
  res = await worker.fetch(req('POST', `/api/feed/${ID}`, { body: { events: [] } }), e);
  assert.equal(res.status, 401);
  res = await worker.fetch(req('DELETE', `/api/feed/${ID}`, { key: 'x'.repeat(43) }), e);
  assert.equal(res.status, 403);
  const ics = await (await worker.fetch(req('GET', `/feed/${ID}.ics`), e)).text();
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
});

test('delete removes the feed; unknown and malformed ids 404/400', async () => {
  const e = env();
  await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: sample } }), e);
  let res = await worker.fetch(req('DELETE', `/api/feed/${ID}`, { key: KEY }), e);
  assert.equal(res.status, 200);
  res = await worker.fetch(req('GET', `/feed/${ID}.ics`), e);
  assert.equal(res.status, 404);
  res = await worker.fetch(req('GET', '/feed/short.ics'), e);
  assert.equal(res.status, 404);
  res = await worker.fetch(req('POST', '/api/feed/bad id!', { key: KEY, body: { events: [] } }), e);
  assert.equal(res.status, 400);
});

test('feeds are isolated per id', async () => {
  const e = env();
  const ID2 = 'ZyXwVuTsRqPoNmLkJiHgFe98';
  await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: sample } }), e);
  await worker.fetch(req('POST', `/api/feed/${ID2}`, { key: 'z'.repeat(43), body: { events: [] } }), e);
  const a = await (await worker.fetch(req('GET', `/feed/${ID}.ics`), e)).text();
  const b = await (await worker.fetch(req('GET', `/feed/${ID2}.ics`), e)).text();
  assert.equal((a.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.equal((b.match(/BEGIN:VEVENT/g) || []).length, 0);
});

test('sanitizeEvent drops bad dates and strips unsafe fields', () => {
  assert.equal(sanitizeEvent({ uid: 'a', date: 'tomorrow' }), null);
  const ev = sanitizeEvent({ uid: 'a<b>', date: '2026-10-01', time: '25:99x', url: 'javascript:alert(1)', alarmMin: 5 });
  assert.equal(ev.uid, 'ab');
  assert.equal(ev.time, '');
  assert.equal(ev.url, '');
  assert.equal(ev.alarmMin, null, 'no alarm on all-day events');
});

test('long Spanish text folds on UTF-8 boundaries', () => {
  const ics = buildFeedIcs({ events: [sanitizeEvent({ uid: 'x', date: '2026-10-01', title: 'Revisita: ' + 'ñáéíóú'.repeat(40) })] });
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(ics.includes('ñ'));
});

test('feed is never cached and edits bump SEQUENCE / LAST-MODIFIED', async () => {
  const e = env();
  await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: sample } }), e);
  const r1 = await worker.fetch(req('GET', `/feed/${ID}.ics`), e);
  assert.match(r1.headers.get('cache-control'), /no-store/);
  assert.ok(r1.headers.get('last-modified'));
  const ics1 = await r1.text();
  assert.match(ics1, /LAST-MODIFIED:\d{8}T\d{6}Z/);
  const seq1 = Number(ics1.match(/SEQUENCE:(\d+)/)[1]);
  assert.ok(seq1 > 1_700_000_000 && seq1 < 2_147_483_647);
  await new Promise((r) => setTimeout(r, 1100));
  await worker.fetch(req('POST', `/api/feed/${ID}`, { key: KEY, body: { events: [{ ...sample[0], title: 'Edited' }] } }), e);
  const ics2 = await (await worker.fetch(req('GET', `/feed/${ID}.ics`), e)).text();
  const seq2 = Number(ics2.match(/SEQUENCE:(\d+)/)[1]);
  assert.ok(seq2 > seq1, 'SEQUENCE must increase after an edit');
  assert.match(ics2, /SUMMARY:Edited/);
});

test('existing reminder routes still respond', async () => {
  const res = await worker.fetch(req('GET', '/api/health'), env());
  assert.notEqual(res.status, 404);
});
