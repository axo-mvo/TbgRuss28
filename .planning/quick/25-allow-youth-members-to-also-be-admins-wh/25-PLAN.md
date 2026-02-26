---
phase: quick-25
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/025_is_admin_flag.sql
  - src/lib/actions/admin.ts
  - src/lib/actions/meeting.ts
  - src/lib/actions/auth.ts
  - src/app/admin/layout.tsx
  - src/app/admin/users/page.tsx
  - src/app/dashboard/page.tsx
  - src/components/admin/UserTable.tsx
  - src/app/dashboard/station/[sessionId]/page.tsx
  - src/app/api/export/route.ts
autonomous: true
requirements: [QUICK-25]
must_haves:
  truths:
    - "A youth user with is_admin=true can access the admin panel"
    - "A youth user with is_admin=true appears in the contact directory as youth"
    - "A youth user with is_admin=true can be assigned to groups as a regular participant"
    - "A youth user with is_admin=true sees their group and stations on the dashboard"
    - "Existing admin users (role='admin') continue to work unchanged"
    - "The admin user table allows toggling is_admin on any user"
  artifacts:
    - path: "supabase/migrations/025_is_admin_flag.sql"
      provides: "is_admin boolean column, updated RLS function, migration for existing admins"
  key_links:
    - from: "src/app/admin/layout.tsx"
      to: "profiles.is_admin"
      via: "query checking is_admin OR role='admin'"
    - from: "src/lib/actions/admin.ts verifyAdmin()"
      to: "profiles.is_admin"
      via: "query checking is_admin OR role='admin'"
---

<objective>
Allow youth (and parent) members to also be admins by adding an `is_admin` boolean flag to profiles, so the `role` column keeps its participant identity meaning (youth/parent) while admin access is controlled separately.

Purpose: Currently a user can only be one of youth/parent/admin. This means admins cannot participate as regular members in groups, attendance, and the contact directory. The user wants youth members who organize things to also have admin access while still being regular group participants.

Output: Migration SQL, updated admin checks, updated queries so is_admin users appear as participants.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<interfaces>
<!-- Key patterns the executor needs -->

From src/lib/actions/admin.ts (verifyAdmin helper, duplicated in meeting.ts):
```typescript
async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  // Checks profile.role === 'admin'
}
```

From src/app/admin/layout.tsx:
```typescript
// Checks profile.role !== 'admin' to redirect
```

From supabase/migrations/002_rls.sql:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Dashboard queries that filter by role:
```typescript
// src/app/dashboard/page.tsx:47 — contact directory youth list
adminClient.from('profiles').select('id, full_name, phone, email').eq('role', 'youth')
// src/app/dashboard/page.tsx:49 — everyone list
adminClient.from('profiles').select('...').in('role', ['youth', 'parent'])
// src/app/dashboard/page.tsx:106 — total members count
.in('role', ['youth', 'parent'])
```

Admin users page query:
```typescript
// src/app/admin/users/page.tsx:26 — youth dropdown for parent linking
.eq('role', 'youth')
```

