---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/groups/page.tsx
  - src/components/admin/UserCard.tsx
autonomous: true
requirements: [QUICK-10]

must_haves:
  truths:
    - "Admin users appear in the unassigned pool on the groups page"
    - "Admin users can be dragged/tapped into groups like any parent"
    - "Admin users show a 'Forelder (Admin)' badge in the group builder"
    - "Parent-child separation still works for admins who have linked youth"
  artifacts:
    - path: "src/app/admin/groups/page.tsx"
      provides: "Fetches ALL users including admins for group assignment"
      contains: "from('profiles')"
    - path: "src/components/admin/UserCard.tsx"
      provides: "Displays admin role badge correctly"
      contains: "admin"
  key_links:
    - from: "src/app/admin/groups/page.tsx"
      to: "GroupBuilder component"
      via: "users prop includes admin-role users"
      pattern: "select.*id.*full_name.*role"
---

<objective>
Fix admin users being excluded from the group assignment pool in the admin panel.

Purpose: Admins are fundamentally parents and must be assignable to groups just like any other parent. Currently, the groups page query explicitly filters out admin-role users with `.neq('role', 'admin')`, making them invisible in the group builder.

Output: Admin users appear in the group builder's unassigned pool and can be assigned to groups. Their UserCard displays "Forelder (Admin)" to distinguish them while making their parent nature clear.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/admin/groups/page.tsx
@src/components/admin/UserCard.tsx
@src/components/admin/GroupBuilder.tsx
@src/lib/utils/parent-child.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Include admin users in group assignment pool and display correctly</name>
  <files>src/app/admin/groups/page.tsx, src/components/admin/UserCard.tsx</files>
  <action>
    1. In `src/app/admin/groups/page.tsx` (line 12): Remove the `.neq('role', 'admin')` filter from the profiles query. Replace with `.in('role', ['youth', 'parent', 'admin'])` to be explicit about which roles are included (defensive -- avoids accidentally including future roles).

    2. In `src/components/admin/UserCard.tsx`:
       - Update the `roleLabels` map (line 6-9) to add an entry for admin: `admin: 'Forelder (Admin)'`. This makes it clear admins are parents while showing their admin status.
       - The `badgeVariant` logic on line 45-46 already handles admin role (`userRole === 'admin' ? 'admin'`), so the Badge color will correctly use the admin variant. No change needed there.

    No changes needed to:
    - `parent-child.ts` -- conflict detection works on `parent_youth_links` data, not role field
    - `saveGroupMembers` server action -- separation check RPC also works on links, not role
    - `GroupBuilder.tsx` -- already handles any user data passed to it
    - `UnassignedPool.tsx` -- already renders any user in the pool
  </action>
  <verify>
    Run `npx next build` to confirm no TypeScript or build errors. Then manually verify:
    1. Navigate to /admin/groups
    2. Admin users should appear in the "Ikke tildelt" (unassigned) pool
    3. Admin users should show "Forelder (Admin)" badge
    4. Admin users can be assigned to groups (drag on desktop, tap on mobile)
    5. Parent-child conflict detection works if admin has linked youth
  </verify>
  <done>Admin users appear in the group builder unassigned pool, display "Forelder (Admin)" badge, and can be assigned to groups. Parent-child separation enforced for admins with linked youth.</done>
</task>

</tasks>

<verification>
- Build passes without errors
- Admin users visible in group assignment pool at /admin/groups
- Admin badge displays "Forelder (Admin)" in Norwegian
- Admins can be moved between groups and unassigned pool
- Parent-child separation still enforced for admin users with linked youth
</verification>

<success_criteria>
Admin users are assignable to groups in the admin panel, appearing alongside parents and youth in the group builder with a clear "Forelder (Admin)" badge.
</success_criteria>

<output>
After completion, create `.planning/quick/10-it-s-not-possible-to-assign-admins-that-/10-SUMMARY.md`
</output>
