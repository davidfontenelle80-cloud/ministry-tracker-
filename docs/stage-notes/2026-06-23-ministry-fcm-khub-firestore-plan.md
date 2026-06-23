---
title: "Ministry Tracker FCM + KHub Firestore Migration Plan"
app: "Ministry Tracker"
repo: "davidfontenelle80-cloud/ministry-tracker-"
stage: "Stage 0 / Stage 1 planning"
status: "planned"
created: "2026-06-23"
owner: "David"
supervisor: "App Supervisor / Builder Sol"
priority: "high"
related_repos:
  - "davidfontenelle80-cloud/note-clip"
  - "davidfontenelle80-cloud/KHub-Boilerplate"
firebase_project: "khub-apps"
firestore_database: "(default)"
temporary_file: true
delete_after: "Feature is implemented, tested, pushed, live-approved, and documented in deployment history."
last_verified_live: null
commit_history: []
---

# Ministry Tracker FCM + KHub Firestore Migration Plan

## Objective

Add Firebase Cloud Messaging notifications to Ministry Tracker by reusing the proven Note Clip notification setup, while keeping the current KHub Firestore rules structure safe for all apps.

This work must not break existing KHub apps, cloud backups, or Firestore security boundaries.

## Current Firebase Rules Context

The Firebase project is `khub-apps`, Cloud Firestore database `(default)`.

The active rules structure shown in Firebase is:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Legacy Note Clip backup path
    match /noteClipUsers/{userId}/backups/{backupId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && backupId == "current";
    }

    // Current KHub shared backup path
    // Covers Talk Arrangements, Ministry Tracker, Finance Tracker,
    // My Wallet, Overtime Tracker, and other current KHub apps.
    match /backups/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }

    // Future KHub app data path
    // Use this for future backups, settings, notification preferences,
    // FCM/device tokens, cloud sync, and app-specific user data.
    match /khubApps/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }

    // Optional finance bridge read-only path.
    // Keep write disabled unless we deliberately build a secure bridge writer.
    match /finance-sync/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

## Required Data Paths

Use the future KHub path for Ministry notification data:

```txt
/khubApps/ministry-tracker/users/{uid}/notificationTokens/{tokenId}
/khubApps/ministry-tracker/users/{uid}/notificationPreferences/current
/khubApps/ministry-tracker/users/{uid}/notificationHistory/{notificationId}
```

Keep existing cloud backup data under the current shared backup path unless the app is deliberately migrated later:

```txt
/backups/ministry-tracker/users/{uid}/...
```

Do not store Ministry notification tokens under:

```txt
/noteClipUsers/...
/finance-sync/...
```

## Boilerplate Gap Report

### Reusable

- Firebase Auth user identity model.
- Firestore user-owned UID path pattern.
- Note Clip FCM registration and token refresh pattern.
- Existing KHub backup path structure.
- Existing service worker / PWA cache version discipline.
- Existing settings page patterns for cloud/auth features.

### Missing

- Shared KHub notification module for all apps.
- Standard notification preference UI.
- Standard FCM token cleanup / refresh helper.
- Standard `firebase-messaging-sw.js` template.
- Standard QA checklist for notification permission, denied permission, token refresh, and cross-account isolation.
- Boilerplate documentation explaining when to use `/backups/...` vs `/khubApps/...`.

### App-specific

- Ministry notification categories.
- Ministry notification timing rules.
- Ministry user-facing preference labels in English and Spanish.
- Ministry live testing on GitHub Pages.

### Boilerplate Improvements Recommended

- Add a reusable `khubNotifications` helper to KHub Boilerplate.
- Add a Firestore path constants file shared by KHub apps.
- Add a standard Notification Settings component.
- Add standard Firestore rule comments for legacy, current, future, and finance bridge paths.
- Add a notification QA section to the release checklist.

## Stage Scope

This file is only the planning and handoff file. Implementation should happen in controlled stages.

### Stage 0 — Repo / Boilerplate Review

Review:

- Ministry Tracker repo structure.
- Note Clip FCM setup.
- KHub Boilerplate Firebase setup.
- Existing service worker files.
- Existing Firebase initialization files.
- Existing settings/auth/cloud backup UI.

Success criteria:

- Identify exact files to reuse from Note Clip.
- Identify exact files to modify in Ministry Tracker.
- Confirm current cache version.
- Confirm current Firebase config location.
- Confirm whether Ministry already has auth/cloud backup enabled.

Stop conditions:

- Do not code until repo paths and existing Firebase setup are confirmed.
- Do not change Firestore rules from the app repo unless explicitly instructed.
- Do not remove existing backup/auth behavior.

### Stage 1 — Requirements and Workflow

Confirm:

- What notification types Ministry Tracker needs first.
- Whether notifications are admin-triggered, app-triggered, or scheduled.
- English/Spanish labels.
- Mobile-first behavior.
- Whether desktop notification support is required.
- What must not be built yet.

Recommended MVP notification types:

- Assignment reminder.
- Report reminder.
- Schedule update notice.
- Backup/sync issue notice.

### Stage 2 — Foundation Implementation

Implement only after Stage 0 and Stage 1 are approved.

Required work:

