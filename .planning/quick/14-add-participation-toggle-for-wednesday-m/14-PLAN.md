---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/016_attending_column.sql
  - src/lib/actions/auth.ts
  - src/app/dashboard/page.tsx
  - src/components/dashboard/AttendingToggle.tsx
  - src/app/admin/users/page.tsx
  - src/components/admin/UserTable.tsx
  - src/app/admin/groups/page.tsx
  - src/components/admin/GroupBuilder.tsx
  - src/components/admin/UserCard.tsx
  - src/components/admin/UnassignedPool.tsx
  - src/components/admin/GroupBucket.tsx
autonomous: true
requirements: [ATTEND-01, ATTEND-02, ATTEND-03, ATTEND-04, ATTEND-05]

must_haves:
  truths:
    - "User sees a toggle on dashboard to confirm/deny Wednesday attendance"
    - "User can change their attendance answer at any time"
    - "Admin users page shows attending status for each user"
    - "Admin group assignment view visually distinguishes non-attending users"
  artifacts:
    - path: "supabase/migrations/016_attending_column.sql"
      provides: "attending boolean column on profiles"
      contains: "ALTER TABLE profiles ADD COLUMN attending"
    - path: "src/components/dashboard/AttendingToggle.tsx"
      provides: "Client-side toggle component for attendance"
      exports: ["default"]
    - path: "src/lib/actions/auth.ts"
      provides: "updateAttending server action"
      exports: ["updateAttending"]
  key_links:
    - from: "src/components/dashboard/AttendingToggle.tsx"
      to: "src/lib/actions/auth.ts"
      via: "updateAttending server action call"
      pattern: "updateAttending"
    - from: "src/components/admin/UserCard.tsx"
      to: "attending prop"
      via: "visual indicator (opacity/badge)"
      pattern: "attending"
---

<objective>
Add a participation toggle for the Wednesday meeting. Users can confirm or deny attendance from their dashboard. Admins see attendance status in the users page and group assignment view, with non-attending users visually de-emphasized so admins can avoid placing no-shows in groups.

Purpose: Prevent admins from assigning non-attending users to groups, and give users a clear way to RSVP.
Output: Migration file, toggle component, server action, updated admin views.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@supabase/migrations/001_schema.sql
@supabase/migrations/015_phone_column.sql
@src/app/dashboard/page.tsx
@src/lib/actions/auth.ts
@src/app/admin/users/page.tsx
@src/components/admin/UserTable.tsx
@src/app/admin/groups/page.tsx
@src/components/admin/GroupBuilder.tsx
@src/components/admin/UserCard.tsx
@src/components/admin/UnassignedPool.tsx
@src/components/admin/GroupBucket.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration and server action for attending status</name>
  <files>
    supabase/migrations/016_attending_column.sql
    src/lib/actions/auth.ts
  </files>
  <action>
    1. Create migration `016_attending_column.sql`:
       - `ALTER TABLE profiles ADD COLUMN attending BOOLEAN;` (nullable -- null = not yet answered)
       - No default value -- null means "hasn't responded yet"

    2. Add `updateAttending` server action to `src/lib/actions/auth.ts`:
       - Export async function `updateAttending(attending: boolean): Promise<{ error?: string }>`
       - Get user via `supabase.auth.getUser()`, return error if not authenticated
       - Update profiles table: `.update({ attending }).eq('id', user.id)`
       - `revalidatePath('/dashboard')` on success
       - Return `{}` on success or `{ error: 'message' }` on failure
       - This is NOT an admin action -- any authenticated user can update their own attending status
  </action>
  <verify>
    - Migration file exists with correct ALTER TABLE statement
    - `updateAttending` is exported from `src/lib/actions/auth.ts`
    - TypeScript compiles: `npx tsc --noEmit` passes
  </verify>
  <done>
    attending column added to profiles (nullable boolean), updateAttending server action ready for use
  </done>
</task>

