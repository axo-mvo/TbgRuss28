---
phase: quick-26
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/026_avatar_url.sql
  - src/components/ui/Avatar.tsx
  - src/lib/actions/admin.ts
  - src/lib/actions/profile.ts
  - src/components/admin/UserTable.tsx
  - src/app/admin/users/page.tsx
  - src/app/dashboard/profil/page.tsx
  - src/components/profile/ProfileForm.tsx
  - src/app/dashboard/page.tsx
autonomous: true
requirements: [QUICK-26]
must_haves:
  truths:
    - "Admin can edit a user's name, email, and phone from the user list"
    - "User can view and edit their own profile at /dashboard/profil"
    - "User can upload a profile picture that displays as avatar"
    - "Avatar shows image if available, otherwise initials with role-colored background"
    - "Dashboard header shows small avatar linking to profile page"
    - "Admin user list no longer shows AttendanceDot or registration date"
  artifacts:
    - path: "supabase/migrations/026_avatar_url.sql"
      provides: "avatar_url column + storage bucket + RLS policies"
    - path: "src/components/ui/Avatar.tsx"
      provides: "Reusable avatar component"
      exports: ["default"]
    - path: "src/lib/actions/profile.ts"
      provides: "updateOwnProfile server action"
      exports: ["updateOwnProfile"]
    - path: "src/lib/actions/admin.ts"
      provides: "updateUserInfo server action added"
      exports: ["updateUserInfo"]
    - path: "src/app/dashboard/profil/page.tsx"
      provides: "Profile page route"
    - path: "src/components/profile/ProfileForm.tsx"
      provides: "Client form with picture upload"
  key_links:
    - from: "src/components/profile/ProfileForm.tsx"
      to: "src/lib/actions/profile.ts"
      via: "updateOwnProfile server action"
      pattern: "updateOwnProfile"
    - from: "src/components/admin/UserTable.tsx"
      to: "src/lib/actions/admin.ts"
      via: "updateUserInfo server action"
      pattern: "updateUserInfo"
    - from: "src/app/dashboard/page.tsx"
      to: "/dashboard/profil"
      via: "Link with Avatar"
      pattern: "href.*profil"
---

<objective>
Add profile management features: user self-service profile page with picture upload, admin user info editing, and a reusable Avatar component. Clean up admin user list by removing attendance indicators and registration dates.

Purpose: Let users manage their own profile and let admins edit user info without navigating away from the user list.
Output: Profile page at /dashboard/profil, admin edit dialog, Avatar component, avatar_url DB column + storage bucket.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/actions/admin.ts
@src/lib/actions/auth.ts
@src/lib/supabase/server.ts
@src/lib/supabase/admin.ts
@src/components/admin/UserTable.tsx
@src/app/admin/users/page.tsx
@src/app/dashboard/page.tsx
@src/app/dashboard/layout.tsx
@src/components/ui/Button.tsx
@src/components/ui/Input.tsx
@src/components/ui/Dialog.tsx
@src/app/globals.css

<interfaces>
<!-- Existing patterns the executor needs -->

From src/lib/supabase/server.ts:
```typescript
export async function createClient(): Promise<SupabaseClient>
```

From src/lib/supabase/admin.ts:
```typescript
export function createAdminClient(): SupabaseClient
```

From src/lib/actions/admin.ts (verifyAdmin pattern):
```typescript
async function verifyAdmin(): Promise<{ userId: string } | { error: string }>
// All admin actions: call verifyAdmin(), use createAdminClient(), revalidatePath
```

From src/components/ui/Button.tsx:
```typescript
type ButtonVariant = "primary" | "secondary" | "danger"
// Usage: <Button variant="primary" onClick={...}>Label</Button>
```

From src/components/ui/Input.tsx:
```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string;
}
// Usage: <Input label="Navn" value={...} onChange={...} />
```

From src/components/ui/Dialog.tsx:
```typescript
interface DialogProps {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string;
  confirmLabel?: string; confirmVariant?: 'primary' | 'danger'; loading?: boolean;
}
```

Design tokens (globals.css @theme):
- teal-primary: #1B4D5C, teal-secondary: #2A7F8E
- coral: #E8734A, coral-light: #F09A7D
- text-primary: #1E2D3D, text-muted: #3A4F5E

