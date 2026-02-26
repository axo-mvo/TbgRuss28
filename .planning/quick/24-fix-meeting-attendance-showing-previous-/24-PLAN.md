---
phase: quick-24
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/meetings/[id]/page.tsx
  - src/app/admin/users/page.tsx
  - src/components/admin/UserTable.tsx
autonomous: true
requirements: [fix-meeting-attendance-scoping]
must_haves:
  truths:
    - "Admin viewing a new meeting's Grupper tab sees NO attendance dots (all gray/unanswered) when no one has responded to THAT meeting"
    - "Admin viewing a meeting's Grupper tab sees only attendance responses for THAT specific meeting"
    - "Admin users page shows attendance for the upcoming/active meeting, not stale profiles.attending values"
  artifacts:
    - path: "src/app/admin/meetings/[id]/page.tsx"
      provides: "Meeting-scoped attendance query from meeting_attendance table"
      contains: "meeting_attendance"
    - path: "src/app/admin/users/page.tsx"
      provides: "Meeting-scoped attendance for user table"
      contains: "meeting_attendance"
  key_links:
    - from: "src/app/admin/meetings/[id]/page.tsx"
      to: "meeting_attendance table"
      via: "admin.from('meeting_attendance').select().eq('meeting_id', id)"
      pattern: "meeting_attendance.*meeting_id"
---

<objective>
Fix meeting attendance showing previous meeting data when viewing a new meeting.

Purpose: The admin meeting detail page (Grupper tab) and admin users page both read attendance from the deprecated `profiles.attending` column instead of the per-meeting `meeting_attendance` table. This causes stale attendance responses from previous meetings to appear as green/red dots next to names when viewing a different meeting.

Output: Attendance indicators correctly scoped to the viewed meeting via the `meeting_attendance` table.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Root cause: Two pages query `profiles.attending` (a deprecated global boolean) instead of the meeting-scoped `meeting_attendance` table:

1. `src/app/admin/meetings/[id]/page.tsx` line 39 — fetches `profiles.attending` for user data passed to GroupBuilder/UserCard
2. `src/app/admin/users/page.tsx` line 12 — fetches `profiles.attending` for UserTable

The `meeting_attendance` table (created in migration 021) has columns: `meeting_id`, `user_id`, `attending` (boolean), with UNIQUE(meeting_id, user_id). This is already used correctly on the dashboard page (lines 94-97 of `src/app/dashboard/page.tsx`).

<interfaces>
From src/components/admin/UserCard.tsx:
```typescript
interface UserCardProps {
  id: string
  index: number
  column: string
  userName: string
  userRole: string
  attending?: boolean | null  // This receives the value — must be meeting-scoped
  hasConflict: boolean
  locked: boolean
  isMobile?: boolean
  onAssign?: () => void
}
```

From src/components/admin/MeetingTabs.tsx:
```typescript
interface UserData {
  id: string
  full_name: string
  role: string
  attending?: boolean | null  // Passed through to GroupBuilder -> UserCard
}
```