<task type="auto">
  <name>Task 2: Dashboard toggle and admin visibility updates</name>
  <files>
    src/components/dashboard/AttendingToggle.tsx
    src/app/dashboard/page.tsx
    src/app/admin/users/page.tsx
    src/components/admin/UserTable.tsx
    src/app/admin/groups/page.tsx
    src/components/admin/GroupBuilder.tsx
    src/components/admin/UserCard.tsx
    src/components/admin/UnassignedPool.tsx
    src/components/admin/GroupBucket.tsx
  </files>
  <action>
    **A. Create AttendingToggle component** (`src/components/dashboard/AttendingToggle.tsx`):
    - 'use client' component
    - Props: `{ initialAttending: boolean | null }`
    - Local state tracks current value, uses `useTransition` for optimistic feel
    - Renders a card with:
      - Title: "Fellesmote onsdag kl. 18:00" (Wednesday meeting at 18:00)
      - Subtitle: "Kommer du?"
      - Two buttons side-by-side (NOT a toggle switch -- explicit Ja/Nei buttons):
        - "Ja, jeg kommer" -- green-ish when selected (bg-success/10 border-success text-success)
        - "Nei, jeg kan ikke" -- coral/red when selected (bg-coral/10 border-coral text-coral)
        - Unselected state: neutral gray border
      - If null (not answered): neither button is highlighted, prompt text "Du har ikke svart ennaa"
      - On click: call `updateAttending(true/false)` server action
    - Mobile-first: full-width card, min-h-[44px] buttons for touch targets

    **B. Update dashboard page** (`src/app/dashboard/page.tsx`):
    - Add `attending` to the profile select: `.select('full_name, role, parent_invite_code, attending')`
    - Import and render `<AttendingToggle initialAttending={profile?.attending ?? null} />`
    - Place it AFTER the welcome header and role text, BEFORE the admin panel link / group card
    - All users see it (youth, parent, admin)

    **C. Update admin users page** (`src/app/admin/users/page.tsx`):
    - Add `attending` to the profiles select query (already selects id, full_name, email, phone, role, created_at)

    **D. Update UserTable component** (`src/components/admin/UserTable.tsx`):
    - Add `attending: boolean | null` to the `UserWithLinks` type
    - Show attending status in both mobile card and desktop table:
      - Mobile card: after phone line, show attendance badge:
        - `attending === true`: green badge "Kommer" (checkmark icon)
        - `attending === false`: coral badge "Kommer ikke" (X icon)
        - `attending === null`: gray badge "Ikke svart"
      - Desktop table: add "Oppmote" (Attendance) column between Telefon and Rolle columns
        - Same badge styling as mobile

    **E. Update admin groups page** (`src/app/admin/groups/page.tsx`):
    - Change profiles select to include `attending`: `.select('id, full_name, role, attending')`
    - Pass `attending` through as part of user data

    **F. Update GroupBuilder** (`src/components/admin/GroupBuilder.tsx`):
    - Add `attending?: boolean | null` to `UserData` interface
    - No other logic changes needed -- UserCard handles visual

    **G. Update UserCard** (`src/components/admin/UserCard.tsx`):
    - Add `attending?: boolean | null` to `UserCardProps`
    - When `attending === false` or `attending === null`:
      - Add `opacity-50` to the entire card
      - Show a small indicator: for `false` show a tiny red dot/circle before the name, for `null` show a tiny gray dot
    - When `attending === true`: no change (normal appearance)
    - This makes non-attending users visually faded in the drag-and-drop group assignment

    **H. Update UnassignedPool** (`src/components/admin/UnassignedPool.tsx`):
    - `UserData` interface: add `attending?: boolean | null`
    - Pass `attending={user?.attending}` to UserCard

    **I. Update GroupBucket** (`src/components/admin/GroupBucket.tsx`):
    - `UserData` interface: add `attending?: boolean | null`
    - Pass `attending={user?.attending}` to UserCard
  </action>
  <verify>
    - `npm run build` succeeds with no TypeScript errors
    - AttendingToggle component renders on dashboard (Ja/Nei buttons)
    - Admin users page shows attending column
    - Admin groups page UserCards show opacity for non-attending users
  </verify>
  <done>
    - Dashboard shows attendance toggle for all users with Ja/Nei buttons
    - Clicking Ja or Nei calls server action and updates UI optimistically
    - Admin users page displays attending status as badge (Kommer/Kommer ikke/Ikke svart)
    - Admin group assignment view fades non-attending users (opacity-50) with colored dot indicators
  </done>
</task>

</tasks>

<verification>
1. `npm run build` completes without errors
2. Dashboard page loads and shows AttendingToggle card
3. Admin users page shows attending status column
4. Admin groups page shows faded UserCards for non-attending users
</verification>

<success_criteria>
- Users can toggle attendance from dashboard (Ja/Nei)
- Attendance persists in database (profiles.attending column)
- Admin users page clearly shows each user's attendance status
- Admin group assignment visually distinguishes non-attending members
- Mobile-first: all touch targets min 44px, full-width layout
</success_criteria>

<output>
After completion, create `.planning/quick/14-add-participation-toggle-for-wednesday-m/14-SUMMARY.md`
</output>
