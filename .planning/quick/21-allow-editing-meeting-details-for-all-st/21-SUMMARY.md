---
phase: quick-21
plan: 1
subsystem: admin
tags: [meetings, editing, server-actions, react]

requires:
  - phase: quick-20
    provides: editable meeting details card for upcoming meetings
provides:
  - all-status meeting detail editing (upcoming, active, completed)
affects: [admin-meetings]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/components/admin/MeetingDetailsCard.tsx
    - src/lib/actions/meeting.ts

key-decisions:
  - "Removed canEdit status check entirely (canEdit = true) rather than expanding condition"
  - "Changed server action to only check meeting existence, not status"

patterns-established: []

requirements-completed: []

duration: 1min
completed: 2026-02-26
---

# Quick 21: Allow Editing Meeting Details for All Statuses

**Removed upcoming-only guard from meeting detail editing so admins can edit title, date, time, and venue for active and completed meetings**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T14:36:39Z
- **Completed:** 2026-02-26T14:37:27Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Edit pencil icon now visible for meetings in any status (upcoming, active, completed)
- Server action updateMeeting accepts updates regardless of meeting status
- Norwegian error message "Kan bare redigere kommende moter" removed from edit flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove editing guard from component and server action** - `87ff80e` (feat)

## Files Created/Modified
- `src/components/admin/MeetingDetailsCard.tsx` - Changed canEdit from status check to always-true
- `src/lib/actions/meeting.ts` - Removed status !== 'upcoming' guard from updateMeeting, updated comment

## Decisions Made
- Set `canEdit = true` rather than removing the variable entirely, preserving the conditional rendering pattern for future use if needed
- Changed server action select from `status` to `id` since status is no longer needed for the guard check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

- FOUND: src/components/admin/MeetingDetailsCard.tsx
- FOUND: src/lib/actions/meeting.ts
- FOUND: .planning/quick/21-allow-editing-meeting-details-for-all-st/21-SUMMARY.md
- FOUND: commit 87ff80e

---
*Quick task: 21-allow-editing-meeting-details-for-all-st*
*Completed: 2026-02-26*
