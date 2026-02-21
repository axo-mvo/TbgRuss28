---
phase: quick-14
plan: 01
subsystem: ui, database
tags: [supabase, react, server-actions, attendance, dashboard, admin]

requires:
  - phase: 01-foundation
    provides: profiles table, auth actions, dashboard page
  - phase: 02-groups
    provides: group assignment UI (UserCard, GroupBuilder, UnassignedPool, GroupBucket)
provides:
  - attending boolean column on profiles table
  - updateAttending server action for user self-service RSVP
  - AttendingToggle dashboard component with Ja/Nei buttons
  - Admin attendance visibility in users page and group assignment view
affects: [admin, dashboard, groups]

tech-stack:
  added: []
  patterns: [optimistic UI with useTransition for server action calls, attendance dot indicators in group assignment]

key-files:
  created:
    - supabase/migrations/016_attending_column.sql
    - src/components/dashboard/AttendingToggle.tsx
  modified:
    - src/lib/actions/auth.ts
    - src/app/dashboard/page.tsx
    - src/app/admin/users/page.tsx
    - src/components/admin/UserTable.tsx
    - src/app/admin/groups/page.tsx
    - src/components/admin/GroupBuilder.tsx
    - src/components/admin/UserCard.tsx
    - src/components/admin/UnassignedPool.tsx
    - src/components/admin/GroupBucket.tsx

key-decisions:
  - "Nullable boolean (null = not yet answered) rather than default false, so admins can distinguish 'not responded' from 'declined'"
  - "Explicit Ja/Nei buttons instead of toggle switch for clearer mobile UX and ternary state visibility"
  - "Opacity-50 with colored dot indicators (red for declined, gray for unanswered) in group assignment view"

patterns-established:
  - "AttendingToggle: useTransition for optimistic server action updates with revert on error"
  - "Attendance dot indicator pattern: small colored circles before user name in compact card views"

requirements-completed: [ATTEND-01, ATTEND-02, ATTEND-03, ATTEND-04, ATTEND-05]

duration: 3min
completed: 2026-02-21
---

# Quick Task 14: Add Participation Toggle for Wednesday Meeting Summary

**Nullable attendance toggle on dashboard with Ja/Nei buttons, admin badges in users page, and opacity-faded non-attending users in group assignment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T12:36:38Z
- **Completed:** 2026-02-21T12:39:54Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Users can RSVP for Wednesday meeting from dashboard with explicit Ja/Nei buttons and optimistic updates
- Admin users page shows attendance status as colored badges (Kommer/Kommer ikke/Ikke svart) in both mobile card and desktop table
- Admin group assignment view visually fades non-attending and unanswered users (opacity-50) with colored dot indicators
- Nullable boolean column preserves three states: attending, not attending, not yet answered

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and server action** - `c43f322` (feat)
2. **Task 2: Dashboard toggle and admin visibility updates** - `235f02e` (feat)

## Files Created/Modified
- `supabase/migrations/016_attending_column.sql` - Adds nullable boolean attending column to profiles
- `src/components/dashboard/AttendingToggle.tsx` - Client component with Ja/Nei buttons, useTransition for optimistic updates
- `src/lib/actions/auth.ts` - Added updateAttending server action
- `src/app/dashboard/page.tsx` - Added attending to profile query, renders AttendingToggle
- `src/app/admin/users/page.tsx` - Added attending to profiles select query
- `src/components/admin/UserTable.tsx` - Added attending type, AttendanceBadge helper, mobile + desktop display
- `src/app/admin/groups/page.tsx` - Added attending to profiles select query
- `src/components/admin/GroupBuilder.tsx` - Added attending to UserData interface
- `src/components/admin/UserCard.tsx` - Added attending prop, opacity-50 fade, colored dot indicators
- `src/components/admin/UnassignedPool.tsx` - Added attending to UserData, passes to UserCard
- `src/components/admin/GroupBucket.tsx` - Added attending to UserData, passes to UserCard

## Decisions Made
- Nullable boolean (null = not yet answered) rather than default false, so admins can distinguish "not responded" from "declined"
- Explicit Ja/Nei buttons instead of toggle switch for clearer mobile UX and ternary state visibility
- Opacity-50 with colored dot indicators (red for declined, gray for unanswered) in group assignment view

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

Database migration must be applied to Supabase:
- Run `016_attending_column.sql` against the production database to add the `attending` column

## Next Phase Readiness
- Feature is self-contained and complete
- No blockers for subsequent tasks

## Self-Check: PASSED

All 11 files verified present. Both task commits (c43f322, 235f02e) verified in git log.

---
*Quick Task: 14*
*Completed: 2026-02-21*
