---
phase: quick-25
plan: 01
subsystem: auth, database
tags: [supabase, rls, admin-access, profiles]

# Dependency graph
requires:
  - phase: 06-01
    provides: meetings migration and profiles table
provides:
  - is_admin boolean flag on profiles for decoupled admin access
  - toggleAdminAccess server action
  - Updated admin checks across all entry points
affects: [admin, dashboard, auth, export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Boolean flag (is_admin) for access control separate from role identity"
    - "toggleAdminAccess action with self-modification guard"

key-files:
  created:
    - supabase/migrations/025_is_admin_flag.sql
  modified:
    - src/lib/actions/admin.ts
    - src/lib/actions/meeting.ts
    - src/lib/actions/auth.ts
    - src/app/admin/layout.tsx
    - src/app/admin/users/page.tsx
    - src/app/dashboard/page.tsx
    - src/components/admin/UserTable.tsx
    - src/app/api/export/route.ts

key-decisions:
  - "is_admin boolean flag decouples admin access from role column, allowing youth/parent users to retain participant identity"
  - "Existing admin users migrated to role=youth + is_admin=true (all current admins are youth organizers)"
  - "Role change dialog restricted to youth/parent only; admin access toggled separately"
  - "isParentLike() simplified to check role===parent only (admins now retain actual role)"

patterns-established:
  - "Admin access via is_admin boolean, never role='admin'"
  - "Self-modification guard on toggleAdminAccess to prevent lockout"

requirements-completed: [QUICK-25]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Quick Task 25: Allow Youth Members to Also Be Admins Summary

**is_admin boolean flag on profiles decouples admin access from role, with migration for existing admins and separate toggle in user table**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T15:53:44Z
- **Completed:** 2026-02-26T15:58:29Z
- **Tasks:** 2 (+ 1 human-verify checkpoint)
- **Files modified:** 9

## Accomplishments
- Database migration adds is_admin column, migrates existing admins to role=youth + is_admin=true, and updates RLS function
- All admin checks (verifyAdmin, admin layout, login redirect, export route) now use is_admin flag
- UserTable has separate "Gi admin" / "Fjern admin" toggle button with teal/danger styling
- Dashboard shows admin badge for is_admin users and links to admin panel based on is_admin
- Role change dialog only offers youth/parent options (admin access managed separately)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration** - `d951bba` (feat)
2. **Task 2: Update all admin checks and queries** - `f0905bc` (feat)

## Files Created/Modified
- `supabase/migrations/025_is_admin_flag.sql` - Migration SQL: is_admin column, data migration, RLS function update, partial index
- `src/lib/actions/admin.ts` - verifyAdmin checks is_admin, updateUserRole restricted to youth/parent, new toggleAdminAccess action
- `src/lib/actions/meeting.ts` - verifyAdmin checks is_admin
- `src/lib/actions/auth.ts` - Login redirect uses is_admin for /admin routing
- `src/app/admin/layout.tsx` - Admin gate checks is_admin
- `src/app/admin/users/page.tsx` - Added is_admin to profile select query
- `src/app/dashboard/page.tsx` - Admin badge, panel link via is_admin, participant queries include admin role
- `src/components/admin/UserTable.tsx` - Admin badge display, toggle button, role dialog restricted to youth/parent
- `src/app/api/export/route.ts` - Export authorization checks is_admin

## Decisions Made
- is_admin boolean flag decouples admin access from role column
- Existing admins migrated to role=youth + is_admin=true since all current admins are youth organizers
- Role change dialog restricted to youth/parent; admin access toggled separately via dedicated button
- isParentLike() simplified to role===parent only (admins now retain actual participant role)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type mismatch for RoleOption**
- **Found during:** Task 2 (UserTable updates)
- **Issue:** After removing 'admin' from RoleOption type, user.role (which can still be 'admin') didn't match the narrowed type
- **Fix:** Changed editRoleUser.currentRole to string type, added casting in useEffect
- **Files modified:** src/components/admin/UserTable.tsx
- **Verification:** Build passes without TypeScript errors
- **Committed in:** f0905bc (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed pre-existing lint error (let -> const)**
- **Found during:** Task 2 verification build
- **Issue:** attendanceMap in users/page.tsx used let but is never reassigned, blocking build
- **Fix:** Changed let to const
- **Files modified:** src/app/admin/users/page.tsx
- **Verification:** Build passes without lint errors
- **Committed in:** f0905bc (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for build success. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations.

## User Setup Required
**Database migration must be applied manually.** Copy the contents of `supabase/migrations/025_is_admin_flag.sql` into the Supabase Dashboard SQL Editor and run it.

## Next Steps
- Apply migration SQL in Supabase Dashboard
- Verify existing admin users migrated correctly (role=youth, is_admin=true)
- Test admin panel access, dashboard display, and admin toggle functionality

---
*Quick Task: 25*
*Completed: 2026-02-26*
