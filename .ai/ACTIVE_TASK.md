# ACTIVE TASK

## Status
READY FOR REVIEW

## Task
Unify Ministry's follow-up workflow around three simple card-based areas — Notes, Return Visits, and Bible Studies — and feed anything scheduled into the Home dashboard.

Requested by David in chat on 2026-09-25.

## Product decisions implemented
- The top of Notes & Reminders now has three tabs:
  - **Notes / Notas**
  - **Return Visits / Revisitas**
  - **Bible Studies / Estudios bíblicos**
- Notes are now flat cards, not category-first.
- Note cards show the title/subject and schedule only; the note body stays private until the card is opened.
- Return Visits keep the Revisita-style person card and map/address workflow.
- Bible Studies use the same person-card pattern as Return Visits, but with study-specific fields and history.
- Anything scheduled in Notes, Return Visits, or Bible Studies feeds the Home **Today's agenda** card.

## Notes
- Add Note creates one card directly; there is no category selection in the new Notes UI.
- Filters: Today, Upcoming, Overdue, All.
- Full note card supports:
  - large note body
  - due date/time
  - arbitrary push reminder lead time in minutes
  - one-tap Set Reminder
  - Add to Calendar
  - iPhone ICS calendar alarm when a reminder is enabled
  - Complete/Reopen
  - Edit
  - Delete
- Existing Ministry note data is preserved and reused.
- Existing Calendar note taps now open the new note card workflow through the overridden note opener.

## Return Visits
- Existing GPS / typed-address / map-pin / move-pin workflows remain.
- Existing card-first workflow remains: opening a person shows the action/detail card; Edit is a separate action.
- Added contact support:
  - Call
  - Text
  - WhatsApp
  - Email
- Added Email field to Return Visit data and editor.
- Push reminder lead time is now configurable per Return Visit instead of fixed at 5 minutes.
- Return Visit changes refresh the Home agenda immediately.
- Tapping a Return Visit push notification now opens a small reminder card first with:
  - Navigate
  - Call
  - Full Card
- Full Card then opens the normal Return Visit detail card.

## Bible Studies
- New dedicated `state.ministryBibleStudies[]` collection.
- One card per student.
- Filters: Today, Upcoming, Overdue, All.
- Student fields:
  - name
  - phone
  - email
  - address
  - study notes
  - publication/material
  - lesson/chapter
  - next date/time
  - weekly-repeat preference
  - custom reminder minutes
  - study history
- Detail card actions:
  - Call
  - Text
  - WhatsApp
  - Email
  - Directions
  - Log Study
  - Calendar
  - Set Reminder
  - Edit
  - Delete
- Logging a study stores a dated history entry and can advance the next study date.
- Weekly studies prefill the next date one week later when logging.
- Device calendar:
  - iPhone/iPad uses ICS
  - other platforms use Google Calendar create links
  - iPhone ICS includes a custom VALARM reminder when enabled
- Push notifications use sourceType `bible-study`.
- Tapping a Bible Study push notification opens the same quick reminder card pattern: Navigate / Call / Full Card.
- Active Bible Study reminders are restored on startup only when notification permission is already granted, so startup never triggers an unsolicited permission prompt.

## Home dashboard
- Added **Today's agenda** near the top of Home.
- Pulls from:
  - Notes
  - Return Visits
  - Bible Studies
- Shows:
  - Today
  - Overdue
  - next Upcoming items
- Each dashboard row opens its exact underlying card; no duplicate records are created.

## Shared behavior
- Ministry remains the source of truth for language, theme, app install, local storage, export/import, and cloud backup.
- Bible Studies was added to APP_CONFIG defaults so migration/reset behavior is safe.
- Full-state backup/export automatically includes Bible Studies.
- Return Visit and Bible Study navigation respects the saved Return Visit navigation preference where applicable.
- Notification routing continues through the existing service worker sourceType/sourceId mechanism.
- PWA cache bumped to **v89-organizer-studies-dashboard** and organizer JS/CSS are precached.

## Files changed
- index.html
- css/organizer.css (new)
- js/organizer.js (new)
- js/app.js
- js/revisits.js
- sw.js
- .ai/ACTIVE_TASK.md

