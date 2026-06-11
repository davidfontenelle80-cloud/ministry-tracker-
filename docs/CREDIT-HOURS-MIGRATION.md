# Ministry Tracker v5.0 — Credit Hour Migration

## Purpose

Version 5.0 separates regular field service time from approved credit hours.

Field service hours remain the only hours used for:

- day totals
- month totals
- service year totals
- goals
- progress rings
- pace/projection calculations
- service reports

Credit hours are tracked separately in `creditEntries` and are used only for:

- credit totals
- credit reports
- credit history
- credit breakdown by type

## New data model

```js
creditEntries: [
  {
    id: 'c_...',
    date: 'YYYY-MM-DD',
    minutes: 120,
    type: 'ldc',
    note: ''
  }
]
```

Supported credit types:

- `ldc`
- `construction`
- `disasterRelief`
- `bethel`
- `remoteBethel`
- `translation`
- `remoteVolunteer`
- `pioneerSchool`
- `otherCredit`

## Migration behavior

The v5 migration layer runs once per user/device.

Before making changes, it stores a full local backup at:

```text
ministry-tracker-pre-v5-credit-migration
```

The migration then:

1. Ensures `creditEntries` exists.
2. Scans existing `sessions` for old credit-like category IDs.
3. Converts matching entries into `creditEntries`.
4. Removes converted credit-like sessions from regular field service sessions.
5. Converts legacy `creditByMonth` totals into dated `otherCredit` entries.
6. Clears `creditByMonth` so monthly credit totals are calculated from entries.
7. Replaces the old mixed category list with normal field service activity tags.
8. Marks the user state with `schemaVersion: 5` and `creditSystemVersion: 1`.

## Old categories converted to credit

These old category IDs are treated as credit if found in existing sessions:

- `ldc`
- `construction`
- `disasterRelief`
- `bethel`
- `remoteBethel`
- `translation`
- `remoteVolunteer`
- `pioneerSchool`
- `otherCredit`

Any unknown category remains regular field service.

## Cloud backup compatibility

The app already saves the complete localStorage app key to Firestore through Cloud Backup.

Because v5 keeps the same main storage key:

```text
ministry-tracker-v4
```

cloud save/restore continues to work. When restored data loads, the migration layer normalizes it into the v5 credit model.

## v5.0.1 hardening

The follow-up hardening pass makes the separation native in the base app, not only the compatibility shim:

- `APP_CONFIG.defaults` now starts with `schemaVersion: 5`, `creditSystemVersion: 1`, `creditEntries: []`, and field-service-only activity tags.
- Month, service-year, goal, ring, pace, projection, and suggestion calculations use only regular field service sessions.
- Credit totals come from `creditEntries` only; legacy `creditByMonth` is treated as migration input, not active monthly storage.
- Service-year archives include `creditEntries`, and clear-month removes both field sessions and credit entries for that month.
- The service worker now checks for updates on every startup and uses a waiting-service-worker banner/refresh path instead of requiring a hard refresh.

## Testing checklist

Test with a clean profile:

- App opens without errors.
- `creditEntries` is created.
- Credit dashboard value starts at `0:00`.
- Adding field service affects day/month/year totals.
- Adding credit affects only credit totals.
- Credit does not move progress rings.
- Calendar shows `C 1:00` only when credit exists.
- Reports show credit total and used categories only.

Test with old beta data:

- Regular sessions stay in field service totals.
- LDC/Bethel/Construction/Pioneer School sessions move to credit.
- Pre-migration backup key is created.
- Export/import still works.
- Cloud save/restore still works.

## Rollback

If a user reports a migration problem, inspect:

```text
ministry-tracker-pre-v5-credit-migration
```

That backup contains the pre-v5 local state and can be used to rebuild or restore their previous records.
