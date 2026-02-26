---
phase: quick-24
plan: 1
subsystem: database, admin
tags: [supabase, meeting-attendance, admin]

requires:
  - phase: 08-attendance
    provides: meeting_attendance table and AttendingToggle
provides:
  - Meeting-scoped attendance for admin meeting detail Grupper tab
  - Meeting-scoped attendance for admin users page
affects: [admin, meetings, attendance]

tech-stack:
  added: []
  patterns: [meeting_attendance table as canonical attendance source]

key-files:
  created: []
  modified:
    - src/app/admin/meetings/[id]/page.tsx
    - src/app/admin/users/page.tsx

key-decisions:
  - "Admin users page scopes to current upcoming/active meeting for attendance display"
  - "No changes needed to UserTable or UserCard components - fix is purely in data layer"

patterns-established:
  - "Always query meeting_attendance table for attendance, never profiles.attending"

requirements-completed: [fix-meeting-attendance-scoping]

duration: 1min
completed: 2026-02-26
---

# Quick Task 24: Fix Meeting Attendance Showing Previous Meeting Data

**Replaced deprecated profiles.attending with meeting-scoped meeting_attendance queries on admin meeting detail and admin users pages**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T15:24:36Z
- **Completed:** 2026-02-26T15:26:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Admin meeting detail Grupper tab now shows attendance dots from meeting_attendance table scoped to the viewed meeting ID
- Admin users page now shows attendance badges scoped to the current upcoming/active meeting
- New meetings with no responses correctly show all gray/unanswered dots instead of stale previous-meeting data
- No references to deprecated profiles.attending remain in any page data fetching

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix meeting detail page to use meeting_attendance table** - `7ccb01c` (fix)
2. **Task 2: Fix admin users page to show meeting-scoped attendance** - `998543a` (fix)

## Files Created/Modified
- `src/app/admin/meetings/[id]/page.tsx` - Added parallel meeting_attendance query, built attendance map, merged into user data
- `src/app/admin/users/page.tsx` - Added admin client import, current meeting lookup, meeting_attendance query, attendance merge

## Decisions Made
- Admin users page scopes attendance to the most recent upcoming/active meeting (matching dashboard behavior)
- No changes needed to UserTable.tsx or UserCard.tsx -- they already accept `attending: boolean | null` and render correctly; the fix is purely in the data layer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

---
*Quick task: 24-fix-meeting-attendance-showing-previous-*
*Completed: 2026-02-26*