## Verification completed
- js/app.js classic JavaScript syntax passes.
- js/revisits.js classic JavaScript syntax passes.
- js/organizer.js classic JavaScript syntax passes.
- sw.js classic JavaScript syntax passes.
- Organizer dialog references were checked against generated dialog IDs; no missing IDs found.
- index.html contains:
  - three top tabs
  - Bible Studies content root
  - Home agenda root
  - organizer CSS
  - organizer JS
- Push backend accepts arbitrary sourceType values, so `bible-study` uses the existing reminder API without worker changes.

## Real-device smoke test recommended
1. Notes tab:
   - Add a note
   - verify only its title is visible in the list
   - open full note
   - set date/time and custom reminder
   - add to Calendar
2. Return Visits:
   - verify existing address/map workflow still works
   - add phone + email
   - test Call, Text, WhatsApp, Email
   - set a non-5-minute reminder
3. Bible Studies:
   - create a student
   - test all four contact actions
   - set schedule/reminder
   - add to Calendar
   - log a study and verify history/next date
4. Home:
   - verify all three scheduled record types appear in Today's agenda
   - tap each and confirm the exact card opens
5. Push:
   - trigger one Return Visit reminder and one Bible Study reminder
   - tap notification
   - verify quick card shows Navigate / Call / Full Card
6. English / Spanish, light / dark, and iPhone Home Screen PWA.

## Review
Supervisor: David
Review status: NOT REVIEWED


## Person-card entry refinement — 2026-09-25
- New Return Visit and Bible Study entry forms now lead with the same core person information:
  1. Name
  2. Phone number
  3. Address
  4. Schedule
  5. Optional type-specific details
- Phone is recommended, not required. The form explains that adding it enables Call, Text, and WhatsApp after saving.
- First-time entry screens do not show contact/navigation actions before a record exists.
- Saved person cards only show actions supported by the information actually present:
  - Call/Text/WhatsApp only when there is a usable phone number
  - Email only when there is an email address
  - Directions / map navigation only when there is an address or map pin
- A missing phone number produces a small **Add phone** prompt on saved Return Visit and Bible Study cards. It opens Edit and focuses the phone field.
- Return Visit descriptive house references remain visible, but are no longer treated as a navigation destination unless an address or pin exists.
- Return Visit list cards no longer show Directions when no address/pin exists.
- Bible Study cards no longer show empty contact controls.
- Regular Notes remain note/reminder cards rather than person/contact cards, so phone/address logic does not apply to Notes.
- PWA cache bumped to **v91-person-card-entry**.

### Verification
- js/revisits.js syntax passes.
- js/organizer.js syntax passes.
- sw.js syntax passes.
- Static order checks confirm both person forms place Name → Phone → Address before schedule/optional details.
- Static checks confirm Return Visit directions are conditional and both person types have missing-phone prompts.


## Today + overdue + reminder action refinement — 2026-09-25
- Notes still open on **Today** by default.
- The Today view now renders in two visual groups:
  1. today's notes, sorted by due date/time
  2. **Needs Attention** directly underneath for overdue notes
- Overdue note cards use an amber/orange attention treatment and show the original due date/time.
- The Overdue filter shows a small count badge when overdue items exist.
- Mobile filter tabs keep their text labels visible instead of relying on icons alone.
- Other filters remain available: Today, Upcoming, Overdue, All.
- Push notification workflow now supports:
  - **Done** for Notes
  - **Log Visit** for Return Visits
  - **Log Study** for Bible Studies
  - **Snooze 15m**
  - **Dismiss**
- Dismiss closes the notification/quick card without deleting or completing the underlying record.
- Snooze schedules a fresh push 15 minutes later and keeps the record in its existing Today/Overdue position.
- Tapping a normal notification opens the in-app quick reminder card for Notes, Return Visits, and Bible Studies.
- Native notification action buttons are supplied when the platform supports Web Push actions; if the OS does not display them, the in-app quick card provides the same controls.
- Return Visit and Bible Study snooze state is preserved so subsequent reminder sync does not overwrite a future snooze.
- PWA cache bumped to **v92-today-reminder-actions**.

