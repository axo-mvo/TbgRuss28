---
phase: quick-15
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/admin/UserTable.tsx
autonomous: true
requirements: [QUICK-15]

must_haves:
  truths:
    - "Admin user cards show linked youth badges in the user admin panel"
    - "Tapping/clicking an admin user card opens the ParentLinkSheet to assign youth"
    - "Unlinked admin users show the 'Ikke koblet til barn' warning"
  artifacts:
    - path: "src/components/admin/UserTable.tsx"
      provides: "Admin-as-parent youth linking in user management"
      contains: "role === 'admin'"
  key_links:
    - from: "src/components/admin/UserTable.tsx"
      to: "ParentLinkSheet"
      via: "openParentLink triggered for admin users"
      pattern: "role.*===.*admin"
---

<objective>
Fix: Admin users cannot be assigned youth in the user admin panel.

Purpose: Admin users are also parents (per decision [quick-9]). The UserTable component currently only enables parent-youth linking for users with `role === 'parent'`, excluding admin users from this functionality. Youth linking, linked youth display, and unlinked warnings all skip admins.

Output: Updated UserTable.tsx where admin users get the same parent-youth linking capabilities as parent users.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/admin/UserTable.tsx
@src/components/admin/ParentLinkSheet.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Treat admin users as parents for youth linking in UserTable</name>
  <files>src/components/admin/UserTable.tsx</files>
  <action>
The bug is that multiple places in UserTable.tsx check `user.role === 'parent'` to enable parent-youth linking features, but admin users are also parents (per decision [quick-9]). Fix all 5 locations:

1. **`getLinkedYouth` function (line ~89):** Change `if (user.role !== 'parent' ...)` to `if ((user.role !== 'parent' && user.role !== 'admin') || !user.parent_youth_links)` so admin users' linked youth are returned.

2. **`isUnlinkedParent` function (line ~96-98):** Change `user.role === 'parent'` to `(user.role === 'parent' || user.role === 'admin')` so unlinked admins show the warning badge.

3. **`openParentLink` function (line ~173):** Change `if (user.role !== 'parent') return` to `if (user.role !== 'parent' && user.role !== 'admin') return` so tapping admin cards opens the ParentLinkSheet.

4. **Mobile card section (line ~227-235):** The `isParent` variable is `user.role === 'parent'`. Change to `user.role === 'parent' || user.role === 'admin'` so admin cards are clickable and get the cursor/active styles.

5. **Desktop table row (line ~327-337):** Same `isParent` variable is used. Since it's the same variable defined per-user in the map, updating the definition handles both mobile and desktop. BUT note there are TWO separate map callbacks (mobile at ~224, desktop at ~324). Each defines its own `isParent`. Update BOTH:
   - Mobile (line ~227): `const isParent = user.role === 'parent' || user.role === 'admin'`
   - Desktop (line ~327): `const isParent = user.role === 'parent' || user.role === 'admin'`

Consider extracting a helper like `const isParentLike = (role: string) => role === 'parent' || role === 'admin'` at the top of the component to DRY this up, then use it in all 5 locations.
  </action>
  <verify>
Run `npx next build` to verify no TypeScript or build errors. Visually confirm in the code that all 5 locations now include admin role checks.
  </verify>
  <done>
Admin users in the user admin panel: (1) show linked youth badges, (2) show "Ikke koblet til barn" warning when unlinked, (3) are clickable to open ParentLinkSheet for youth assignment, (4) have the same cursor/hover styles as parent users in both mobile and desktop views.
  </done>
</task>

</tasks>

<verification>
- Build passes with no errors
- All instances of parent-only checks in UserTable.tsx now include admin role
- No other files need changes (server action `updateParentYouthLink` already accepts any parentId, and the admin users page fetches all profiles with parent_youth_links)
</verification>

<success_criteria>
Admin users can have youth assigned to them via the ParentLinkSheet in the user admin panel, identical to how parent users work.
</success_criteria>

<output>
After completion, create `.planning/quick/15-it-s-not-possible-to-assign-youth-to-the/15-SUMMARY.md`
</output>