Admin meeting detail page:
```typescript
// src/app/admin/meetings/[id]/page.tsx:43 — users for group builder
.in('role', ['youth', 'parent', 'admin'])
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Database migration — add is_admin flag and update RLS function</name>
  <files>supabase/migrations/025_is_admin_flag.sql</files>
  <action>
Create migration SQL file that:

1. Adds `is_admin BOOLEAN NOT NULL DEFAULT false` column to `profiles` table.

2. Migrates existing admin users: For any profile where `role = 'admin'`, set `is_admin = true` and change `role` to `'youth'` (since all current admins in this app are youth organizers). This is the correct default since the app's admins ARE youth members who also organize.

3. Updates the `public.is_admin()` RLS function to check `is_admin = true` instead of `role = 'admin'`:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

4. Keeps `'admin'` as a valid role value in the CHECK constraint for backward compatibility, but it will no longer be used for new users. The constraint stays: `CHECK (role IN ('admin', 'youth', 'parent'))`.

5. Add an index: `CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;`

IMPORTANT: This migration must be applied via Supabase Dashboard SQL Editor (copy-paste). Create the file for documentation and versioning.
  </action>
  <verify>File exists at supabase/migrations/025_is_admin_flag.sql with ALTER TABLE, CREATE OR REPLACE FUNCTION, and UPDATE statements</verify>
  <done>Migration SQL ready for dashboard application</done>
</task>

<task type="auto">
  <name>Task 2: Update all app-level admin checks and participant queries</name>
  <files>
    src/lib/actions/admin.ts
    src/lib/actions/meeting.ts
    src/lib/actions/auth.ts
    src/app/admin/layout.tsx
    src/app/admin/users/page.tsx
    src/app/dashboard/page.tsx
    src/components/admin/UserTable.tsx
    src/app/dashboard/station/[sessionId]/page.tsx
    src/app/api/export/route.ts
  </files>
  <action>
Update every file that checks admin status or filters by role:

**A. Admin verification (3 files):**

1. `src/lib/actions/admin.ts` — Update `verifyAdmin()` to check `is_admin === true` instead of `role === 'admin'`:
```typescript
const { data: callerProfile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()
if (!callerProfile?.is_admin) return { error: 'Ikke autorisert' }
```

2. `src/lib/actions/meeting.ts` — Same change to its duplicated `verifyAdmin()` helper. Update select to `'is_admin'` and check `callerProfile?.is_admin !== true`.

3. `src/app/api/export/route.ts` — Update admin check from `profile?.role !== 'admin'` to `!profile?.is_admin`. Update the select to include `is_admin`.

**B. Admin layout gate (1 file):**

4. `src/app/admin/layout.tsx` — Change query to select `is_admin` instead of `role`, check `!profile?.is_admin` instead of `profile.role !== 'admin'`:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()
if (!profile || !profile.is_admin) {
  redirect('/dashboard')
}
```

**C. Login redirect (1 file):**

5. `src/lib/actions/auth.ts` — In the `login()` function, change the redirect logic. Instead of checking `profile?.role === 'admin'`, query `is_admin` and redirect to `/admin` if `is_admin === true`:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_admin')
  .eq('id', user.id)
  .single()
redirectPath = profile?.is_admin ? '/admin' : '/dashboard'
```

**D. Dashboard participant queries (1 file):**

6. `src/app/dashboard/page.tsx`:
   - Line 43: Add `is_admin` to the profile select: `.select('full_name, role, parent_invite_code, is_admin')`
   - Line 47 (allYouthResult): Change `.eq('role', 'youth')` to `.in('role', ['youth', 'parent'])` — NO, keep it as `.eq('role', 'youth')` since this is specifically the youth list for the YouthDirectoryView. Youth admins have `role='youth'` so they already appear here.
   - Line 49 (allMembersResult): The `.in('role', ['youth', 'parent'])` filter is correct since admin-youth users now have `role='youth'`. But to be safe and include any legacy `role='admin'` users, change to `.in('role', ['youth', 'parent', 'admin'])`.
   - Line 106 (totalMembers count): Same change — `.in('role', ['youth', 'parent', 'admin'])` so admin-participants count toward attendance totals.
   - Line 133: The `showParentInvite` check `profile?.role === 'youth'` is correct — admin-youth users have `role='youth'`.
   - Line 159: Change admin panel link condition from `role === 'admin'` to check `is_admin`:
     ```typescript
     const isAdmin = profile?.is_admin === true
     ```
     Then use `{isAdmin && (` instead of `{role === 'admin' && (`.
   - Line 139 badgeVariant: Keep as-is since role is now always 'youth' or 'parent'.
   - Line 155: Update the "Du er logget inn som" text — for admin-youth users, append " (admin)" or show both badges. Show the role badge AND an additional admin badge if is_admin:
     After the existing Badge, conditionally render: `{isAdmin && <Badge variant="admin">Admin</Badge>}`

**E. Station page (1 file):**

7. `src/app/dashboard/station/[sessionId]/page.tsx` — Line 88: The `userRole` determination maps `parent` and everything else to `youth`. This is fine since admin-youth users have `role='youth'`. No change needed here, but verify.

**F. Admin user table (2 files):**

8. `src/app/admin/users/page.tsx`:
   - Add `is_admin` to the profiles select query (line 13-19): add `is_admin` to the select string.
   - Pass `is_admin` through to `usersWithAttendance` (it flows automatically since spread is used).

9. `src/components/admin/UserTable.tsx`:
   - Add `is_admin: boolean` to the `UserWithLinks` type.
   - Update `isParentLike()` function: Since admin users now have `role='youth'` or `role='parent'`, the function should check the actual role. A user is "parent-like" (can link to youth) if `role === 'parent'`. Remove the `|| role === 'admin'` from `isParentLike`. Actually, an admin who is a parent should still link — so keep `isParentLike` checking role only: `return role === 'parent'`. The comment about "admin users are also parents" no longer applies since admins now retain their actual role.
   - In the role change dialog options, keep youth/parent/admin as role options. BUT also add a separate "Admin-tilgang" toggle. Add a new action to toggle `is_admin`:
     - Add a toggle/checkbox in each user card/row to grant/revoke admin access, separate from the role dropdown.
     - Create inline handler that calls a new `toggleAdminAccess` server action.
   - Show an admin badge next to the role badge for users where `is_admin === true`.

10. `src/lib/actions/admin.ts` — Add a new `toggleAdminAccess` server action:
```typescript
export async function toggleAdminAccess(
  userId: string,
  isAdmin: boolean
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  if (userId === auth.userId) {
    return { error: 'Du kan ikke endre din egen admintilgang' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)

  if (error) return { error: 'Kunne ikke oppdatere admintilgang' }

  revalidatePath('/admin/users')
  return {}
}
```

11. `src/components/admin/UserTable.tsx` — Import `toggleAdminAccess` and add a toggle button/switch for each user. In the mobile card layout and desktop table:
    - After the role badge, show a small admin shield icon or "Admin" badge if `is_admin`.
    - Add an "Admin" toggle button in the action buttons area. Use a simple button that calls `toggleAdminAccess(user.id, !user.is_admin)`.
    - The button text: "Gi admin" if not admin, "Fjern admin" if admin.
    - Style: Use teal color for granting, coral/danger for removing.

**G. Admin meeting detail page:**
The query at `src/app/admin/meetings/[id]/page.tsx:43` already uses `.in('role', ['youth', 'parent', 'admin'])`. Since existing admins are migrated to `role='youth'`, this is fine — all users appear. No change needed.

**H. updateUserRole action:**
In `src/lib/actions/admin.ts`, the `updateUserRole` function still accepts `'admin'` as a valid role. Since we now use `is_admin` for admin access, remove `'admin'` from the allowed roles — the function should only accept `'youth' | 'parent'`:
```typescript
export async function updateUserRole(
  userId: string,
  newRole: 'youth' | 'parent'
): Promise<{ error?: string }>
```
Update the UserTable role change dialog to only show 'youth' and 'parent' options (remove 'admin' radio button). Admin access is now toggled separately via the new toggle button.
  </action>
  <verify>
    Run `npx next build 2>&1 | tail -30` to verify no TypeScript errors. Check that:
    1. No references to `role === 'admin'` remain in auth/admin checks (only in backward-compat areas)
    2. The `toggleAdminAccess` action exists in admin.ts
    3. UserTable imports and uses `toggleAdminAccess`
  </verify>
  <done>
    - Admin access is controlled by `is_admin` boolean, not `role` column
    - Youth/parent users with `is_admin=true` can access admin panel
    - Youth/parent users with `is_admin=true` appear in contact directory and groups as regular participants
    - Admin user table has a separate toggle for admin access
    - Role change dialog only shows youth/parent options
    - Login redirects admin users to /admin based on is_admin flag
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Added is_admin boolean flag to profiles. Youth/parent members can now also be admins while remaining regular participants in groups, attendance, and directory.
  </what-built>
  <how-to-verify>
    1. Apply the migration SQL from `supabase/migrations/025_is_admin_flag.sql` in Supabase Dashboard SQL Editor
    2. Verify existing admin user(s) now have `role='youth'` and `is_admin=true` in the profiles table
    3. Log in as the migrated admin — should redirect to /admin
    4. Visit /dashboard — should see yourself as youth with admin badge, contact directory should list you
    5. Visit /admin/users — should see "Admin" badge on admin users, and a toggle button to grant/revoke admin
    6. Try toggling admin access on another user — they should gain/lose admin panel access
    7. Change a user's role between youth/parent — admin option should NOT appear in role dialog
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx next build` completes without errors
- No remaining `role === 'admin'` checks in admin gate, verifyAdmin, or login redirect
- Migration SQL creates is_admin column and updates RLS function
- UserTable has admin toggle separate from role change
</verification>

<success_criteria>
- Youth members with is_admin=true can access admin panel AND appear as regular participants
- Admin access is a separate boolean flag, not a role value
- Existing admin users are migrated to role=youth + is_admin=true
- All RLS policies continue to work via updated is_admin() function
</success_criteria>

<output>
After completion, create `.planning/quick/25-allow-youth-members-to-also-be-admins-wh/25-SUMMARY.md`
</output>
