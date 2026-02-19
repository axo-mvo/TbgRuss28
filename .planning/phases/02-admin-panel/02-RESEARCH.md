# Phase 2: Admin Panel - Research

**Researched:** 2026-02-19
**Domain:** Admin CRUD panel with user management, parent-child link editing, drag-and-drop group builder, and lock/publish flow -- built on Phase 1's Next.js 15 + Supabase + Tailwind CSS v4 foundation
**Confidence:** HIGH

## Summary

Phase 2 builds an admin-only interface on top of Phase 1's auth system, database schema, and UI primitives. The phase covers four major feature areas: (1) a user management table showing all registered users with search, inline role editing, and deletion; (2) parent-child link display and editing via a bottom sheet; (3) a group builder with drag-and-drop on desktop and tap-to-assign on mobile, with a critical constraint that parents and their linked youth must NEVER be in the same group; and (4) a lock/publish flow that makes group assignments visible to participants on their dashboards.

The database schema from Phase 1 already has all required tables (`profiles`, `parent_youth_links`, `groups`, `group_members`) and RLS policies that allow admin reads and writes. The main technical additions needed are: (a) new RLS policies for admin UPDATE/DELETE on `profiles` and parent-youth links, (b) server actions for all admin CRUD operations using the admin client (service role), (c) a `discussion_group_names` table or static list for predefined russ group names, and (d) a Postgres function to enforce the parent-child separation constraint on group membership.

For the group builder's drag-and-drop, the recommendation is `@dnd-kit/react` (v0.3.2, beta) -- it explicitly supports React 19 (`peerDependencies: react ^18 || ^19`), has an actively maintained new API (`DragDropProvider`, `useSortable` with `group` prop for multi-container), and its "multiple sortable lists" pattern maps directly to the group bucket UX. The legacy `@dnd-kit/core` (v6.3.1) also works with React 19 via its looser peer dep (`>=16.8.0`) but is no longer receiving updates. Given that this app has limited scope and will be used for a single event, the new `@dnd-kit/react` API's cleaner ergonomics outweigh its beta status. Confirmation dialogs and bottom sheets should be built with native HTML `<dialog>` element rather than adding modal library dependencies.

