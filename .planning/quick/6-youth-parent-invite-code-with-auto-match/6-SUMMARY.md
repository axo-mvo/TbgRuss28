---
phase: quick-6
plan: 01
subsystem: auth, database, ui
tags: [supabase, invite-codes, parent-youth-linking, sms, clipboard]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: profiles table, invite_codes table, register() action
provides:
  - parent_invite_code column on profiles with auto-assign trigger
  - VOKSEN### virtual code detection in validateInviteCode and register
  - ParentInviteBanner client component with SMS link and copy button
  - Dashboard conditional rendering for youth without parents
affects: [registration, dashboard, parent-youth-linking]

# Tech tracking
tech-stack:
  added: []
  patterns: [virtual-code-mapping, sms-deep-link, clipboard-api]

key-files:
  created:
    - supabase/migrations/011_parent_invite_codes.sql
    - src/components/dashboard/ParentInviteBanner.tsx
  modified:
    - supabase/migrations/ALL_MIGRATIONS.sql
    - src/lib/actions/auth.ts
    - src/app/dashboard/page.tsx

key-decisions:
  - "VOKSEN### is a virtual code - maps to FORELDER2028 for atomic invite code validation"
  - "validateInviteCode updated for VOKSEN### codes (Rule 2: frontend would reject code otherwise)"
  - "Amber/yellow color scheme for invite banner to distinguish from teal group cards"
  - "Sequential codes starting at 100 to avoid leading-zero issues"

patterns-established:
  - "Virtual code pattern: detect prefix, look up entity, swap to real code for validation"
  - "SMS deep link: sms:?body= URI scheme for mobile messaging"

requirements-completed: [QUICK-6-01, QUICK-6-02, QUICK-6-03, QUICK-6-04, QUICK-6-05]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Quick Task 6: Youth Parent Invite Code with Auto-Match Summary

**VOKSEN### virtual invite codes for youth with auto-match parent registration, SMS sharing, and clipboard copy**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T20:32:37Z
- **Completed:** 2026-02-19T20:35:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Each youth gets a unique VOKSEN### code (auto-assigned via DB trigger)
- Youth without linked parents see a prominent invite banner with SMS link and copy button
- Parents registering with VOKSEN### are auto-linked to the correct youth via parent_youth_links
- Existing registration flow for UNGDOM2028/FORELDER2028 codes remains unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration - add parent_invite_code to profiles** - `7ea889a` (chore)
2. **Task 2: Auto-match parent registration and dashboard invite banner** - `5649a24` (feat)

## Files Created/Modified
- `supabase/migrations/011_parent_invite_codes.sql` - Migration adding parent_invite_code column, backfill, trigger, and index
- `supabase/migrations/ALL_MIGRATIONS.sql` - Updated combined migrations file (001-011)
- `src/lib/actions/auth.ts` - Updated validateInviteCode and register to handle VOKSEN### virtual codes
- `src/components/dashboard/ParentInviteBanner.tsx` - Client component with SMS link and clipboard copy
- `src/app/dashboard/page.tsx` - Conditional banner rendering for youth without parents

## Decisions Made
- **VOKSEN### maps to FORELDER2028:** The virtual code is detected in both `validateInviteCode` (for Step 1 frontend validation) and `register()` (for Step 1 RPC atomic validation). The real FORELDER2028 code is used for the atomic use-counting, so no new invite_codes row is needed.
- **validateInviteCode also updated (Rule 2):** Plan only mentioned updating `register()`, but the frontend calls `validateInviteCode` in Step 1 of registration. Without this change, VOKSEN### codes would be rejected before reaching `register()`. This was a missing critical functionality fix.
- **Amber/yellow banner color scheme:** Chosen to visually distinguish from the teal group card already on the dashboard, drawing attention without overwhelming.
- **Sequential codes from 100:** Avoids leading-zero confusion and supports growth past 999 naturally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated validateInviteCode for VOKSEN### detection**
- **Found during:** Task 2 (auth.ts update)
- **Issue:** Plan only specified updating `register()`, but the frontend calls `validateInviteCode()` first in Step 1. VOKSEN### codes would be rejected as "Ugyldig invitasjonskode" before reaching Step 2/register.
- **Fix:** Added VOKSEN### prefix detection in `validateInviteCode()` that looks up the youth by `parent_invite_code` and returns `{ valid: true, role: 'parent' }`.
- **Files modified:** src/lib/actions/auth.ts
- **Verification:** Build passes, code path handles both VOKSEN### and standard codes
- **Committed in:** 5649a24 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix - without it, the entire VOKSEN### flow would be broken at the frontend validation step. No scope creep.

## Issues Encountered
- Supabase CLI not linked to remote project (`supabase link` not configured), so `db push --dry-run` could not run. Migration SQL is syntactically correct and must be applied manually via Supabase Dashboard SQL Editor.

## User Setup Required

**Database migration must be applied manually:**
1. Go to Supabase Dashboard > SQL Editor
2. Paste the contents of `supabase/migrations/011_parent_invite_codes.sql`
3. Run the query
4. Verify: Check that youth profiles now have `parent_invite_code` values (VOKSEN100, VOKSEN101, etc.)

## Next Phase Readiness
- Feature complete and build-passing
- Migration needs manual application to production Supabase

## Self-Check: PASSED

All 5 files verified present. Both task commits (7ea889a, 5649a24) found in git log.

---
*Quick Task: 6*
*Completed: 2026-02-19*
