---
phase: quick-15
plan: 01
subsystem: ui
tags: [admin, parent-linking, role-check, user-management]

requires:
  - phase: quick-9
    provides: "Admin users treated as parents (admin panel navigation)"
  - phase: quick-10
    provides: "Admin users included in group assignment"
provides:
  - "Admin users can be assigned youth via ParentLinkSheet in user admin panel"
  - "isParentLike() helper for DRY role checks across UserTable"
affects: [admin-users, parent-youth-linking]

tech-stack:
  added: []
  patterns:
    - "isParentLike() helper to centralize parent/admin role equivalence"

key-files:
  created: []
  modified:
    - src/components/admin/UserTable.tsx

key-decisions:
  - "Extracted isParentLike() helper function outside component for DRY role checks instead of inline || at each location"

patterns-established:
  - "isParentLike(role) pattern: use this helper when checking if a user should have parent-like capabilities (youth linking, unlinked warnings)"

requirements-completed: [QUICK-15]

duration: 1min
completed: 2026-02-21
---

# Quick Task 15: Admin Youth Linking Fix Summary

**isParentLike() helper enabling admin users to assign youth via ParentLinkSheet in user admin panel**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-21T13:05:52Z
- **Completed:** 2026-02-21T13:07:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Admin users now show linked youth badges in user admin panel
- Admin users show "Ikke koblet til barn" warning when unlinked
- Tapping admin user cards opens ParentLinkSheet for youth assignment
- Admin cards have same cursor/hover interaction styles as parent cards (mobile and desktop)
- Extracted isParentLike() helper to DRY up 5 role check locations

## Task Commits

Each task was committed atomically:

1. **Task 1: Treat admin users as parents for youth linking in UserTable** - `2974b41` (fix)

**Plan metadata:** `603b7b2` (docs: complete plan)

## Files Created/Modified
- `src/components/admin/UserTable.tsx` - Added isParentLike() helper; updated getLinkedYouth, isUnlinkedParent, openParentLink, and both isParent variable definitions (mobile + desktop) to include admin role

## Decisions Made
- Extracted isParentLike() as a standalone function outside the component (not inside) for clarity and potential reuse; centralizes the parent/admin equivalence in one place

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin youth linking now works identically to parent youth linking
- No blockers or concerns

## Self-Check: PASSED

- [x] `src/components/admin/UserTable.tsx` - FOUND
- [x] Commit `2974b41` - FOUND

---
*Quick Task: 15*
*Completed: 2026-02-21*
