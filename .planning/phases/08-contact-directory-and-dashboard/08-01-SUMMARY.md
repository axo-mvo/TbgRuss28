---
phase: 08-contact-directory-and-dashboard
plan: 01
subsystem: database, api
tags: [supabase, rls, server-actions, attendance, meeting-scoped]

# Dependency graph
requires:
  - phase: 07-meeting-lifecycle
    provides: meetings table, meeting CRUD actions, meeting-scoped stations/groups
provides:
  - meeting_attendance junction table with RLS policies and indexes
  - updateMeetingAttendance server action (per-meeting upsert)
  - AttendingToggle component with dynamic meeting props
  - Dashboard page fetches current meeting and per-meeting attendance
affects: [08-contact-directory-and-dashboard, dashboard, attendance-counts]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-meeting attendance upsert via admin client, Norwegian date formatting with nb-NO locale]

key-files:
  created:
    - supabase/migrations/021_meeting_attendance.sql
    - src/lib/actions/attendance.ts
  modified:
    - src/components/dashboard/AttendingToggle.tsx
    - src/app/dashboard/page.tsx

key-decisions:
  - "Admin client for attendance upsert to avoid RLS complications with ON CONFLICT"
  - "profiles.attending preserved (deprecated) for backward compat -- will remove in future cleanup"
  - "Dashboard conditionally renders AttendingToggle only when upcoming/active meeting exists"

patterns-established:
  - "Per-meeting attendance: junction table pattern with (meeting_id, user_id) unique constraint"
  - "Meeting-scoped data fetch: query meetings with status filter, then join attendance"

requirements-completed: [SCOPE-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 08 Plan 01: Per-Meeting Attendance Schema and Server Actions Summary

**meeting_attendance junction table with RLS policies, upsert server action via admin client, and AttendingToggle updated with dynamic meeting props and nb-NO date formatting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T10:56:45Z
- **Completed:** 2026-02-26T10:58:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `meeting_attendance` table with proper FK constraints, RLS policies (select/insert/update for users, all for admins), and performance indexes
- Built `updateMeetingAttendance` server action using admin client upsert with `onConflict` for atomic per-meeting attendance tracking
- Updated `AttendingToggle` to accept dynamic meeting props (title, date, time, venue) with Norwegian date formatting
- Updated dashboard page to fetch current meeting and per-meeting attendance status

## Task Commits

Each task was committed atomically:

1. **Task 1: Create meeting_attendance migration and attendance server action** - `6094667` (feat)
2. **Task 2: Update AttendingToggle to use per-meeting attendance** - `0dd8859` (feat)

## Files Created/Modified
- `supabase/migrations/021_meeting_attendance.sql` - Migration: table, RLS, indexes, backfill from profiles.attending
- `src/lib/actions/attendance.ts` - Server action: updateMeetingAttendance with auth + admin upsert
- `src/components/dashboard/AttendingToggle.tsx` - Updated component with dynamic meeting props and nb-NO formatting
- `src/app/dashboard/page.tsx` - Fetch current meeting + per-meeting attendance, pass props to toggle

## Decisions Made
- Used admin client for upsert to avoid RLS complications with ON CONFLICT (plan specified)
- Preserved `profiles.attending` column (deprecated, not dropped) for backward compat
- Dashboard conditionally renders AttendingToggle only when an upcoming/active meeting exists
- Fallback defaults for missing time ("18:00") and venue ("Ikke angitt") in dashboard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated dashboard page to pass new AttendingToggle props**
- **Found during:** Task 2 (Update AttendingToggle)
- **Issue:** Dashboard page passed only `initialAttending` -- new component requires meetingId, meetingTitle, meetingDate, meetingTime, meetingVenue props causing TypeScript error
- **Fix:** Added meeting fetch query (upcoming/active), per-meeting attendance fetch, and conditional rendering with full props
- **Files modified:** src/app/dashboard/page.tsx
- **Verification:** TypeScript compiles clean with zero errors
- **Committed in:** 0dd8859 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to maintain compilation. The dashboard page is the only consumer of AttendingToggle, so updating it was required for correctness.

## Issues Encountered
None

## User Setup Required

**Migration must be applied via Supabase Dashboard SQL Editor.** Copy-paste the contents of `supabase/migrations/021_meeting_attendance.sql` into the SQL Editor and run it.

## Next Phase Readiness
- Per-meeting attendance schema ready for contact directory and dashboard features
- AttendingToggle displays dynamic meeting info, ready for integration with meeting list views
- Old `updateAttending` in auth.ts preserved -- can be removed in future cleanup

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 08-contact-directory-and-dashboard*
*Completed: 2026-02-26*