**Primary recommendation:** Use server actions with the admin client for all mutations. Use `@dnd-kit/react` + `@dnd-kit/helpers` for drag-and-drop. Build the user table mobile-first with a card-stack layout on small screens and horizontal table on `md:` breakpoint. Enforce parent-child separation in both the UI (warning) and database (Postgres check function). Use native `<dialog>` for confirmations and a CSS-based bottom sheet for link editing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Table layout with columns: name, email, role, registration date
- Search by name (text input, no role filter needed for ~80 users)
- Inline action buttons per row (edit role, delete)
- Confirmation dialog required for both role changes and user deletion
- Parent rows show linked youth name(s) as secondary line or badge inline
- Links shown inline in the user table (parent row shows linked youth)
- Unlinked parents get a warning badge (visual indicator on the row)
- Admin CAN re-link parents to different youth after registration
- Link editing via bottom sheet / modal: tap parent row, sheet slides up with youth dropdown to link/unlink
- Drag-and-drop on desktop to assign users to group buckets
- Tap-to-assign fallback on mobile: tap user, pick group from list
- **CRITICAL: Parents and their linked youth must NEVER be in the same group** (overrides roadmap's "parent-follows-child" wording)
- Auto-exclude enforcement: admin gets a warning if they try to put a parent and their linked child in the same group
- Group names come from a predefined list of famous russ group names from previous years, randomly assigned when creating a group

### Claude's Discretion
- Lock/unlock UI pattern and confirmation flow
- Table responsive behavior on mobile (horizontal scroll vs stacked)
- Empty states for user list and group builder
- Loading and error state design
- Exact drag-and-drop library choice
- How the predefined russ group name list is stored/managed

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMN-01 | Admin can view all registered users with name, email, role, and registration date | Server Component queries `profiles` table with admin RLS SELECT policy. Display as mobile-first card stack / desktop table. See Architecture Pattern 1: Admin Data Fetching. |
| ADMN-02 | Admin can see which youth each parent is linked to | Supabase relational query: `profiles` with joined `parent_youth_links` and nested youth profile. Foreign key join via `parent_youth_links.youth_id -> profiles.id`. See Code Examples: Profiles with Links Query. |
| ADMN-03 | Admin can change a user's role or delete a user | Server actions using admin client: `profiles.update({role})` for role change, `auth.admin.deleteUser()` for deletion (cascades to profile via FK). Confirmation dialog via `<dialog>`. See Code Examples: Role Change and User Deletion. |
| ADMN-04 | Admin can create discussion groups and assign members | Group builder UI: `@dnd-kit/react` DragDropProvider with sortable multi-container pattern. Server actions: insert into `groups` table, insert into `group_members`. Group names randomly assigned from predefined list. See Architecture Pattern 3: Group Builder. |
| ADMN-05 | Parents and linked youth must NEVER be in same group (admin can override separation) | UI enforcement: real-time check when dragging/assigning users -- show warning badge if parent-child conflict detected. DB enforcement: Postgres function `check_parent_child_separation()` called before group member insert. See Architecture Pattern 4: Parent-Child Separation. |
| ADMN-06 | Admin can lock groups so participants see their assignment | Server action: `groups.update({locked: true})`. Dashboard page queries `group_members` joined with `groups` where `locked = true` to show assignment. Lock/unlock with confirmation dialog. See Architecture Pattern 5: Lock & Publish. |
</phase_requirements>

## Standard Stack

### Core (already installed from Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5 | App Router, Server Components, Server Actions | Already installed. Admin pages use the same patterns. |
| React | ^19 | UI library, `useActionState` for form mutations | Already installed. Admin forms use same patterns as auth forms. |
| @supabase/supabase-js | ^2.97 | Database queries, admin auth operations | Already installed. Admin operations use the service role admin client. |
| @supabase/ssr | ^0.8 | Server-side Supabase client with cookie handling | Already installed. Admin Server Components use same `createClient()`. |
| Tailwind CSS | ^4 | Utility-first styling | Already installed. Admin UI extends the same `@theme` design tokens. |

### New Dependencies for Phase 2

| Library | Version | Purpose | Why This Library |
|---------|---------|---------|-----------------|
| @dnd-kit/react | ^0.3.2 | Drag-and-drop for group builder (desktop) | Explicitly supports React 19 (`^18 || ^19`). New API (`DragDropProvider`, `useSortable` with `group` prop) maps directly to multi-container group assignment. Actively maintained (published Feb 2026). Lightweight -- no heavy dependencies. |
| @dnd-kit/helpers | latest | Array manipulation helpers (`move`) for dnd-kit | Official companion to `@dnd-kit/react`. Provides `move()` function for reordering items across containers. Required for multi-container sortable lists. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/react` (new, beta) | `@dnd-kit/core` + `@dnd-kit/sortable` (stable v6/v10) | Stable and battle-tested, but no longer receiving updates. Requires more boilerplate for multi-container. Peer dep `>=16.8.0` works with React 19 but was not designed for it. For a single-event app, the new API's cleaner DX is worth the beta trade. |
| `@dnd-kit/react` | `react-beautiful-dnd` | Unmaintained since 2022. Does not support React 18+. Not an option. |
| `@dnd-kit/react` | `react-dnd` | Open issue for React 19 support. Heavy (HTML5 backend dependency). Overkill for this use case. |
| Native `<dialog>` for modals | `react-modal-sheet` or `vaul` | Adds a dependency for a single bottom sheet. For this app with ~3 dialogs, native `<dialog>` + CSS animations is sufficient and zero-dependency. |
| Custom bottom sheet with CSS | `react-modal-sheet` (Motion dependency) | react-modal-sheet depends on Motion (formerly Framer Motion) -- adds ~30KB. A CSS-based bottom sheet using `<dialog>` + CSS transitions is sufficient for this use case. |

**Installation:**
```bash
npm install @dnd-kit/react @dnd-kit/helpers
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx              # Existing admin guard (no changes needed)
│   │   ├── page.tsx                # Admin dashboard hub (links to sub-pages)
│   │   ├── users/
│   │   │   └── page.tsx            # User management table (Server Component)
│   │   └── groups/
│   │       └── page.tsx            # Group builder (Server Component shell + Client island)
│   ├── dashboard/
│   │   └── page.tsx                # Updated: show group assignment when groups locked
├── components/
│   ├── ui/
│   │   ├── Dialog.tsx              # Reusable confirmation dialog (native <dialog>)
│   │   ├── BottomSheet.tsx         # Reusable bottom sheet (native <dialog> + CSS)
│   │   ├── SearchInput.tsx         # Search input with debounce
│   │   └── EmptyState.tsx          # Empty state component
│   └── admin/
│       ├── UserTable.tsx           # 'use client' - user table with search, actions
│       ├── UserRow.tsx             # Single user row with inline actions
│       ├── ParentLinkSheet.tsx     # 'use client' - bottom sheet for parent-youth linking
│       ├── GroupBuilder.tsx        # 'use client' - drag-and-drop group builder
│       ├── GroupBucket.tsx         # Single group container (droppable)
│       ├── UserCard.tsx            # Draggable user card for group builder
│       └── UnassignedPool.tsx      # Pool of unassigned users
├── lib/
│   ├── actions/
│   │   └── admin.ts               # Server Actions: CRUD for users, groups, members
│   └── utils/
│       └── parent-child.ts        # Client-side parent-child conflict detection
└── supabase/
    └── migrations/
        ├── 005_admin_policies.sql  # RLS: admin UPDATE/DELETE on profiles, links
        └── 006_group_constraints.sql # Postgres function for parent-child separation
```

### Pattern 1: Admin Data Fetching (Server Component)

**What:** Admin pages use Server Components to fetch data directly, passing it to Client Component children for interactivity.
**When to use:** Every admin page that shows data (user list, group builder).
**Why:** Server Components can use the server Supabase client directly. No client-side data fetching, no loading states for initial data. Client Components handle interactions.

```typescript
// app/admin/users/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { UserTable } from '@/components/admin/UserTable'

export default async function UsersPage() {
  const supabase = await createClient()

  // Admin RLS policy allows reading all profiles
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      created_at,
      parent_youth_links!parent_youth_links_parent_id_fkey(
        youth:profiles!parent_youth_links_youth_id_fkey(id, full_name)
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-4xl mx-auto pt-4">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Brukere</h1>
        <UserTable users={users ?? []} />
      </div>
    </div>
  )
}
```

### Pattern 2: Server Actions for Admin Mutations

**What:** All admin write operations go through Server Actions using the admin client (service role). Actions revalidate the page path after mutation.
**When to use:** Role changes, user deletion, group creation, member assignment, lock/unlock.
**Why:** Server Actions validate permissions, use the admin client to bypass RLS for privileged operations, and call `revalidatePath()` to refresh data.

```typescript
// lib/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateUserRole(userId: string, newRole: string) {
  // Verify caller is admin (defense-in-depth)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { error: 'Ikke autorisert' }

  // Use admin client for the mutation
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: 'Kunne ikke oppdatere rolle' }

  revalidatePath('/admin/users')
  return { success: true }
}
```

### Pattern 3: Group Builder with Drag-and-Drop

**What:** Multi-container sortable interface where each group is a droppable container. Users are dragged from an "unassigned" pool into group buckets.
**When to use:** The group assignment page.
**Critical constraint:** Parents and their linked youth must NEVER be in the same group.

```typescript
// components/admin/GroupBuilder.tsx (Client Component)
'use client'