- Add Firebase Messaging initialization.
- Add notification permission request flow.
- Add token registration under `/khubApps/ministry-tracker/users/{uid}/notificationTokens/{tokenId}`.
- Add token refresh/update logic.
- Add notification preferences under `/khubApps/ministry-tracker/users/{uid}/notificationPreferences/current`.
- Add or update `firebase-messaging-sw.js` if required.
- Bump service worker cache version on deployable changes.

What not to change:

- Do not alter existing ministry reports, credits, regular hours, or dashboard logic.
- Do not rename existing storage keys unless migration is included and approved.
- Do not remove existing backups.
- Do not touch `/finance-sync` writes.
- Do not move Note Clip legacy data.
- Do not broaden Firestore rules beyond authenticated UID ownership.

### Stage 3 — UI / Settings

Add a simple Notification Settings section.

Required behavior:

- Show notification permission status.
- Provide a clear enable button.
- Provide a clear disabled/denied message.
- Let the user toggle notification categories.
- Save preferences only after actual Firestore success.
- Use clean English/Spanish labels if the app supports i18n.

Avoid:

- Native `prompt()`.
- Dead buttons.
- Placeholder switches.
- Success messages before save is complete.

### Stage 4 — Testing / Validation

Required tests:

- App loads without console errors.
- Existing Ministry data still saves/loads.
- Existing cloud backup still works.
- Notification permission can be requested.
- Token is created only for signed-in user.
- Token path uses UID correctly.
- A different signed-in user cannot read/write another user's notification token.
- Permission denied state is handled clearly.
- Mobile layout works.
- Desktop layout works.
- Light/dark mode still works.
- English/Spanish labels still work if present.
- GitHub Pages live app is verified after cache update.

## Required Codex / Coworker Report

Codex or Coworker must report back with:

- Summary.
- Commit hash.
- Files changed.
- Tests run.
- Screenshots if UI changed.
- Cache version before and after.
- Bugs fixed.
- Known issues.
- Mobile verification.
- Desktop verification.
- Light/dark verification.
- English/Spanish verification.
- Firestore path verification.
- Cross-account isolation verification.
- Live GitHub Pages verification.
- Remaining risks.

Approval rule:

- If live GitHub Pages was not verified, mark as `code-implemented, not live-approved yet`.
- Do not approve vague reports.
- Do not approve if cache version was not bumped for deployable changes.
- Do not approve if token path is outside `/khubApps/ministry-tracker/users/{uid}/...`.

## Copy/Paste Prompt for Codex or Coworker

```txt
Access the Ministry Tracker repo: davidfontenelle80-cloud/ministry-tracker-.

Objective:
Add Firebase Cloud Messaging notification support to Ministry Tracker by reusing the proven Note Clip notification setup, while preserving the current KHub Firebase/Firestore structure.

Scope:
Stage 0 and Stage 1 only unless David explicitly approves implementation.

Review these repos/systems first:
1. Ministry Tracker repo structure and existing Firebase/auth/cloud backup setup.
2. Note Clip repo notification setup, especially Firebase Cloud Messaging, token storage, service worker, permission UI, and token refresh logic.
3. KHub Boilerplate Firebase setup and current Firestore path conventions.

Current Firestore rules pattern to respect:
- Legacy Note Clip backups: /noteClipUsers/{userId}/backups/{backupId}, only backupId == current.
- Current shared KHub backups: /backups/{appId}/users/{userId}/{document=**}.
- Future KHub app data: /khubApps/{appId}/users/{userId}/{document=**}.
- Optional finance bridge: /finance-sync/{docId}, read-only for authenticated users, writes disabled.

For Ministry notification data, use:
/khubApps/ministry-tracker/users/{uid}/notificationTokens/{tokenId}
/khubApps/ministry-tracker/users/{uid}/notificationPreferences/current
/khubApps/ministry-tracker/users/{uid}/notificationHistory/{notificationId}

Do NOT:
- Do not store Ministry notification tokens under /noteClipUsers.
- Do not write to /finance-sync.
- Do not broaden Firestore rules.
- Do not remove or rename existing backup paths.
- Do not break existing Ministry data, reports, credits, dashboard, settings, language, theme, or cloud backup.
- Do not start broad redesign work.

Deliverables for this stage:
1. Repo/boilerplate gap report.
2. Exact files that need modification.
3. Exact Note Clip files/patterns to reuse.
4. Implementation plan split into small stages.
5. Risks and stop conditions.
6. Confirm current cache version.
7. Confirm whether a service worker cache bump will be required.

Required report:
- Summary.
- Commit hash if any commit is made.
- Files changed.
- Tests run.
- Screenshots if UI changed.
- Cache version.
- Bugs fixed.
- Known issues.
- Mobile verification.
- Desktop verification.
- Light/dark verification.
- English/Spanish verification.
- Firestore path verification.
- Cross-account isolation verification plan.
- Live GitHub Pages verification if anything deployable changed.
- Remaining risks.

Stop after Stage 0/1 and wait for David approval before implementation.
```

## Running Progress Log

| Date | Stage | Status | Commit | Notes |
|---|---:|---|---|---|
| 2026-06-23 | 0/1 | Planned | pending | Planning note created from Firebase rules screenshot and notification migration request. |

## Open Questions for David

1. Which Ministry notification types should be included in the first MVP?
2. Should notifications be controlled by the individual signed-in user only, or will there be an admin/scheduler role later?
3. Should this first pass only prepare tokens/preferences, or also send real notifications?
4. What should not be built yet?
