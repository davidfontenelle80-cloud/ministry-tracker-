/*
 * Ministry Tracker Push Worker — Stage I
 *
 * Required env bindings:
 * - PUSH_STORE: KV namespace binding
 * - VAPID_PUBLIC_KEY: frontend-safe VAPID public key
 * - VAPID_PRIVATE_KEY: secret only, never committed
 * - VAPID_SUBJECT: mailto/contact subject for Web Push
 * - ALLOWED_ORIGIN: https://davidfontenelle80-cloud.github.io
 */

const APP_ID = 'ministry-tracker';
const DEFAULT_ALLOWED_ORIGIN = 'https://davidfontenelle80-cloud.github.io';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 28;
const WEB_PUSH_RS = 4096;
const DUE_BUCKET_LOOKBACK_MINUTES = 10;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get('origin') || '';
  const allowed = env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  const origin = requestOrigin === allowed ? requestOrigin : allowed;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
  };
}

function requireStore(env) {
  if (!env.PUSH_STORE) throw new Error('Missing PUSH_STORE binding. Configure KV storage.');
  return env.PUSH_STORE;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_) {
    throw new Error('Invalid JSON body.');
  }
}

function assertApp(data) {
  if (data && data.app && data.app !== APP_ID) throw new Error('Unsupported app.');
}

function makeSubscriptionId(subscription) {
  const endpoint = subscription && subscription.endpoint ? String(subscription.endpoint) : '';
  if (!endpoint) throw new Error('Subscription endpoint is required.');
  return 'sub_' + btoa(endpoint).replace(/[^a-zA-Z0-9]/g, '').slice(-32);
}

function reminderKey(subscriptionId, sourceType, sourceId) {
  return `reminder:${subscriptionId}:${sourceType}:${sourceId}`;
}

function dueBucketMinute(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('fireAt must be a valid ISO date/time.');
  return d.toISOString().slice(0, 16);
}

function dueBucketKey(minute) {
  return `due:${minute}`;
}

async function addReminderToDueBucket(store, minute, key) {
  const bucketKey = dueBucketKey(minute);
  const current = await store.get(bucketKey, 'json').catch(() => null);
  const keys = Array.isArray(current && current.keys) ? current.keys : [];
  if (!keys.includes(key)) keys.push(key);
  await store.put(bucketKey, JSON.stringify({ minute, keys, updatedAt: new Date().toISOString() }), {
    expirationTtl: DEFAULT_TTL_SECONDS,
  });
}

function dueBucketMinutesToCheck(now = new Date()) {
  const out = [];
  const base = new Date(now);
  base.setSeconds(0, 0);
  for (let i = DUE_BUCKET_LOOKBACK_MINUTES; i >= 0; i -= 1) {
    out.push(dueBucketMinute(new Date(base.getTime() - i * 60000)));
  }
  return out;
}

async function getDueReminderEntries(store, nowIso) {
  const seen = new Set();
  const due = [];
  for (const minute of dueBucketMinutesToCheck(new Date(nowIso))) {
    const bucket = await store.get(dueBucketKey(minute), 'json').catch(() => null);
    const keys = Array.isArray(bucket && bucket.keys) ? bucket.keys : [];
    for (const key of keys) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const item = await store.get(key, 'json');
      if (item && item.fireAt && item.fireAt <= nowIso && !item.sentAt) due.push({ key, item });
    }
  }
  return due;
}

function textBytes(value) {
  return new TextEncoder().encode(String(value));
}

function concatBytes() {
  const parts = Array.prototype.slice.call(arguments).map(part => part instanceof Uint8Array ? part : new Uint8Array(part));
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, dataBytes));
}

async function hkdfExtract(saltBytes, ikmBytes) {
  return hmac(saltBytes, ikmBytes);
}

async function hkdfExpand(prkBytes, infoBytes, length) {
  const bytes = await hmac(prkBytes, concatBytes(infoBytes, new Uint8Array([1])));
  return bytes.slice(0, length);
}