Profiles table columns: id, full_name, email, role, created_at, parent_invite_code, phone, attending, is_admin
(avatar_url will be added by migration)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Infrastructure - migration, Avatar component, and server actions</name>
  <files>
    supabase/migrations/026_avatar_url.sql
    src/components/ui/Avatar.tsx
    src/lib/actions/admin.ts
    src/lib/actions/profile.ts
  </files>
  <action>
**1. DB Migration (`supabase/migrations/026_avatar_url.sql`):**

Add `avatar_url TEXT` column to profiles table:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

Create Supabase Storage bucket `avatars` and RLS policies. Use the pattern of creating the bucket via SQL insert into `storage.buckets`, then add policies on `storage.objects`:

```sql
-- Create avatars bucket (public read, authenticated upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatar (path must be uid/filename)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can read avatars (public bucket)
CREATE POLICY "Public avatar read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**2. Reusable Avatar component (`src/components/ui/Avatar.tsx`):**

Create a client component (no 'use client' needed -- it's pure render, but add it for safety since it could be used in client components).

Props: `name: string`, `avatarUrl?: string | null`, `size?: 'sm' | 'md' | 'lg'`, `role?: 'youth' | 'parent' | 'admin'`

Size mapping: sm = `h-8 w-8 text-xs`, md = `h-10 w-10 text-sm`, lg = `h-20 w-20 text-2xl`

Behavior:
- If `avatarUrl` is truthy, render an `<img>` tag with `rounded-full object-cover` and the size classes. Use `alt={name}`.
- If no avatarUrl, render a `<div>` with rounded-full, centered initials (first letter of first + last name, uppercased), and role-colored background: youth = `bg-teal-secondary`, parent = `bg-coral-light`, admin/default = `bg-teal-primary`. Text always white.
- Export as default.

**3. Admin updateUserInfo action (`src/lib/actions/admin.ts`):**

Add a new exported server action `updateUserInfo` at the bottom of the file. Follow the exact same pattern as `updateUserRole`:

```typescript
export async function updateUserInfo(
  userId: string,
  data: { full_name: string; email: string; phone: string }
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
    })
    .eq('id', userId)

  if (error) return { error: 'Kunne ikke oppdatere brukerinfo' }

  revalidatePath('/admin/users')
  return {}
}
```

**4. Profile server actions (`src/lib/actions/profile.ts`):**

Create a new 'use server' file. Pattern follows auth.ts for self-service actions (no verifyAdmin, just auth check):

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOwnProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const avatarUrl = formData.get('avatarUrl') as string | null

  if (!fullName || !email || !phone) {
    return { error: 'Alle felt ma fylles ut' }
  }

  if (!/^\d{8}$/.test(phone)) {
    return { error: 'Telefonnummer ma vaere 8 siffer' }
  }

  const updateData: Record<string, string> = { full_name: fullName, email, phone }
  if (avatarUrl !== null && avatarUrl !== '') {
    updateData.avatar_url = avatarUrl
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) return { error: 'Kunne ikke oppdatere profil' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profil')
  return {}
}
```

