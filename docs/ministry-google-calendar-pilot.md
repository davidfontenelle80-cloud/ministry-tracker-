# Ministry → Google Calendar pilot (review design)

Status: design only. No OAuth client, calendar tokens, deployment, data migration, or live calendar event has been created by this branch.

## Outcome and boundary

For one newly created Bible Study in a disposable pilot account, create one Google Calendar event. Editing or logging the next study updates that same event; deleting or completing the study removes it after confirmation. Read the event back after each write. The event appears in Apple Calendar when that Google calendar is enabled there. This pilot does not turn cloud backup into multi-device sync or grant an AI access to Ministry.

David's iPhone test showed his chosen calendar is Google, viewed through Apple Calendar. The current iPhone `Calendar` action exports an ICS file; other platforms open a Google Calendar create draft. Neither returns an event ID. Existing exported events must **not** be silently adopted or deleted: an earlier manual event may already exist.

## Current code paths (main at `38a6dff4`)

| Operation | Current implementation | Pilot change |
| --- | --- | --- |
| Save/edit Bible Study | `js/organizer.js` `saveStudy` writes `state.ministryBibleStudies` to `localStorage`, then calls `syncStudyPush`; optional `calendarForStudy` exports ICS/draft | Keep the local write, queue an authenticated calendar upsert for linked pilot studies, persist its result and show separate calendar status |
| Log next study | `saveStudyLog` replaces the next due date/time and reschedules push | Update the linked event, including date/time and chosen alert |
| Delete study | `deleteStudy` removes the local study and clears push | Tombstone the calendar operation until the linked event is deleted and verified; retain a retryable failure record |
| Complete study | `normalizeStudy` supports `status: completed`; no calendar cleanup is wired here | Define and test completion before enabling it as a calendar deletion trigger |
| Notification | `syncStudyPush` writes a `bible-study` reminder to the Cloudflare KV worker by source ID; a device subscription is local | For the pilot, use **one chosen alert channel**: one Google Calendar popup for a linked study, or the existing Ministry push for an unlinked study. Show this choice in the UI; never quietly turn off an existing push reminder |
| Backup | `js/firebase/cloud-backup.js` stores the whole localStorage state in `backups/{appId}/users/{uid}/meta/latest`; app startup/focus may restore a newer full snapshot and user actions may save another | Do not use the full-state backup as a per-record sync channel. Protect pending calendar operations from whole-state restore/overwrite; test this before live use |

`js/auth.js` is a boilerplate stub. The actual cloud-backup sign-in is Firebase email/password through `KHub.CloudAuth`; it is not Google Calendar authorization. The existing push worker accepts a subscription ID and is not an account-scoped API suitable for an AI hub without additional authorization work.

## Proposed pilot contract

1. Keep Firebase UID as the Ministry account owner. The phone signs in to its existing Firebase account and separately grants Google Calendar access. The server validates the Firebase ID token on every request, derives UID from it, and never accepts a caller-provided UID. Calendar consent is connected to that UID. Do not infer account ownership from matching email addresses.
2. Use a server-side Google OAuth authorization-code flow with state/PKCE, a narrow Calendar events scope, and secure refresh-token storage. The phone never stores a Google refresh token or client secret. Provide disconnect and revoke handling. Do not implement a homegrown OAuth authorization server for this pilot.
3. Select the exact Google calendar during connection, initially the primary calendar only if David confirms it. Store `calendarId` and `eventId` server-side under the Firebase UID and Ministry study ID. A stable private event property may help reconcile a lost response; search only within that user's authorized calendar. Never modify an arbitrary event ID sent by a client.
4. Calendar write request: `{studyId, expectedRevision, action, normalizedStudy, operationId}`. Reject stale revisions; make retries with the same operation ID idempotent. Only accept a freshly authenticated request from the currently signed-in user. Validate date, time zone (`America/New_York` for David's pilot), title length, and allowed fields server-side. The server must not trust the local `state` wholesale.
5. Create: insert an event with a 60-minute duration and one explicit popup reminder at the selected lead time, then read it back. Store its event ID, calendar ID, status, and revision. Reschedule: retrieve the linked event, verify its private Ministry owner/reference, update its start/end and one reminder, then read it back. Delete: verify ownership of the linked event, delete it, and verify absence. A missing event becomes a visible repair state, not permission to create an unnoticed duplicate.
6. The app keeps a local pending operation until the server acknowledges and readback succeeds. It shows `Synced`, `Needs attention`, or `Not connected`, and offers retry. A failed calendar write must not be reported as a successful calendar update. If a local study is removed while deletion fails, retain the tombstone outside the removed study so retry remains possible.
7. Calendar edits made directly by the user are outside the pilot's sync direction. The pilot is **Ministry → Google Calendar**. Define conflict behavior before enabling two-way edits; do not overwrite a user-edited event blindly. No automatic conversion of existing ICS/draft events.

Google's API supports `events.insert`, `events.get`, `events.update`/`patch`, `events.delete`, private extended properties, and explicit reminder overrides. For a single reminder, set `reminders.useDefault=false` with one popup override; an empty override list means no Google reminder. Server-side offline access requires a refresh token. Reference: [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Calendar events](https://developers.google.com/workspace/calendar/api/v3/reference/events), [extended properties](https://developers.google.com/workspace/calendar/api/guides/extended-properties), [reminders](https://developers.google.com/workspace/calendar/api/concepts/reminders).

## Recovery and acceptance

- Use a disposable Firebase UID and Google calendar for integration tests. Test two UIDs in both directions, including a forged `uid`, linked event ID from the other UID, expired Firebase token, revoked Google grant, stale revision, duplicate retry, and concurrent edits.
- Create one study with a reminder: one event ID, one popup alert, and an exact readback. Confirm it appears in Apple Calendar on the phone. Reschedule twice: same event ID, new date/time, no duplicate. Log next study: same ID. Delete: event gone and no reminder remains. Test a Google API failure after local save and after local delete, then retry without a duplicate or lost tombstone.
- Test sign-out, reinstall, backup save/restore, and two devices before treating the result as account sync. A Google Calendar readback alone does not prove Ministry records synchronized to another device.
- Keep real phone visits and existing calendar events untouched. Enable the pilot only for a new test study after account consent. Review any billing requirements for token storage/hosting before enabling resources; target $0 incremental monthly cost at pilot scale.

## Build sequence

1. Decide server host and secret/token store with a cost check, then implement Firebase token verification and Google OAuth linking in a test environment.
2. Implement the UID-scoped event mapping and idempotent upsert/delete/readback API. Test failure and cross-account cases.
3. Add a pilot-only calendar status/connection control to `js/organizer.js`, with a pending-operation journal outside the full-state backup and an explicit single-alert choice. Wire save, edit, log, and delete only after the journal/recovery behavior passes.
4. Run the disposable-account end-to-end tests. Only then arrange David's one-new-study phone test and review a separate deployment decision.

The AI hub and Revisita cloning remain separate later work. This calendar pilot does not make the existing local Ministry dataset accessible to Muse or ChatGPT.
