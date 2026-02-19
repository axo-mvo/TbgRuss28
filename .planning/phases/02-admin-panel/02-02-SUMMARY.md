---
phase: 02-admin-panel
plan: 02
subsystem: admin
tags: [user-management, responsive-table, parent-child-links, search, server-components, bottom-sheet, norwegian]

# Dependency graph
requires:
  - phase: 02-admin-panel
    plan: 01
    provides: "Server actions (updateUserRole, deleteUser, updateParentYouthLink), Dialog, BottomSheet, SearchInput, EmptyState, Badge, Button components"
provides:
  - "Admin user management page at /admin/users with Server Component data fetching"
  - "UserTable client component with responsive card stack (mobile) and table (desktop) layout"
  - "ParentLinkSheet bottom sheet for re-linking parents to youth via checkboxes"
  - "Client-side user search by name"
  - "Role change dialog with radio selection and inline error handling"
  - "Delete confirmation dialog calling deleteUser server action"
affects: [02-admin-panel, 04-meeting-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [responsive-card-table-pattern, server-component-relational-fetch, custom-dialog-with-body-content]

key-files:
  created:
    - src/app/admin/users/page.tsx
    - src/components/admin/UserTable.tsx
    - src/components/admin/ParentLinkSheet.tsx
  modified: []

key-decisions:
  - "Custom role-change dialog using native <dialog> directly instead of Dialog component (Dialog lacks children/body slot for radio selection)"
  - "ParentYouthLink.youth typed as union YouthProfile | YouthProfile[] to handle Supabase PostgREST inference variability"
  - "ParentLinkSheet built in Task 1 alongside UserTable due to import dependency (Task 2 verified completeness)"

patterns-established:
  - "Responsive card-table pattern: md:hidden card stack + hidden md:block table for admin data lists"
  - "Server Component relational fetch: FK-disambiguated Supabase join passed as props to client component"
  - "Custom dialog with body content: native <dialog> with useRef/useEffect for open/close, radio inputs for selection"

requirements-completed: [ADMN-01, ADMN-02, ADMN-03]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 02 Plan 02: User Management UI Summary

**Mobile-first user management page with responsive card/table layout, parent-child link display with warning badges, role change radio dialog, delete confirmation, and ParentLinkSheet bottom sheet for re-linking parents to youth**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T13:37:12Z
- **Completed:** 2026-02-19T13:40:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Admin users page fetches all profiles with parent-child relational join using FK disambiguation syntax and passes to client component
- UserTable renders responsive layout: card stack on mobile with full user info, standard table on desktop with all columns
- Users filterable by name via client-side search; parent rows show linked youth as teal badges; unlinked parents show coral warning badge
- Role change uses custom dialog with radio selection for youth/parent/admin roles; delete uses confirmation dialog
- ParentLinkSheet allows admin to check/uncheck youth to link/unlink from a parent, with save calling updateParentYouthLink server action

## Task Commits

Each task was committed atomically:

1. **Task 1: User management Server Component and UserTable client component** - `8e1e174` (feat)
2. **Task 2: ParentLinkSheet bottom sheet** - included in `8e1e174` (built alongside UserTable due to import dependency; verified as complete)

## Files Created/Modified
- `src/app/admin/users/page.tsx` - Server Component fetching profiles with parent-child links and youth list, renders back link and heading, passes data to UserTable
- `src/components/admin/UserTable.tsx` - Client component with responsive card/table layout, search, role change dialog, delete dialog, parent link sheet integration
- `src/components/admin/ParentLinkSheet.tsx` - Client component rendering BottomSheet with youth checkbox list, save button calling updateParentYouthLink server action

## Decisions Made
- Built custom role-change dialog using native `<dialog>` directly instead of reusing the Dialog component, because Dialog only accepts title/description strings and lacks a children/body slot for the role radio selection UI
- Typed `ParentYouthLink.youth` as `YouthProfile | YouthProfile[]` to handle Supabase PostgREST type inference variability (FK to primary key should return object, but TS infers array)
- Built ParentLinkSheet as a complete component in Task 1 rather than a stub, since the import was needed and implementation was straightforward; Task 2 served as verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Custom dialog for role change instead of reusing Dialog component**
- **Found during:** Task 1 (UserTable implementation)
- **Issue:** The existing Dialog component only accepts `title` and `description` as strings with a single `onConfirm` callback. The plan requires radio buttons for role selection within the dialog body, which needs custom children.
- **Fix:** Built the role change dialog inline using native `<dialog>` element with useRef/useEffect pattern (same as Dialog component internally), adding radio inputs for role selection
- **Files modified:** src/components/admin/UserTable.tsx
- **Verification:** TypeScript passes, role selection renders correctly in build
- **Committed in:** 8e1e174 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Supabase type inference for youth FK relation**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** Supabase PostgREST infers `youth` as `YouthProfile[]` (array) even though `youth_id -> profiles.id` is a many-to-one relationship that should return an object
- **Fix:** Changed type to `YouthProfile | YouthProfile[]` union and added runtime handling (`Array.isArray` check) in `getLinkedYouth()`
- **Files modified:** src/components/admin/UserTable.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 8e1e174 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- User management UI is complete at /admin/users
- All server actions from Plan 01 are wired up and functional
- Plan 03 (Group Builder UI) can proceed -- group management page at /admin/groups is the remaining admin feature

## Self-Check: PASSED

All 3 files verified present. Task commit verified (8e1e174). Build succeeds with zero TypeScript errors.

---
*Phase: 02-admin-panel*
*Completed: 2026-02-19*