function uint32Bytes(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function subscriptionEndpointOrigin(endpoint) {
  return new URL(endpoint).origin;
}

function importVapidSigningKey(env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error('Missing VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_SUBJECT.');
  }
  const publicKey = base64UrlToBytes(env.VAPID_PUBLIC_KEY);
  const privateKey = base64UrlToBytes(env.VAPID_PRIVATE_KEY);
  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 public key.');
  }
  if (privateKey.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY must be a base64url P-256 private scalar.');
  }
  return crypto.subtle.importKey('jwk', {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(publicKey.slice(1, 33)),
    y: bytesToBase64Url(publicKey.slice(33, 65)),
    d: bytesToBase64Url(privateKey),
    ext: false,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function normalizeEcdsaSignature(signature) {
  const sig = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
  if (sig.length === 64) return sig;
  if (sig[0] !== 0x30) throw new Error('Unsupported ECDSA signature format.');
  let offset = 2;
  if (sig[1] & 0x80) offset = 2 + (sig[1] & 0x7f);
  if (sig[offset] !== 0x02) throw new Error('Invalid ECDSA signature.');
  const rLen = sig[offset + 1];
  const r = sig.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (sig[offset] !== 0x02) throw new Error('Invalid ECDSA signature.');
  const sLen = sig[offset + 1];
  const s = sig.slice(offset + 2, offset + 2 + sLen);
  const out = new Uint8Array(64);
  out.set(r.slice(Math.max(0, r.length - 32)), 32 - Math.min(32, r.length));
  out.set(s.slice(Math.max(0, s.length - 32)), 64 - Math.min(32, s.length));
  return out;
}

async function createVapidJwt(endpoint, env) {
  const header = bytesToBase64Url(textBytes(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToBase64Url(textBytes(JSON.stringify({
    aud: subscriptionEndpointOrigin(endpoint),
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
    sub: env.VAPID_SUBJECT,
  })));
  const signingInput = `${header}.${claims}`;
  const key = await importVapidSigningKey(env);
  const signature = normalizeEcdsaSignature(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, textBytes(signingInput)));
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}

async function encryptPushPayload(subscription, payload) {
  const uaPublic = base64UrlToBytes(subscription.keys && subscription.keys.p256dh);
  const authSecret = base64UrlToBytes(subscription.keys && subscription.keys.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error('Subscription p256dh key is invalid.');
  if (authSecret.length !== 16) throw new Error('Subscription auth secret is invalid.');

  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));

  const keyInfo = concatBytes(textBytes('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic);
  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, concatBytes(textBytes('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdfExpand(prk, concatBytes(textBytes('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  const plaintext = concatBytes(textBytes(JSON.stringify(payload)), new Uint8Array([2]));
  if (plaintext.length + 16 >= WEB_PUSH_RS) throw new Error('Push payload is too large.');
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));

  return concatBytes(salt, uint32Bytes(WEB_PUSH_RS), new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

async function handleHealth(request, env) {
  return json({
    ok: true,
    app: APP_ID,
    hasStore: !!env.PUSH_STORE,
    hasVapidPublicKey: !!env.VAPID_PUBLIC_KEY,
    hasVapidPrivateKey: !!env.VAPID_PRIVATE_KEY,
    hasVapidSubject: !!env.VAPID_SUBJECT,
    webPushDeliveryImplemented: true,
    dueBucketScheduler: true,
  }, 200, corsHeaders(request, env));
}

async function handleSubscribe(request, env) {
  const headers = corsHeaders(request, env);
  const store = requireStore(env);
  const data = await readJson(request);
  assertApp(data);

  if (!data.subscription || !data.subscription.endpoint || !data.subscription.keys) {
    return json({ ok: false, error: 'subscription.endpoint and subscription.keys are required.' }, 400, headers);
  }

  const id = makeSubscriptionId(data.subscription);
  const now = new Date().toISOString();
  const record = {
    id,
    app: APP_ID,
    subscription: data.subscription,
    userAgent: data.userAgent || '',
    createdAt: now,
    updatedAt: now,
  };

  await store.put(`subscription:${id}`, JSON.stringify(record));
  return json({ ok: true, id, subscriptionId: id }, 200, headers);
}

async function handleUpsertReminder(request, env) {
  const headers = corsHeaders(request, env);
  const store = requireStore(env);
  const data = await readJson(request);
  assertApp(data);

  const subscriptionId = String(data.subscriptionId || '').trim();
  const sourceType = String(data.sourceType || 'ministry-note').trim();
  const sourceId = String(data.sourceId || '').trim();
  const fireAt = String(data.fireAt || '').trim();

  if (!subscriptionId || !sourceType || !sourceId || !fireAt) {
    return json({ ok: false, error: 'subscriptionId, sourceType, sourceId, and fireAt are required.' }, 400, headers);
  }

  const subscription = await store.get(`subscription:${subscriptionId}`, 'json');
  if (!subscription) return json({ ok: false, error: 'Unknown subscriptionId.' }, 404, headers);

  const now = new Date().toISOString();
  const key = reminderKey(subscriptionId, sourceType, sourceId);
  const bucketMinute = dueBucketMinute(fireAt);
  const record = {
    app: APP_ID,
    subscriptionId,
    sourceType,
    sourceId,
    title: String(data.title || 'Ministry Tracker Reminder'),
    body: String(data.body || ''),
    fireAt,
    dueBucketMinute: bucketMinute,
    url: data.url || '/ministry-tracker-/',
    createdAt: now,
    updatedAt: now,
  };

  await store.put(key, JSON.stringify(record), { expirationTtl: DEFAULT_TTL_SECONDS });
  await addReminderToDueBucket(store, bucketMinute, key);
  return json({ ok: true, reminder: record, dueBucketMinute: bucketMinute }, 200, headers);
}

async function handleDeleteReminder(request, env, pathname) {
  const headers = corsHeaders(request, env);
  const store = requireStore(env);
  const parts = pathname.split('/').filter(Boolean);
  const sourceType = decodeURIComponent(parts[2] || '');
  const sourceId = decodeURIComponent(parts[3] || '');
  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get('subscriptionId') || '';

  if (!sourceType || !sourceId) return json({ ok: false, error: 'sourceType and sourceId are required.' }, 400, headers);
  if (!subscriptionId) return json({ ok: false, error: 'subscriptionId is required to delete a reminder.' }, 400, headers);

  await store.delete(reminderKey(subscriptionId, sourceType, sourceId));
  return json({ ok: true, deleted: 1 }, 200, headers);
}

async function sendWebPush(subscription, payload, env) {
  if (!subscription || !subscription.endpoint) throw new Error('Subscription endpoint is required.');
  if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    throw new Error('Subscription p256dh/auth keys are required.');
  }

  const jwt = await createVapidJwt(subscription.endpoint, env);
  const body = await encryptPushPayload(subscription, payload);
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: String(DEFAULT_TTL_SECONDS),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${jwt}, k=${String(env.VAPID_PUBLIC_KEY || '').trim()}`,
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    const error = new Error(`Push service rejected notification (${response.status}).${message ? ' ' + message.slice(0, 240) : ''}`);
    error.status = response.status;
    throw error;
  }

  return { ok: true, status: response.status };
}

async function handleTestPush(request, env) {
  const headers = corsHeaders(request, env);
  const store = requireStore(env);
  const data = await readJson(request);
  assertApp(data);

  const subscriptionId = String(data.subscriptionId || '').trim();
  if (!subscriptionId) return json({ ok: false, error: 'subscriptionId is required.' }, 400, headers);

  const subRecord = await store.get(`subscription:${subscriptionId}`, 'json');
  if (!subRecord) return json({ ok: false, error: 'Unknown subscriptionId.' }, 404, headers);

  const payload = {
    title: data.title || 'Ministry Tracker',
    body: data.body || 'Test reminder notification',
    sourceType: 'test-push',
    sourceId: crypto.randomUUID(),
    url: '/ministry-tracker-/',
  };

  const result = await sendWebPush(subRecord.subscription, payload, env);
  return json({ ok: true, result }, 200, headers);
}

async function processDueReminders(env) {
  const store = requireStore(env);
  const nowIso = new Date().toISOString();
  const due = await getDueReminderEntries(store, nowIso);
  const results = [];

  for (const entry of due) {
    const reminder = entry.item;
    try {
      const subRecord = await store.get(`subscription:${reminder.subscriptionId}`, 'json');
      if (!subRecord) throw new Error('Missing subscription record.');
      await sendWebPush(subRecord.subscription, {
        title: reminder.title,
        body: reminder.body,
        sourceType: reminder.sourceType,
        sourceId: reminder.sourceId,
        url: reminder.url || '/ministry-tracker-/',
      }, env);
      reminder.sentAt = new Date().toISOString();
      await store.put(entry.key, JSON.stringify(reminder), { expirationTtl: DEFAULT_TTL_SECONDS });
      results.push({ key: entry.key, ok: true });
    } catch (error) {
      if (error && (error.status === 404 || error.status === 410)) {
        await store.delete(`subscription:${reminder.subscriptionId}`);
        await store.delete(entry.key);
        results.push({ key: entry.key, ok: false, deleted: true, error: error.message });
        continue;
      }
      reminder.lastError = error.message;
      reminder.lastAttemptAt = new Date().toISOString();
      await store.put(entry.key, JSON.stringify(reminder), { expirationTtl: DEFAULT_TTL_SECONDS });
      results.push({ key: entry.key, ok: false, error: error.message });
    }
  }

  return results;
}

async function route(request, env) {
  const url = new URL(request.url);
  const headers = corsHeaders(request, env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return handleHealth(request, env);
    if (request.method === 'POST' && url.pathname === '/api/subscribe') return handleSubscribe(request, env);
    if (request.method === 'POST' && url.pathname === '/api/reminders') return handleUpsertReminder(request, env);
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/reminders/')) return handleDeleteReminder(request, env, url.pathname);
    if (request.method === 'POST' && url.pathname === '/api/test-push') return handleTestPush(request, env);

    return json({ ok: false, error: 'Not found.' }, 404, headers);
  } catch (error) {
    return json({ ok: false, error: error.message || 'Worker error.' }, 500, headers);
  }
}

export default {
  fetch: route,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(processDueReminders(env));
  },
};