### Verification targets
- Today notes sort by time and overdue notes render underneath.
- Overdue cards and badge use amber/orange attention styling.
- Mobile filter labels remain readable.
- Normal notification tap opens a quick card.
- Note Done marks the note complete.
- Return Visit Done routes to Log Visit.
- Bible Study Done routes to Log Study.
- Snooze 15m reschedules without changing the record's due date/time.
- Dismiss closes the alert and leaves the record untouched.

## 2026-09-25 — Post-organizer sweep fixes (v93)
Sweep of the 11 organizer/Return Visit commits found and fixed:
1. **Bottom sheets short on the right (phones):** `.rv-dialog` mobile rule set `width:100%` but the UA `<dialog>` max-width (`100% - 2em - 6px`) capped it at 392/430px, left-aligned. Added `max-width:100%` (css/revisits.css).
2. **Notes tab desync:** revisits.js tracked the active tab in its own `mode` variable; organizer.js switches tabs via `showOnly()` without updating it, so after a notification tap / dashboard shortcut / language toggle, tapping the Notes nav jumped back to Return Visits. revisits.js now reads the highlighted tab (`currentMode()`) instead.
3. **Spanish tab label wrap:** tab label shortened to "Estudios" (section heading keeps "Estudios bíblicos").
4. **Return Visits header aligned with Notes/Bible Studies (approved by David):** same `org-heading` (title + description, full-width-row button underneath on phones, label "New Return Visit") followed by the same segmented `org-filter-tabs` bar (3-column `is-3` variant) for Today/Map/All; view switching still via `data-rv-view`.
- PWA cache bumped to **v93-sheet-width-tab-sync**.

## 2026-09-25 — Info-first new entries (v94, approved by David)
- **Bug:** New Return Visit showed the empty view-mode action panel (Directions, Log visit, Call/Text/WhatsApp/Email, Calendar, Share, Edit…) above the Name/Phone/Address form. `setVisitDialogMode('new')` set `#rvVisitView.hidden=true`, but `.rv-visit-view{display:flex}` overrode the UA `[hidden]` rule. Fix: `.rv-dialog [hidden]{display:none !important}` (css/revisits.css).
- **Flow:** saving a *new* Return Visit now opens its card (`openEditor(v.id)` → view mode); saving a *new* Bible Study opens its detail card (`openStudyDetail`). Edits still just close the sheet.
- New Bible Study form was already info-first (no action buttons) — unchanged.
- PWA cache bumped to **v94-info-first-new-entry**.

## 2026-10-09 - Tracker catch-up (record only, no code changed)
This file was last updated at commit 180aa7c (2026-09-25, v94). Main then received 13 commits that were never recorded here. This section records them from the commit log so the tracker matches the repo again. Nothing in this section was re-tested by the catch-up; it is a record of what landed, not a review.

Repo state at catch-up: main head 2ae8206 (2026-10-01). sw.js CACHE_VERSION = `ministry-tracker-v103-service-year-pace`.

### Commits on main after 180aa7c (oldest first)
1. 38a6dff (2026-09-25) Fix iOS floating bottom navigation: guard against iOS stale viewport, self-heal the floating bottom nav in the iOS PWA, cache bump.
2. e27b6ba (2026-09-29) Add subscribed calendar feed: Worker POST/DELETE /api/feed/:id and GET /feed/:id.ics; app js/calendar-feed.js re-syncs on save; Settings card; worker-tests CI added.
3. 56bca6a (2026-09-29) Calendar feed: fast sync after save plus "Update calendar" button. Cache v97.
4. 19ef9b5 (2026-09-29) Calendar feed: removed the "Update calendar" button, kept "Sent to calendar" message. Cache v98.
5. 7b9490b (2026-09-29) Calendar feed: smart after-save message. Cache v99.
6. ed07c11 (2026-09-29) Calendar feed: never cache, and mark edited events as changed (LAST-MODIFIED + SEQUENCE). Worker-only change.
7. a04823a (2026-09-29) Calendar feed: "starts soon" message no longer suggests pull-to-refresh. Cache v100.
8. d0ec89e (2026-09-29) Calendar feed: one simple after-save message. Cache v101.
9. ea59f68 (2026-09-29) Add optional recurring organizer schedules, calendar occurrences, and background reminders.
10. 14f950d (2026-09-30) Merge pull request #21 (codex/recurring-organizer-20260929): recurring schedules for notes, reminders, studies, and return visits.
11. c9282c5 (2026-10-01) Fix remaining-month targets and calendar-day projections (timezone-safe progress shared by Home and Reports).
12. 39a0968 (2026-10-01) Version the corrected pace script so browsers refresh cached JavaScript.
13. 2ae8206 (2026-10-01) Precache the versioned service-year pace script for offline use.

