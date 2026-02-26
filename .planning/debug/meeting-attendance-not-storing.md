---
status: awaiting_human_verify
trigger: "meeting-attendance-not-storing - User creates a new meeting, tries to accept it from the dashboard. The UI updates briefly (optimistic update) but then reverts - the attendance response is not being stored."
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - Migration 021_meeting_attendance.sql was never applied to the Supabase instance
test: Direct query to meeting_attendance table returned PGRST205 "Could not find the table 'public.meeting_attendance' in the schema cache"
expecting: After applying migration, attendance toggle will persist correctly
next_action: User must apply migration via Supabase Dashboard SQL Editor, then test attendance toggle

## Symptoms

expected: When user taps "accept" on the upcoming meeting card on the dashboard, their attendance should be stored and the UI should reflect they've accepted
actual: UI updates briefly showing acceptance, then reverts back as if nothing happened - the response is not persisted
errors: No visible error messages shown to user
reproduction: Create a new meeting, go to dashboard, try to accept the meeting
started: First time testing acceptance on a new meeting

## Eliminated

- hypothesis: RLS policies blocking the insert
  evidence: Server action uses createAdminClient() (service role key) which bypasses RLS entirely
  timestamp: 2026-02-26T00:00:30Z

- hypothesis: Wrong onConflict columns in upsert
  evidence: UNIQUE(meeting_id, user_id) in migration matches onConflict 'meeting_id,user_id' in code
  timestamp: 2026-02-26T00:00:30Z

- hypothesis: Meeting ID not being passed correctly
  evidence: Dashboard page fetches upcomingMeeting.id (UUID) and passes it directly to AttendingToggle as meetingId prop
  timestamp: 2026-02-26T00:00:30Z

- hypothesis: User profile not existing (FK constraint violation)
  evidence: Profile is created during registration (auth.ts line 176-188), user must have profile to reach dashboard
  timestamp: 2026-02-26T00:00:30Z

- hypothesis: Code logic error in AttendingToggle optimistic update / revert
  evidence: Code correctly does optimistic update, calls server action, reverts only if result.error is truthy - the revert behavior is correct for a failing action
  timestamp: 2026-02-26T00:00:45Z

## Evidence

- timestamp: 2026-02-26T00:00:20Z
  checked: AttendingToggle.tsx handleSelect function
  found: Optimistic update via setAttending, then server action call in startTransition, reverts to initialAttending on error
  implication: UI reverts ONLY when result.error is truthy - the server action IS returning an error

- timestamp: 2026-02-26T00:00:25Z
  checked: attendance.ts server action
  found: Uses createAdminClient() for upsert, has try/catch that returns generic error messages. Errors are silently caught and returned as {error: string}
  implication: The user sees no error message because the component doesn't display them - it only reverts the UI state

- timestamp: 2026-02-26T00:00:40Z
  checked: 08-01-SUMMARY.md (phase execution summary)
  found: Line 106 explicitly states "Migration must be applied via Supabase Dashboard SQL Editor. Copy-paste the contents of supabase/migrations/021_meeting_attendance.sql into the SQL Editor and run it."
  implication: The migration file was created during phase execution but requires manual application to Supabase

- timestamp: 2026-02-26T00:00:45Z
  checked: ALL_MIGRATIONS.sql
  found: Does NOT contain meeting_attendance migration content
  implication: Confirms 021 migration was not bundled into the aggregated migrations file

- timestamp: 2026-02-26T00:01:30Z
  checked: Direct Supabase query to meeting_attendance table via admin client
  found: "PGRST205 - Could not find the table 'public.meeting_attendance' in the schema cache. Perhaps you meant the table 'public.meetings'"
  implication: CONFIRMED - the meeting_attendance table does not exist in the database. The migration was never applied.

## Resolution

root_cause: Migration 021_meeting_attendance.sql has not been applied to the Supabase database instance. The meeting_attendance table does not exist, causing the admin client upsert to fail with PGRST205 "table not found" error. This error is caught by the try/catch in the server action and returned as {error: 'Noe gikk galt. Prøv igjen.'}, which triggers the optimistic UI revert in AttendingToggle.
fix: Apply migration 021_meeting_attendance.sql to the Supabase instance via SQL Editor
verification: Pending user action - must apply migration then test attendance toggle
files_changed: []
