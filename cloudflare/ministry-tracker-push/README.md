# Ministry Tracker Push Worker

Stage: **I implementation in progress**

This folder contains the Cloudflare Worker for Ministry Tracker closed-app reminders.

No private secrets are committed.

## Current status

Implemented in source:

- `GET /api/health`
- `OPTIONS *` CORS preflight
- `POST /api/subscribe`
- `POST /api/reminders`
- `DELETE /api/reminders/:sourceType/:sourceId`
- `POST /api/test-push` sends VAPID Web Push
- scheduled cron handler sends due reminders
- KV-based subscription/reminder storage
- expired push subscription cleanup on 404/410
- Worker-side VAPID JWT signing and `aes128gcm` payload encryption

Not approved until verified:

- Worker deployment.
- Real browser `PushSubscription` test.
- `POST /api/test-push` with a real subscription.
- Scheduled reminder delivery test.
- Installed-PWA closed-app notification test where the platform supports it.

## Required Cloudflare setup

1. Keep Worker name `ministry-tracker-push`.
2. Create or keep KV namespace `ministry-tracker-push-store`.
3. Bind the namespace as `PUSH_STORE`.
4. Configure `ALLOWED_ORIGIN=https://davidfontenelle80-cloud.github.io`.
5. Configure `VAPID_PUBLIC_KEY` from `js/push-config.js`.
6. Configure `VAPID_SUBJECT=mailto:davidfontenelle80@gmail.com`.
7. Store the private VAPID key only with `wrangler secret put VAPID_PRIVATE_KEY` or the Cloudflare dashboard secret UI.
8. Configure cron trigger `* * * * *`.
9. Deploy with `wrangler deploy` from this folder when Worker code/config changes.

## Security rules

Reminder writes, deletes, and test pushes require a per-subscription capability token. The Worker creates a new random token when the browser registers its push subscription, stores it only in KV, and returns it to that browser. The frontend stores the token locally and sends it as a Bearer token for protected requests.

Deploy the Worker before deploying the matching frontend. Existing installations automatically obtain a new token the next time they subscribe or sync a reminder.

Allowed in repo/frontend:

- Worker public URL
- VAPID public key
- non-secret app identifiers

Never commit:

- VAPID private key
- Cloudflare API token
- GitHub token
- shared secret
- production credential dumps

Do not mark Stage I approved until endpoint checks pass and a real closed-app notification fires on a supported device/PWA path at the selected reminder time.