import { useState } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'

type GroupState = Record<string, string[]> // groupId -> userIds[]

export function GroupBuilder({
  initialGroups,
  parentChildLinks,
}: {
  initialGroups: GroupState
  parentChildLinks: Map<string, string[]> // parentId -> youthIds[]
}) {
  const [groups, setGroups] = useState<GroupState>(initialGroups)

  function checkConflict(groupId: string, userId: string): boolean {
    const groupMembers = groups[groupId] || []
    // Check if userId is a parent with a child already in this group
    const linkedYouth = parentChildLinks.get(userId) ?? []
    if (linkedYouth.some(youthId => groupMembers.includes(youthId))) return true
    // Check if userId is a youth with a parent already in this group
    for (const [parentId, youthIds] of parentChildLinks) {
      if (youthIds.includes(userId) && groupMembers.includes(parentId)) return true
    }
    return false
  }

  return (
    <DragDropProvider
      onDragOver={(event) => {
        setGroups((items) => move(items, event))
      }}
    >
      {/* Render group buckets and unassigned pool */}
    </DragDropProvider>
  )
}
```

### Pattern 4: Parent-Child Separation Enforcement

**What:** Two-layer enforcement -- UI warns on conflict, database function rejects violations.
**When to use:** Every group member assignment.
**Why:** UI-only validation can be bypassed. The database function is the source of truth.

```sql
-- 006_group_constraints.sql
-- Postgres function: checks if adding user_id to group_id
-- would place a parent and their linked child in the same group
CREATE OR REPLACE FUNCTION public.check_parent_child_separation(
  p_group_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_conflict BOOLEAN := false;
  v_conflict_name TEXT;
BEGIN
  -- Check 1: Is this user a parent with a linked child already in the group?
  SELECT true, p.full_name INTO v_conflict, v_conflict_name
  FROM parent_youth_links pyl
  JOIN group_members gm ON gm.user_id = pyl.youth_id AND gm.group_id = p_group_id
  JOIN profiles p ON p.id = pyl.youth_id
  WHERE pyl.parent_id = p_user_id
  LIMIT 1;

  IF v_conflict THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Forelder kan ikke vaere i samme gruppe som sitt barn (' || v_conflict_name || ')');
  END IF;

  -- Check 2: Is this user a youth with a linked parent already in the group?
  SELECT true, p.full_name INTO v_conflict, v_conflict_name
  FROM parent_youth_links pyl
  JOIN group_members gm ON gm.user_id = pyl.parent_id AND gm.group_id = p_group_id
  JOIN profiles p ON p.id = pyl.parent_id
  WHERE pyl.youth_id = p_user_id
  LIMIT 1;

  IF v_conflict THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Ungdom kan ikke vaere i samme gruppe som sin forelder (' || v_conflict_name || ')');
  END IF;

  RETURN json_build_object('allowed', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Pattern 5: Lock & Publish Flow

**What:** Admin locks groups, making assignments visible on participant dashboards. Lock is togglable (can unlock to make changes).
**When to use:** After groups are finalized.
**Recommendation (Claude's discretion):** Single "Lås grupper" button at the top of the group builder page. When clicked, shows confirmation dialog: "Er du sikker? Deltakerne vil se gruppeinndelingen sin." Lock sets `groups.locked = true` for all groups. Unlock reverses it.

```typescript
// Dashboard shows group assignment when locked
// app/dashboard/page.tsx addition
const { data: membership } = await supabase
  .from('group_members')
  .select(`
    group:groups!inner(id, name, locked)
  `)
  .eq('user_id', user.id)
  .eq('groups.locked', true)
  .maybeSingle()

// If membership exists and group is locked, show group name
```

### Pattern 6: Mobile-First Table (Stacked Cards on Mobile, Table on Desktop)

**What:** On mobile (`< md`), each user renders as a card with stacked fields. On desktop (`md:`), renders as a traditional table row.
**When to use:** User management page.
**Recommendation (Claude's discretion):** Use the card-stack approach rather than horizontal scroll -- it's more usable on mobile for an admin who needs to take actions on each row.

```tsx
// Responsive approach: hidden/shown based on breakpoint
<div className="md:hidden space-y-3">
  {/* Mobile: Card stack */}
  {users.map(user => (
    <Card key={user.id} className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-text-primary">{user.full_name}</p>
          <p className="text-sm text-text-muted">{user.email}</p>
          {user.linkedYouth && (
            <Badge variant="parent" className="mt-1">{user.linkedYouth}</Badge>
          )}
        </div>
        <Badge variant={user.role}>{roleLabel[user.role]}</Badge>
      </div>
      <div className="flex gap-2 mt-3">
        {/* Action buttons */}
      </div>
    </Card>
  ))}
</div>

<div className="hidden md:block">
  {/* Desktop: Traditional table */}
  <table className="w-full">...</table>
</div>
```

### Anti-Patterns to Avoid

- **Client-side Supabase mutations for admin operations:** All admin CRUD must go through Server Actions with the admin client. The anon-key Supabase client respects RLS policies that don't have admin UPDATE/DELETE for regular authenticated users.
- **Skipping admin verification in Server Actions:** Always verify the caller is an admin at the start of every admin Server Action (defense-in-depth). Don't rely solely on the layout guard.
- **Using `auth.admin.deleteUser()` with the anon client:** The `auth.admin.*` methods require the service role key. They are only available on the admin client created with `SUPABASE_SERVICE_ROLE_KEY`.
- **Only validating parent-child separation in the UI:** The UI warning can be bypassed (e.g., direct API calls). The Postgres function provides the actual guarantee.
- **Storing group names in code constants:** The predefined name list should be in a database table or at minimum a config file, so organizers can update it without code changes.
- **Forgetting `revalidatePath()` after mutations:** Server Actions that modify data must call `revalidatePath('/admin/users')` or similar to refresh the Server Component data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom drag event handlers, HTML5 Drag API | `@dnd-kit/react` with `DragDropProvider` and `useSortable` | Cross-browser consistency, keyboard accessibility, touch support, multi-container management. The HTML5 Drag API has poor mobile support. |
| Multi-container sortable state | Custom state management for moving items between groups | `@dnd-kit/helpers` `move()` function | Handles edge cases: moving between containers, reordering within containers, empty container handling. |
| Confirmation dialogs | Custom modal overlay with backdrop, focus trap, escape handling | Native `<dialog>` element with `showModal()` | Built-in focus trapping, escape key handling, `::backdrop` styling, screen reader announcements. Zero JavaScript needed for basic behavior. |
| Bottom sheet for mobile | Custom touch gesture handler, spring animation | Native `<dialog>` element + CSS transforms/transitions | Avoids Motion/Framer dependency. CSS transitions handle the slide-up animation. The `<dialog>` provides accessibility for free. |
| Parent-child conflict detection | JavaScript-only validation | Postgres function `check_parent_child_separation()` + client-side preview | Client-side check gives immediate UX feedback. Postgres function is the authoritative constraint. Both are needed. |
| User search | Full-text search engine, debounced API calls | Client-side string filter on the already-loaded user list (~80 users) | For ~80 users, filtering a JS array is instant. No API round-trip needed. Load all users once in the Server Component, filter in the Client Component. |

**Key insight:** With only ~80 users, many patterns that would require pagination and server-side search at scale can be simplified to client-side operations. Load all data in the Server Component, pass to Client Components, and filter/search in-memory.

## Common Pitfalls

### Pitfall 1: Admin Operations Without Auth Verification in Server Actions

**What goes wrong:** A Server Action for admin operations (e.g., `deleteUser`) doesn't verify the caller is actually an admin. Anyone who knows the function signature can invoke it.
**Why it happens:** The admin layout guard gives a false sense of security. Layout guards prevent page rendering but don't protect Server Actions -- Server Actions can be called from any client code.
**How to avoid:** Every admin Server Action must start with: (1) get the current user via `supabase.auth.getUser()`, (2) query their profile role, (3) reject if not admin. The admin client (service role) is used for the actual mutation, but authorization must be checked first.
**Warning signs:** Non-admin users can trigger admin operations by importing and calling the Server Action directly.

### Pitfall 2: Supabase Foreign Key Join Syntax Ambiguity

**What goes wrong:** Querying `profiles` with `parent_youth_links` fails because Supabase can't determine which foreign key to use -- `parent_youth_links` has TWO foreign keys to `profiles` (`parent_id` and `youth_id`).
**Why it happens:** When a table has multiple foreign keys to the same table, Supabase's PostgREST layer needs explicit disambiguation via the `!foreign_key_name` syntax.
**How to avoid:** Use explicit foreign key names: `parent_youth_links!parent_youth_links_parent_id_fkey(youth:profiles!parent_youth_links_youth_id_fkey(id, full_name))`. The FK name format is `{table}_{column}_fkey` by default in Supabase.
**Warning signs:** Error message: "Could not embed because more than one relationship was found."

### Pitfall 3: Cascade Delete Deleting More Than Expected

**What goes wrong:** Admin deletes a user via `auth.admin.deleteUser()`. The CASCADE on `profiles` FK removes the profile, which cascades to `parent_youth_links`, `group_members`, and any future data linked to the user.
**Why it happens:** The schema uses `ON DELETE CASCADE` on `profiles.id -> auth.users(id)`, and `group_members.user_id -> profiles(id)` also cascades.
**How to avoid:** This is actually correct behavior -- when a user is deleted, all their data should be removed. But the admin must be warned in the confirmation dialog: "Dette vil slette brukeren og fjerne dem fra alle grupper." Consider soft delete for audit purposes if needed in the future.
**Warning signs:** Groups lose members unexpectedly after user deletion.

### Pitfall 4: DnD Kit Not Working in Server Components

**What goes wrong:** Importing `@dnd-kit/react` in a Server Component causes a "useState is not defined" or "Event listeners not supported" error.
**Why it happens:** `@dnd-kit/react` uses React hooks (`useState`, `useRef`, `useEffect`) internally. These are client-only APIs.
**How to avoid:** The group builder component MUST be a Client Component (`'use client'`). The Server Component parent fetches data and passes it as props to the Client Component child. This is the standard "Server Component shell + Client Component island" pattern from Phase 1.
**Warning signs:** Build error or runtime error mentioning `useState` in Server Component context.

### Pitfall 5: Race Condition in Group Member Assignment

**What goes wrong:** Two admins simultaneously assign the same user to different groups, or assign a parent and their child to the same group in rapid succession, bypassing the UI conflict check.
**Why it happens:** The parent-child check happens client-side only. Between the check and the database insert, another operation could change the group membership.
**How to avoid:** Call `check_parent_child_separation()` as a Postgres function from the Server Action BEFORE inserting into `group_members`. If the function returns `{allowed: false}`, reject the operation and return the reason to the UI.
**Warning signs:** A parent and their linked child end up in the same group despite the UI warning.

### Pitfall 6: Bottom Sheet on iOS Safari z-index/Scroll Issues

**What goes wrong:** The bottom sheet for parent-child link editing doesn't render correctly on iOS Safari. Content behind the sheet is scrollable, or the sheet itself doesn't scroll for long youth lists.
**Why it happens:** iOS Safari has unique behavior with `position: fixed` elements and scroll containers. The `<dialog>` element with `showModal()` handles most of this, but custom CSS can break it.
**How to avoid:** Use `<dialog>` with `showModal()` -- this gives the native modal behavior including scroll lock on the background. Style the dialog to slide up from the bottom using CSS `transform: translateY(100%)` to `translateY(0)`. Use `overscroll-behavior: contain` on the dialog content.
**Warning signs:** User reports being able to scroll the page behind the bottom sheet on iPhone.

## Code Examples

### Profiles with Parent-Child Links Query (Supabase Relational Join)

```typescript
// Source: Supabase JS docs (Context7) - relational queries with FK disambiguation
const { data: users, error } = await supabase
  .from('profiles')
  .select(`
    id,
    full_name,
    email,
    role,
    created_at,
    parent_youth_links!parent_youth_links_parent_id_fkey(
      id,
      youth:profiles!parent_youth_links_youth_id_fkey(id, full_name)
    )
  `)
  .order('created_at', { ascending: false })

// Result shape per user:
// {
//   id, full_name, email, role, created_at,
//   parent_youth_links: [{ id, youth: { id, full_name } }]
// }
// Only parents have non-empty parent_youth_links array
```

### User Deletion Server Action

```typescript
// Source: Supabase docs - auth.admin.deleteUser()
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  // 1. Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { error: 'Ikke autorisert' }

  // 2. Prevent admin from deleting themselves
  if (userId === user.id) return { error: 'Du kan ikke slette din egen bruker' }

  // 3. Delete via admin client (hard delete)
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) return { error: 'Kunne ikke slette brukeren' }

  // Profile row is cascade-deleted via FK on profiles.id -> auth.users(id)
  revalidatePath('/admin/users')
  return {}
}
```

### Confirmation Dialog Component (Native `<dialog>`)

```typescript
// components/ui/Dialog.tsx
'use client'

import { useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}

export default function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Bekreft',
  confirmVariant = 'primary',
  loading = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      ref.current?.showModal()
    } else {
      ref.current?.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-xl p-0 backdrop:bg-black/50 max-w-sm w-[calc(100%-2rem)]"
    >
      <div className="p-5">
        <h2 className="text-lg font-bold text-text-primary mb-2">{title}</h2>
        <p className="text-text-muted text-sm mb-6">{description}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Laster...' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
```

### Bottom Sheet Component (Native `<dialog>` + CSS)

```typescript
// components/ui/BottomSheet.tsx
'use client'

import { useRef, useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      ref.current?.showModal()
    } else {
      ref.current?.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="fixed inset-0 m-0 p-0 w-full max-w-full h-auto max-h-[85dvh]
        rounded-t-2xl bg-white shadow-2xl
        translate-y-full open:translate-y-0
        transition-transform duration-300 ease-out
        backdrop:bg-black/50
        self-end"
      style={{ marginTop: 'auto' }}
    >
      <div className="p-5 overflow-y-auto overscroll-contain max-h-[85dvh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted"
          >
            Lukk
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
```

### Group Builder with dnd-kit/react (Multiple Sortable Lists)

```typescript
// Source: dnd-kit official docs - multiple sortable lists pattern
// https://next.dndkit.com/react/guides/multiple-sortable-lists
'use client'

import { useState } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { move } from '@dnd-kit/helpers'

function SortableUserCard({ id, index, column, user, hasConflict }: {
  id: string
  index: number
  column: string
  user: { full_name: string; role: string }
  hasConflict: boolean
}) {
  const { ref, isDragging } = useSortable({
    id,
    index,
    type: 'user',
    accept: 'user',
    group: column,
  })

  return (
    <div
      ref={ref}
      className={`p-3 rounded-lg border ${
        hasConflict ? 'border-danger bg-danger/5' :
        isDragging ? 'opacity-50 border-teal-primary' :
        'border-gray-200 bg-white'
      }`}
    >
      <span className="font-medium">{user.full_name}</span>
      {hasConflict && (
        <span className="text-xs text-danger ml-2">Forelder-barn-konflikt!</span>
      )}
    </div>
  )
}
```

### Parent-Child Link Update Server Action

```typescript
export async function updateParentYouthLink(
  parentId: string,
  youthIds: string[]
): Promise<{ error?: string }> {
  // 1. Verify caller is admin (same pattern as above)
  // ...

  const admin = createAdminClient()

  // 2. Delete existing links for this parent
  const { error: deleteError } = await admin
    .from('parent_youth_links')
    .delete()
    .eq('parent_id', parentId)

  if (deleteError) return { error: 'Kunne ikke oppdatere koblinger' }

  // 3. Insert new links (if any)
  if (youthIds.length > 0) {
    const links = youthIds.map(youthId => ({
      parent_id: parentId,
      youth_id: youthId,
    }))

    const { error: insertError } = await admin
      .from('parent_youth_links')
      .insert(links)

    if (insertError) return { error: 'Kunne ikke opprette nye koblinger' }
  }

  revalidatePath('/admin/users')
  return {}
}
```

### Group Creation with Random Name Assignment

```typescript
// Predefined russ group names (stored in code for simplicity;
// could also be a DB table if organizers need to edit without deploy)
const RUSS_GROUP_NAMES = [
  'Trollkraft', 'Vindstyrke', 'Nordlys', 'Stormtropp',
  'Fjelltopp', 'Bolgekraft', 'Iskald', 'Lynild',
  'Ravnsvart', 'Solskinnet', 'Tordenvaret', 'Midnattsol',
]

export async function createGroup(): Promise<{ error?: string; group?: { id: string; name: string } }> {
  // 1. Verify admin (same pattern)
  // ...

  const admin = createAdminClient()

  // 2. Get existing group names to avoid duplicates
  const { data: existingGroups } = await admin
    .from('groups')
    .select('name')

  const usedNames = new Set(existingGroups?.map(g => g.name) || [])
  const availableNames = RUSS_GROUP_NAMES.filter(n => !usedNames.has(n))

  if (availableNames.length === 0) {
    return { error: 'Alle gruppenavn er brukt opp' }
  }

  // 3. Pick random name
  const randomName = availableNames[Math.floor(Math.random() * availableNames.length)]

  // 4. Create group
  const { data, error } = await admin
    .from('groups')
    .insert({ name: randomName })
    .select()
    .single()

  if (error) return { error: 'Kunne ikke opprette gruppe' }

  revalidatePath('/admin/groups')
  return { group: { id: data.id, name: data.name } }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` for drag-and-drop | `@dnd-kit/react` (v0.3+) | 2024-2025 | react-beautiful-dnd abandoned since 2022. dnd-kit is the modern standard with active development, React 19 support, and smaller bundle. |
| `@dnd-kit/core` + `@dnd-kit/sortable` | `@dnd-kit/react` + `@dnd-kit/helpers` | 2025-2026 | New unified API. `DragDropProvider` replaces `DndContext`. `useSortable` gets `group` prop for multi-container. `move()` helper replaces manual array state management. |
| React modal libraries (react-modal, etc.) | Native `<dialog>` element | 2023+ (browser support complete) | `<dialog>` with `showModal()` provides focus trapping, escape key, backdrop, and accessibility for free. No library dependency needed. |
| Custom bottom sheets with JS gestures | `<dialog>` + CSS transitions | 2024+ | The `<dialog>` element positioned at bottom with CSS transform provides a zero-dependency bottom sheet. Motion library not needed for basic slide-up animation. |
| Server-side search with pagination | Client-side filter for small datasets | Always (but newly relevant) | For ~80 users, loading all data and filtering in-memory is faster and simpler than building a paginated API. No debounced API calls needed. |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Unmaintained since 2022. Does not support React 18+.
- `react-dnd`: React 19 support unresolved. Heavy HTML5 backend dependency.
- Custom modal overlays with `div` + `role="dialog"`: Native `<dialog>` is better in every way.

## Open Questions

1. **@dnd-kit/react beta stability for production**
   - What we know: Version 0.3.2, actively maintained (published Feb 2026), explicitly supports React 19. The API is documented and the multi-container pattern is well-documented.
   - What's unclear: "Beta" label -- unclear if there are known breaking changes planned before v1.0.
   - Recommendation: Use it. This is a single-event app with limited scope. If dnd-kit/react has issues, the fallback of `@dnd-kit/core` (v6.3.1) + `@dnd-kit/sortable` (v10.0.0) is a drop-in migration path. The tap-to-assign mobile fallback is also independent of the DnD library.

2. **Predefined group names storage**
   - What we know: Group names should come from a list of famous russ group names. The organizers provide the list.
   - What's unclear: Whether the list should be a database table (editable without deploy) or a code constant (simpler, requires deploy to change).
   - Recommendation: Start with a code constant (array in `lib/constants/group-names.ts`). For ~80 users split into ~6-8 groups, 12 predefined names is more than enough. If organizers need to edit names frequently, add a DB table later.

3. **RLS policies for admin UPDATE/DELETE on profiles**
   - What we know: Current RLS has admin SELECT on profiles, but no UPDATE/DELETE policies. Admin operations use the service role client which bypasses RLS.
   - What's unclear: Whether to add explicit RLS policies for admin UPDATE/DELETE or rely entirely on the service role client.
   - Recommendation: Add RLS policies for completeness and defense-in-depth, even though Server Actions use the admin client. This protects against accidental use of the regular Supabase client in admin code paths.

4. **Handling concurrent admin edits**
   - What we know: There will likely be only one admin operating the panel at a time during the meeting setup.
   - What's unclear: Whether we need optimistic locking or conflict resolution for concurrent edits.
   - Recommendation: Not needed for v1. With a single admin, `revalidatePath()` after each mutation is sufficient. If multiple admins are expected in the future, add `updated_at` timestamps with optimistic locking.

## Sources

### Primary (HIGH confidence)
- [Context7: @dnd-kit docs - /websites/dndkit] -- DndContext, SortableContext, useSortable, multi-container pattern (verified 2026-02-19)
- [Context7: @dnd-kit next docs - /websites/next_dndkit] -- DragDropProvider, useSortable with `group` prop, `move()` helper, multiple sortable lists guide (verified 2026-02-19)
- [Context7: @supabase/supabase-js - /supabase/supabase-js] -- SELECT with relational joins, UPDATE, DELETE, INSERT, RPC calls (verified 2026-02-19)
- [Context7: Next.js v15.1.8 - /vercel/next.js/v15.1.8] -- Server Actions, revalidatePath, form handling, useActionState (verified 2026-02-19)
- [Supabase: auth.admin.deleteUser()](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) -- Requires service_role key, server-side only, soft vs hard delete
- [Supabase: Auth Admin API](https://supabase.com/docs/reference/javascript/admin-api) -- All admin auth methods require service_role
- [npm: @dnd-kit/react peerDependencies] -- `react: ^18.0.0 || ^19.0.0` (verified via `npm info` 2026-02-19)
- [npm: @dnd-kit/core peerDependencies] -- `react: >=16.8.0` (verified via `npm info` 2026-02-19)

### Secondary (MEDIUM confidence)
- [dnd-kit migration guide](https://dndkit.com/react/guides/migration) -- Migration from @dnd-kit/core to @dnd-kit/react: DndContext -> DragDropProvider, simplified useSortable API
- [GitHub: dnd-kit/discussions/1842](https://github.com/clauderic/dnd-kit/discussions/1842) -- Roadmap discussion (unanswered by maintainer as of 2026-02-19)
- [MDN: HTML dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) -- Native modal behavior, showModal(), focus trapping
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policies, service role bypass, USING/WITH CHECK clauses
- [Tailkits: Building Responsive Tables with Tailwind CSS](https://tailkits.com/blog/tailwind-responsive-tables/) -- Card stack pattern for mobile tables

### Tertiary (LOW confidence)
- [GitHub: dnd-kit Issue #1654](https://github.com/clauderic/dnd-kit/issues/1654) -- "use client" directive needed for DragDropProvider in React 19 (open issue, may be resolved in v0.3.2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Phase 1 stack already installed and working. Only new dependency is `@dnd-kit/react` (verified via npm info).
- Architecture: HIGH -- Patterns follow established Phase 1 conventions (Server Component shell + Client island, Server Actions with admin client, layout guards). Database schema already has required tables.
- Pitfalls: HIGH -- Common issues identified from official docs and practical experience with Supabase FK joins, dnd-kit client components, and iOS dialog behavior.
- dnd-kit/react recommendation: MEDIUM -- Beta library, but explicitly supports React 19, actively maintained, and this is a single-event app with a fallback option.

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days -- stable ecosystem, @dnd-kit/react may release further beta updates)