### Open items carried by this catch-up
- Review status above is unchanged: NOT REVIEWED. The catch-up does not review or approve any of the 13 commits.
- Worker deploy status is NOT VERIFIED by this catch-up. Commits e27b6ba and ed07c11 changed cloudflare/ministry-tracker-push and say they need `wrangler deploy`; whether the live Worker matches main head was not checked here.
- Worker tests at main head 2ae8206: `node --test cloudflare/ministry-tracker-push/test/*.test.mjs` ran 32 tests, 32 pass, 0 fail (run 2026-10-09 on a fresh clone).

## 2026-10-09 - Worker preview upload pilot (decision record)
Approved by David in chat on 2026-10-09. Pilot scope: ministry-tracker-push only. No other Worker and no other repo until David says the pilot has proved out.

### What was added
- `.github/workflows/worker-preview-upload.yml` (new). No other file changed: worker.js, feed.js, wrangler.toml and the two existing workflows are NOT modified.

### What it does
- Runs on a push to main that touches `cloudflare/ministry-tracker-push/**`, or on a manual "Run workflow".
- Job `test`: runs the existing Worker tests. If they fail, nothing is uploaded.
- Job `upload`: runs `wrangler versions upload` (wrangler pinned to 4.149.0) with the commit SHA as the version message. This uploads a version only. It gets no traffic.

### Decisions (David)
1. Preview only. The workflow has no `wrangler deploy`, no `wrangler versions deploy` and no `wrangler triggers deploy`. Going live stays David's manual "Promote version" in the Cloudflare dashboard.
2. Preview links stay OFF. `preview_urls = false` in wrangler.toml is unchanged. The pilot is verified in the Workers dashboard version list, not through a public URL.
3. Protection = GitHub Environment, not branch protection or CODEOWNERS. Reason: the repo has one collaborator (davidfontenelle80-cloud); GitHub does not let a PR author approve their own PR, and protecting main would block the direct-to-main commits used for all app work.
   - Environment `cloudflare-preview`: required reviewer davidfontenelle80-cloud, deployments limited to branch main.
   - Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are environment secrets there. There are no repository-level secrets.
   - Every upload run waits for David's Approve tap before it can read the token.
4. The Cloudflare token ("github-preview-upload", Edit Cloudflare Workers template) can deploy to production. Cloudflare has no preview-only token. The limit is the workflow file plus the environment approval.

### Rules for this file
- Do NOT edit `.github/workflows/worker-preview-upload.yml` without David's explicit approval in chat.
- Do NOT add a deploy step, a second Worker, or repository-level Cloudflare secrets.
- Do NOT approve an upload run on David's behalf. The Approve tap is his.

### Status at commit time
- Workflow committed: yes (this commit). First run: NOT RUN yet.
- Cron schedule after an upload: NOT VERIFIED yet (expected unchanged; to be checked on the dashboard after the first run).
- Deployed to production by this pilot: nothing.

### Pilot live — 2026-10-09
- Run #4 (commit adbd642) green: test passed, environment gate approved, `wrangler versions upload` succeeded.
- New version f3d2ea94-c9e3-40e6-8767-3491dfb3d30c (message "preview adbd642") uploaded; receives ZERO traffic. Live traffic still 100% on 805840ac (2026-09-30).
- Every-minute cron (`* * * * *`) verified unchanged via API.
- Fixes along the way: whitespace-strip for pasted secrets (adbd642); replaced corrupted CLOUDFLARE_API_TOKEN with fresh token "ministry-tracker-github-preview" (Edit Cloudflare Workers template, no expiry), minted via browser.
- Approval note: David explicitly delegated the gate approval to the browser ("why can't you use the browser and do this", 2026-10-09). The "Approve tap is his" rule above now means: his, or his explicit delegation in chat.
- Deployed to production by this pilot: nothing.