From src/components/admin/UserTable.tsx:
```typescript
type UserWithLinks = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: 'youth' | 'parent' | 'admin'
  attending: boolean | null  // Used for AttendanceBadge
  created_at: string
  parent_youth_links: ParentYouthLink[]
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix meeting detail page to use meeting_attendance table</name>
  <files>src/app/admin/meetings/[id]/page.tsx</files>
  <action>
In `src/app/admin/meetings/[id]/page.tsx`, add a query for meeting-scoped attendance and merge it into the user data:

1. In the `Promise.all` block, add a new parallel query:
   ```typescript
   admin.from('meeting_attendance').select('user_id, attending').eq('meeting_id', id)
   ```

2. After the Promise.all results, build an attendance map:
   ```typescript
   const attendanceRows = attendanceResult.data ?? []
   const attendanceMap = new Map<string, boolean>()
   for (const row of attendanceRows) {
     attendanceMap.set(row.user_id, row.attending)
   }
   ```

3. Remove `attending` from the profiles select on line 39. Change:
   ```
   .select('id, full_name, role, attending')
   ```
   to:
   ```
   .select('id, full_name, role')
   ```

4. Before passing `allUsers` to the MeetingTabs component, map in the per-meeting attendance:
   ```typescript
   const usersWithAttendance = allUsers.map(u => ({
     ...u,
     attending: attendanceMap.get(u.id) ?? null,
   }))
   ```

5. Pass `usersWithAttendance` instead of `allUsers` to MeetingTabs (the `users` prop on line 157).

This ensures UserCard dots reflect attendance for THIS meeting only, not the deprecated global `profiles.attending` field.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no type errors. Visually confirm: open a new meeting in admin, Grupper tab should show gray dots (unanswered) for all users since no one has responded to that meeting.
  </verify>
  <done>
Admin meeting detail Grupper tab shows attendance dots from the meeting_attendance table scoped to the current meeting's ID. A new meeting with no responses shows all gray (unanswered) dots.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix admin users page to show meeting-scoped attendance</name>
  <files>src/app/admin/users/page.tsx, src/components/admin/UserTable.tsx</files>
  <action>
In `src/app/admin/users/page.tsx`:

1. Import `createAdminClient` (already imported indirectly via supabase/server, but need admin for meeting_attendance):
   ```typescript
   import { createAdminClient } from '@/lib/supabase/admin'
   ```

2. Fetch the upcoming or active meeting to scope attendance. Add after the existing queries:
   ```typescript
   const admin = createAdminClient()
   const { data: currentMeeting } = await admin
     .from('meetings')
     .select('id')
     .in('status', ['upcoming', 'active'])
     .order('created_at', { ascending: false })
     .limit(1)
     .maybeSingle()
   ```

3. If a current meeting exists, fetch its attendance:
   ```typescript
   let attendanceMap = new Map<string, boolean>()
   if (currentMeeting) {
     const { data: attendanceRows } = await admin
       .from('meeting_attendance')
       .select('user_id, attending')
       .eq('meeting_id', currentMeeting.id)
     for (const row of attendanceRows ?? []) {
       attendanceMap.set(row.user_id, row.attending)
     }
   }
   ```

4. Remove `attending` from the profiles select on line 12. Change:
   ```
   id, full_name, email, phone, role, attending, created_at,
   ```
   to:
   ```
   id, full_name, email, phone, role, created_at,
   ```

5. Map attendance into user data before passing to UserTable:
   ```typescript
   const usersWithAttendance = (users ?? []).map(u => ({
     ...u,
     attending: attendanceMap.get(u.id) ?? null,
   }))
   ```

6. Pass `usersWithAttendance` to `<UserTable users={usersWithAttendance} .../>`.

No changes needed in UserTable.tsx or UserCard.tsx — they already accept `attending: boolean | null` and render correctly. The fix is purely in the data layer.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no type errors. The admin users page should show attendance badges scoped to the current upcoming/active meeting, or "Ikke svart" for all users if no upcoming/active meeting exists.
  </verify>
  <done>
Admin users page AttendanceBadge reflects per-meeting attendance from the meeting_attendance table. When no upcoming/active meeting exists, all users show "Ikke svart" (null attendance). The deprecated profiles.attending column is no longer read by any page.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- No remaining references to `profiles.attending` in src/ files (grep confirms)
- Admin meeting detail Grupper tab: new meeting shows all gray dots, meeting with responses shows correct per-meeting dots
- Admin users page: shows attendance for current upcoming/active meeting only
</verification>

<success_criteria>
- Attendance dots in admin meeting Grupper tab are scoped to the viewed meeting via meeting_attendance table
- Admin users page attendance badges are scoped to current upcoming/active meeting
- No TypeScript errors
- No references to the deprecated profiles.attending column in page/component data fetching
</success_criteria>

<output>
After completion, create `.planning/quick/24-fix-meeting-attendance-showing-previous-/24-SUMMARY.md`
</output>