Use Norwegian characters in error messages (use unicode escapes or literal chars matching existing patterns in auth.ts -- check the file and match style).
  </action>
  <verify>
    TypeScript compiles: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit --pretty 2>&1 | head -30`
    Migration SQL is syntactically valid (no TS check needed, just verify file exists and is non-empty).
    Avatar component renders initials logic correctly (check exports).
  </verify>
  <done>
    - 026_avatar_url.sql exists with ALTER TABLE + storage bucket + RLS policies
    - Avatar.tsx exported as default with sm/md/lg sizes, image or initials fallback, role-colored backgrounds
    - updateUserInfo added to admin.ts with verifyAdmin pattern
    - profile.ts exists with updateOwnProfile action accepting FormData
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Admin UserTable cleanup and edit info dialog</name>
  <files>
    src/components/admin/UserTable.tsx
    src/app/admin/users/page.tsx
  </files>
  <action>
**Modify `src/components/admin/UserTable.tsx`:**

1. **Remove AttendanceDot entirely:** Delete the `AttendanceDot` component function (lines ~70-94). Remove the `attending` field from `UserWithLinks` type. Remove the `<AttendanceDot attending={user.attending} />` usage inside the meta row in `UserRow`.

2. **Remove registration date display:** In the `UserRow` function, remove the `<span className="text-xs text-text-muted">Reg. {formatDate(user.created_at)}</span>` line and the `formatDate` helper function. Also remove `created_at` from the `UserWithLinks` type.

3. **Remove the now-empty meta row div** (the one that contained AttendanceDot and registration date). If it only had those two items, delete the entire `<div className="mt-1.5 flex items-center gap-3 flex-wrap">` wrapper.

4. **Add "Rediger info" action to ActionMenu:** Import `updateUserInfo` from `@/lib/actions/admin`. Add a new menu button "Rediger info" with a pencil/edit icon (SVG) at the TOP of the menu (before "Endre rolle"). The button calls a new handler `onEditInfo` that opens an edit dialog.

5. **Add edit info dialog state:** Add state variables:
   - `editInfoUser: { id: string; name: string; email: string; phone: string } | null`
   - `editName`, `editEmail`, `editPhone` string states for the form fields

6. **Add edit info dialog:** Use a native `<dialog>` element (matching the role dialog pattern already in the file). The dialog contains:
   - Title: "Rediger info for {name}"
   - Three Input components: Navn (full_name), E-post (email), Telefon (phone) -- prefilled with current values
   - Error display
   - Avbryt + Lagre buttons (using Button component)
   - On save: call `updateUserInfo(editInfoUser.id, { full_name: editName, email: editEmail, phone: editPhone })`. On success close dialog, on error show error.

7. **Replace inline avatar with Avatar component:** Import Avatar from `@/components/ui/Avatar`. Replace the existing inline avatar div in `UserRow` (the `<div className="shrink-0 ml-1.5 h-10 w-10 rounded-full...">` with initials) with `<Avatar name={user.full_name} avatarUrl={user.avatar_url} size="md" role={user.role} />`. Add `avatar_url: string | null` to the `UserWithLinks` type.

8. **Update ActionMenu props:** Add `onEditInfo: (e: React.MouseEvent) => void` to ActionMenu props and pass it from UserRow.

**Modify `src/app/admin/users/page.tsx`:**

9. **Add avatar_url to the query select:** In the Supabase query, add `avatar_url` to the select string so it becomes: `id, full_name, email, phone, role, is_admin, avatar_url, created_at, ...`

10. **Remove attendance scoping logic:** Remove the `currentMeeting` fetch, the `attendanceMap` construction, and the `usersWithAttendance` mapping. Pass `users ?? []` directly to `<UserTable>` instead of `usersWithAttendance`. Remove the `createAdminClient` import and `admin` variable if no longer needed (check if allYouth uses it -- it doesn't, it uses `supabase`).

Note: Keep the `created_at` in the query select even if not displayed (it's used for ordering). But remove it from the UserWithLinks type since the component no longer needs it.
  </action>
  <verify>
    TypeScript compiles: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit --pretty 2>&1 | head -30`
    Verify no references to AttendanceDot remain: `grep -r "AttendanceDot" src/`
    Verify updateUserInfo is imported: `grep "updateUserInfo" src/components/admin/UserTable.tsx`
  </verify>
  <done>
    - AttendanceDot component and all references removed from UserTable
    - Registration date display removed from user rows
    - "Rediger info" menu action added to ActionMenu with edit dialog (name, email, phone)
    - Avatar component used in place of inline initials div
    - admin/users/page.tsx no longer fetches attendance data
    - avatar_url included in query select
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Profile page and dashboard avatar navigation</name>
  <files>
    src/app/dashboard/profil/page.tsx
    src/components/profile/ProfileForm.tsx
    src/app/dashboard/page.tsx
  </files>
  <action>
**1. Create profile page server component (`src/app/dashboard/profil/page.tsx`):**

Create the directory `src/app/dashboard/profil/` and the page. Server component that:
- Uses `createClient()` to get the current user (redirect to /login if not authenticated)
- Fetches profile data: `full_name, email, phone, role, avatar_url, is_admin` from profiles table
- Renders a back link to /dashboard (matching admin page pattern: arrow + "Tilbake til dashbord")
- Title: "Min profil"
- Passes profile data + userId to `<ProfileForm>` client component
- Layout: `min-h-dvh p-4` > `max-w-lg mx-auto pt-8` (single column, mobile-first)

**2. Create profile form client component (`src/components/profile/ProfileForm.tsx`):**

'use client' component. Props: `profile: { full_name: string; email: string; phone: string; role: string; avatar_url: string | null; is_admin: boolean }`, `userId: string`

