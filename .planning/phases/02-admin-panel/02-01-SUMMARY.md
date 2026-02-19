---
phase: 02-admin-panel
plan: 01
subsystem: admin
tags: [rls, postgres-functions, server-actions, supabase, native-dialog, bottom-sheet, ui-primitives, norwegian]

# Dependency graph
requires:
  - phase: 01-foundation-and-authentication
    provides: "Supabase three-client pattern (server, admin, browser), database schema with profiles/parent_youth_links/groups/group_members tables, is_admin() helper function, RLS policies, UI primitives (Button, Badge)"
provides:
  - "Admin RLS policies for UPDATE/DELETE on profiles and full CRUD on parent_youth_links"
  - "check_parent_child_separation() Postgres function for group assignment validation"
  - "7 admin server actions: updateUserRole, deleteUser, updateParentYouthLink, createGroup, deleteGroup, saveGroupMembers, toggleGroupsLock"
  - "RUSS_GROUP_NAMES constant with 12 predefined Norwegian group names"
  - "Dialog component (native <dialog> with confirm/cancel and loading state)"
  - "BottomSheet component (native <dialog> with slide-up animation)"
  - "SearchInput component with clear button"
  - "EmptyState presentational component"
  - "Admin hub page with navigation to /admin/users and /admin/groups"
affects: [02-admin-panel, 03-station-and-chat, 04-meeting-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [admin-server-action-pattern, native-dialog-modal, bottom-sheet-css-animation, admin-verification-helper]

key-files:
  created:
    - supabase/migrations/005_admin_policies.sql
    - supabase/migrations/006_group_constraints.sql
    - src/lib/actions/admin.ts
    - src/lib/constants/group-names.ts
    - src/components/ui/Dialog.tsx
    - src/components/ui/BottomSheet.tsx
    - src/components/ui/SearchInput.tsx
    - src/components/ui/EmptyState.tsx
  modified:
    - src/app/admin/page.tsx

key-decisions:
  - "Extracted verifyAdmin() helper to DRY admin auth checks across all 7 server actions"
  - "toggleGroupsLock uses .neq() filter to match all rows (Supabase requires a WHERE clause)"
  - "saveGroupMembers clears all members per group before re-inserting, with per-member parent-child separation check"

patterns-established:
  - "Admin server action pattern: verifyAdmin() -> admin client mutation -> revalidatePath()"
  - "Native <dialog> for modals: useRef + useEffect to call showModal()/close() based on open prop"
  - "BottomSheet positioned via CSS: fixed inset-0, self-end, marginTop auto, rounded-t-2xl, slide-up transition"
  - "Admin hub navigation: styled Link cards with icons, descriptions, and hover effects"

requirements-completed: [ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 02 Plan 01: Admin Backend Foundation Summary

**Admin RLS policies, parent-child group separation function, 7 CRUD server actions, reusable Dialog/BottomSheet/SearchInput/EmptyState components, and admin hub navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T13:30:58Z
- **Completed:** 2026-02-19T13:34:24Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- 7 admin server actions compile and follow defense-in-depth auth verification pattern with Norwegian error messages
- Database migrations add admin CRUD RLS policies and check_parent_child_separation() Postgres function that prevents parent-child group co-assignment
- 4 reusable UI components (Dialog, BottomSheet, SearchInput, EmptyState) ready for Plan 02 and Plan 03
- Admin hub page provides navigation cards to user management and group builder sub-pages
- Zero TypeScript errors, full build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migrations, Server Actions, and group name constants** - `96e4bf0` (feat)
2. **Task 2: Reusable UI components and admin hub page** - `1a1df64` (feat)

## Files Created/Modified
- `supabase/migrations/005_admin_policies.sql` - Admin UPDATE/DELETE RLS policies for profiles and full CRUD for parent_youth_links
- `supabase/migrations/006_group_constraints.sql` - check_parent_child_separation() Postgres function returning JSON {allowed, reason}
- `src/lib/actions/admin.ts` - 7 server actions: updateUserRole, deleteUser, updateParentYouthLink, createGroup, deleteGroup, saveGroupMembers, toggleGroupsLock
- `src/lib/constants/group-names.ts` - RUSS_GROUP_NAMES array with 12 predefined Norwegian russ group names
- `src/components/ui/Dialog.tsx` - Confirmation dialog using native <dialog> with confirm/cancel buttons and loading state
- `src/components/ui/BottomSheet.tsx` - Bottom sheet using native <dialog> with slide-up CSS animation and scroll containment
- `src/components/ui/SearchInput.tsx` - Search input with magnifying glass SVG icon and clear button, 44px touch targets
- `src/components/ui/EmptyState.tsx` - Centered empty state placeholder with title, description, and optional icon
- `src/app/admin/page.tsx` - Updated admin hub with navigation cards to /admin/users and /admin/groups

## Decisions Made
- Extracted verifyAdmin() as a shared helper function to DRY the admin auth verification across all 7 server actions (each action still independently verifies auth)
- toggleGroupsLock uses `.neq('id', '00000000-...')` to match all rows because Supabase update requires a WHERE clause
- saveGroupMembers implements a clear-then-reinsert strategy with per-member parent-child separation check via RPC before each insert

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

The two new SQL migration files (005, 006) need to be run in the Supabase SQL Editor after the existing migrations (001-004). No new environment variables or external service configuration required.

## Next Phase Readiness
- All 7 admin server actions are available for Plan 02 (User Management UI) and Plan 03 (Group Builder UI)
- Dialog and BottomSheet components are ready for confirmation flows and parent-link editing
- SearchInput is ready for user list filtering
- EmptyState is ready for empty group/user list states
- Admin hub navigation is in place -- sub-pages at /admin/users and /admin/groups need to be created in Plans 02 and 03

## Self-Check: PASSED

All 9 files verified present. Both task commits verified (96e4bf0, 1a1df64). Build succeeds.

---
*Phase: 02-admin-panel*
*Completed: 2026-02-19*