Features:
- **Avatar section at top:** Large Avatar component (size="lg") centered. Below it, a file input styled as a button ("Last opp bilde"). On file select:
  - Validate file is image (accept="image/*") and < 2MB
  - Upload to Supabase storage bucket `avatars` at path `{userId}/avatar.{ext}` using the browser client
  - Use `createBrowserClient` from `@supabase/ssr` (check if client.ts exists and follow that pattern)
  - After upload, get public URL via `supabase.storage.from('avatars').getPublicUrl(path)`
  - Show upload preview immediately (use URL.createObjectURL for instant preview)
  - Store the public URL in a state variable `avatarUrl`

- **Form fields:** Name (Input, required), E-post (Input, type="email", required), Telefon (Input, type="tel", required, pattern 8 digits)
  - Prefilled with current profile values
  - Use controlled state for each field

- **Role display (read-only):** Show role badge using Badge component (not editable). If is_admin, also show admin badge.

- **Save button:** "Lagre endringer" (Button variant="primary"). On click:
  - Create FormData with fullName, email, phone, avatarUrl
  - Call `updateOwnProfile(formData)` server action
  - Show loading state on button
  - On success: show brief success message ("Profil oppdatert!") styled in green text
  - On error: show error message in red

- **Mobile-first layout:** Stack all fields vertically, full width inputs, generous spacing (space-y-5)

For the Supabase browser client, check `src/lib/supabase/client.ts` and use whatever export it provides. It should have a `createClient` function for browser use.

**3. Add avatar navigation to dashboard (`src/app/dashboard/page.tsx`):**

- Import Avatar from `@/components/ui/Avatar`
- Import Link from `next/link`
- Add `avatar_url` to the profile query select: change `'full_name, role, parent_invite_code, is_admin'` to `'full_name, role, parent_invite_code, is_admin, avatar_url'`
- Replace the existing welcome header section. Currently it's:
  ```tsx
  <div className="flex items-center gap-3 mb-6">
    <h1>Velkommen, {fullName}!</h1>
    <Badge ...>
  </div>
  ```
  Change to include a profile avatar link in the top-right:
  ```tsx
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-bold text-text-primary">
        Velkommen, {fullName}!
      </h1>
      <Badge variant={badgeVariant}>{roleLabels[role] || role}</Badge>
      {isAdmin && <Badge variant="admin">Admin</Badge>}
    </div>
    <Link href="/dashboard/profil" aria-label="Min profil">
      <Avatar name={fullName} avatarUrl={profile?.avatar_url} size="sm" role={role as 'youth' | 'parent'} />
    </Link>
  </div>
  ```
- Extract `profile?.avatar_url` as a variable alongside the other profile fields (like fullName, role, isAdmin)
  </action>
  <verify>
    TypeScript compiles: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit --pretty 2>&1 | head -30`
    Profile page exists: `ls src/app/dashboard/profil/page.tsx`
    ProfileForm component exists: `ls src/components/profile/ProfileForm.tsx`
    Avatar link in dashboard: `grep "profil" src/app/dashboard/page.tsx`
  </verify>
  <done>
    - /dashboard/profil route exists with server component fetching profile data
    - ProfileForm renders editable name, email, phone fields + avatar upload
    - Avatar upload goes to Supabase storage `avatars/{userId}/avatar.{ext}`
    - Save calls updateOwnProfile server action and shows success/error feedback
    - Dashboard header shows small Avatar circle linking to /dashboard/profil
    - All UI is mobile-first with proper spacing and design tokens
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. Admin user list loads without AttendanceDot or registration dates
3. "Rediger info" menu item opens dialog, saves user info changes
4. /dashboard/profil page loads with current user's profile data
5. Profile picture upload works (file -> storage -> preview -> saved URL)
6. Dashboard header shows avatar linking to profile page
7. Avatar component shows image when URL exists, initials when not
</verification>

<success_criteria>
- Admin can edit any user's name/email/phone from the user list via "Rediger info" dialog
- Users can view and edit their own profile at /dashboard/profil
- Profile picture upload stores to Supabase Storage and displays via Avatar component
- Avatar component is reusable (used in admin list, dashboard header, profile page)
- Admin user list is cleaner without attendance and registration date clutter
- All TypeScript compiles, no runtime errors
</success_criteria>

<output>
After completion, create `.planning/quick/26-profile-page-admin-user-editing-profile-/26-SUMMARY.md`
</output>
