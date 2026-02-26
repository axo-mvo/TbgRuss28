---
phase: quick-27
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/027_meeting_audience.sql
  - src/lib/actions/meeting.ts
  - src/lib/actions/attendance.ts
  - src/app/admin/meetings/new/page.tsx
  - src/app/admin/meetings/new/NewMeetingForm.tsx
  - src/app/admin/meetings/page.tsx
  - src/app/admin/meetings/[id]/page.tsx
  - src/components/admin/MeetingCard.tsx
  - src/components/admin/MeetingDetailsCard.tsx
  - src/app/dashboard/page.tsx
  - src/components/dashboard/UpcomingMeetingCard.tsx
  - src/components/dashboard/AttendingToggle.tsx
  - src/components/dashboard/PreviousMeetingsList.tsx
autonomous: true
requirements: [AUDIENCE-01, AUDIENCE-02, AUDIENCE-03]
must_haves:
  truths:
    - "Admin can create a meeting with audience set to everyone, youth, or parent"
    - "Youth-admin only sees Everyone and Youth audience options; Parent-admin only sees Everyone and Parent options"
    - "Admin meetings list is filtered by admin's role (youth-admin sees everyone+youth, parent-admin sees everyone+parent)"
    - "Dashboard shows targeted meetings fully interactive for matching role, greyed-out with label for non-matching role"
    - "Non-targeted users cannot RSVP to meetings not targeting their role"
    - "Multiple upcoming meetings are now allowed (partial unique index removed)"
    - "Everyone meetings behave exactly as before for all users"
  artifacts:
    - path: "supabase/migrations/027_meeting_audience.sql"
      provides: "audience column, index removal, RLS updates"
    - path: "src/lib/actions/meeting.ts"
      provides: "createMeeting with audience param, removed single-upcoming check"
    - path: "src/lib/actions/attendance.ts"
      provides: "Audience-aware attendance validation"
  key_links:
    - from: "src/app/admin/meetings/new/NewMeetingForm.tsx"
      to: "src/lib/actions/meeting.ts"
      via: "audience field in FormData"
      pattern: "formData.get\\('audience'\\)"
    - from: "src/app/dashboard/page.tsx"
      to: "meetings.audience column"
      via: "role-based conditional rendering"
      pattern: "audience.*role"
---

<objective>
Add audience targeting to meetings so admins can create meetings for specific groups (everyone, youth only, parents only) with role-based visibility filtering across admin panel and dashboard.

Purpose: Enable separate youth-only and parent-only meetings while keeping "everyone" meetings as default behavior.
Output: Migration SQL, updated server actions, audience-aware admin UI, audience-aware dashboard UI.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/actions/meeting.ts
@src/lib/actions/attendance.ts
@src/app/admin/meetings/new/NewMeetingForm.tsx
@src/app/admin/meetings/new/page.tsx
@src/app/admin/meetings/page.tsx
@src/app/admin/meetings/[id]/page.tsx
@src/components/admin/MeetingCard.tsx
@src/components/admin/MeetingDetailsCard.tsx
@src/app/dashboard/page.tsx
@src/components/dashboard/UpcomingMeetingCard.tsx
@src/components/dashboard/AttendingToggle.tsx
@src/components/dashboard/PreviousMeetingsList.tsx
@supabase/migrations/020_meetings_migration.sql

<interfaces>
<!-- Key patterns the executor needs -->

From src/lib/actions/meeting.ts:
```typescript
// verifyAdmin returns userId on success, error string on failure
async function verifyAdmin(): Promise<{ userId: string } | { error: string }>

// createMeeting uses useActionState-compatible signature
export async function createMeeting(
  prevState: { error?: string; id?: string } | null,
  formData: FormData
): Promise<{ error?: string; id?: string }>

// Uses createAdminClient() for DB operations bypassing RLS
```

From src/app/admin/meetings/page.tsx:
```typescript
// Currently fetches ALL meetings via supabase (RLS-filtered)
// Splits into upcomingMeeting (single) and previousMeetings
// Must change to support multiple upcoming meetings filtered by admin role
```

From src/app/dashboard/page.tsx:
```typescript
// Fetches profile with role, upcoming meeting, active meeting, previous meetings
// Profile has: full_name, role, parent_invite_code, is_admin, avatar_url
// role is 'youth' | 'parent' (admin role no longer used, is_admin flag instead)
```

From src/components/admin/MeetingCard.tsx:
```typescript
interface Meeting {
  id: string; title: string; status: string;
  date: string | null; time: string | null; venue: string | null;
  created_at: string
}
// Will need to add: audience?: string
```

Current meetings table (from migration 020):
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  date DATE, time TIME, venue TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Partial unique index enforcing single upcoming:
CREATE UNIQUE INDEX idx_one_upcoming_meeting ON meetings ((true)) WHERE status = 'upcoming';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration and server action updates</name>
  <files>
    supabase/migrations/027_meeting_audience.sql
    src/lib/actions/meeting.ts
    src/lib/actions/attendance.ts
  </files>
  <action>
**Migration file** `supabase/migrations/027_meeting_audience.sql`:

1. Add `audience` column to `meetings` table:
   ```sql
   ALTER TABLE meetings ADD COLUMN audience TEXT NOT NULL DEFAULT 'everyone'
     CHECK (audience IN ('everyone', 'youth', 'parent'));
   ```

2. Drop the partial unique index that enforces single upcoming meeting:
   ```sql
   DROP INDEX IF EXISTS idx_one_upcoming_meeting;
   ```

3. Add performance index on audience for filtering:
   ```sql
   CREATE INDEX idx_meetings_audience ON meetings(audience);
   ```

4. Update RLS on `meeting_attendance` to prevent non-targeted users from RSVPing to meetings not targeting their role. Add a policy:
   ```sql
   -- Users can only insert/update attendance for meetings targeting their role or 'everyone'
   CREATE POLICY "Users can only attend targeted meetings"
     ON meeting_attendance FOR INSERT
     TO authenticated
     USING (true)
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM meetings m
         JOIN profiles p ON p.id = auth.uid()
         WHERE m.id = meeting_id
         AND (m.audience = 'everyone' OR m.audience = p.role)
       )
     );
   ```
   Also add the same check for UPDATE on meeting_attendance. Check if there are existing INSERT/UPDATE policies on meeting_attendance first and adjust accordingly (the app currently uses admin client for attendance upserts, so these RLS policies are defense-in-depth).

Do NOT add RLS restrictions on groups/group_members for this task -- that can be handled later since group assignment is admin-controlled.

**Server action updates in `src/lib/actions/meeting.ts`**:

1. Update `verifyAdmin()` to also return the admin's `role`:
   ```typescript
   async function verifyAdmin(): Promise<{ userId: string; role: string } | { error: string }> {
     // ... existing auth check ...
     const { data: callerProfile } = await supabase
       .from('profiles')
       .select('is_admin, role')
       .eq('id', user.id)
       .single()
     if (!callerProfile?.is_admin) return { error: 'Ikke autorisert' }
     return { userId: user.id, role: callerProfile.role }
   }
   ```

2. Update `createMeeting()`:
   - Extract `audience` from formData: `const audience = (formData.get('audience') as string) || 'everyone'`
   - Validate audience is one of 'everyone', 'youth', 'parent'
   - Validate against admin's role: youth-admin cannot create 'parent' audience, parent-admin cannot create 'youth' audience. Use `auth.role` from verifyAdmin.
   - **REMOVE** the existing check for "already has upcoming meeting" (lines 62-69 that query for existing upcoming meeting and return error). Multiple upcoming meetings are now allowed.
   - Include `audience` in the insert: `{ title, date, time, venue, status: 'upcoming', audience }`

3. Update `updateMeeting()`:
   - Also accept and save `audience` from formData (so admins can change audience when editing meeting details).
   - Same role-based validation as createMeeting.

**Server action updates in `src/lib/actions/attendance.ts`**:

4. Update `updateMeetingAttendance()`:
   - After authenticating user, fetch the meeting's audience and the user's role.
   - If `meeting.audience !== 'everyone' && meeting.audience !== userProfile.role`, return `{ error: 'Du kan ikke melde deg pa dette motet' }`.
   - Use admin client for the meeting fetch (already imported).
  </action>
  <verify>
    TypeScript compiles: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit 2>&1 | head -30`
  </verify>
  <done>
    Migration SQL file exists with audience column, dropped unique index, and attendance RLS.
    createMeeting accepts audience, validates against admin role, allows multiple upcoming meetings.
    updateMeetingAttendance rejects RSVPs from non-targeted users.
  </done>
</task>

<task type="auto">
  <name>Task 2: Admin panel audience UI</name>
  <files>
    src/app/admin/meetings/new/page.tsx
    src/app/admin/meetings/new/NewMeetingForm.tsx
    src/app/admin/meetings/page.tsx
    src/app/admin/meetings/[id]/page.tsx
    src/components/admin/MeetingCard.tsx
    src/components/admin/MeetingDetailsCard.tsx
  </files>
  <action>
**NewMeetingForm.tsx** -- Add audience selector:

1. Update the `page.tsx` server component to also fetch the admin's role and pass it as prop:
   ```typescript
   // In page.tsx:
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
   const adminRole = profile?.role ?? 'youth'
   return <NewMeetingForm defaultTitle={defaultTitle} adminRole={adminRole} />
   ```

2. In `NewMeetingForm.tsx`, add `adminRole: string` to props interface.

3. Add a three-button toggle group for audience BELOW the venue field, ABOVE the submit button. Use a hidden input `name="audience"` with controlled state. Style as a row of 3 buttons similar to the AttendingToggle pattern (rounded-lg border, selected gets colored bg):
   - "Alle" (value: `everyone`) -- always available, default selected. Style: teal when selected.
   - "Kun ungdom" (value: `youth`) -- only shown if `adminRole === 'youth'`. Style: teal when selected.
   - "Kun foreldre" (value: `parent`) -- only shown if `adminRole === 'parent'`. Style: coral when selected.

   Use `useState('everyone')` for selected audience. Add a Label "Malgruppe" above the toggle.

**Admin meetings list** (`/admin/meetings/page.tsx`):

4. Fetch the admin's role (same pattern as above).

5. Filter meetings by admin's role:
   - Youth-admin sees meetings where `audience IN ('everyone', 'youth')`.
   - Parent-admin sees meetings where `audience IN ('everyone', 'parent')`.
   - Use `.in('audience', ['everyone', adminRole])` on the Supabase query.

6. Change from showing a single upcoming meeting to showing ALL upcoming meetings (since multiple are now allowed). Replace the `upcomingMeeting` singular variable with `upcomingMeetings` array. Map over them just like previousMeetings, using `variant="upcoming"` for each.

7. Always show the "Nytt mote" button (remove the conditional that hides it when an upcoming meeting exists).

**MeetingCard.tsx** -- Show audience label:

8. Add `audience?: string` to the Meeting interface.

9. For both upcoming and previous variants, show a small audience badge next to the title when audience is NOT 'everyone':
   - Youth: small badge "Ungdom" with teal color (same as role badge pattern)
   - Parent: small badge "Foreldre" with coral color
   - Use inline span: `<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-primary/10 text-teal-primary">Ungdom</span>` (or coral variant for parent).

**MeetingDetailsCard.tsx** -- Show audience in detail view and edit form:

10. Add `audience` to the meeting interface in MeetingDetailsCard props.

11. In view mode, show audience label next to the status badge (same badge style as MeetingCard).

12. In edit mode, add the same audience toggle as NewMeetingForm. Pass `adminRole` as a new prop. Include a hidden input `name="audience"` so it's submitted with the form. Pre-select the current meeting's audience value.

**Admin meeting detail page** (`/admin/meetings/[id]/page.tsx`):

13. Fetch admin profile role. Pass `adminRole` to `MeetingDetailsCard` as prop.

14. Add role-based access check: if `meeting.audience !== 'everyone' && meeting.audience !== adminRole`, call `notFound()`. This prevents youth-admins from accessing parent-only meeting detail pages and vice versa.
  </action>
  <verify>
    TypeScript compiles: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit 2>&1 | head -30`
  </verify>
  <done>
    Meeting creation form shows audience toggle filtered by admin's role.
    Admin meetings list filtered by role, supports multiple upcoming meetings.
    Meeting cards show audience label badge.
    Meeting detail page blocks access to wrong-audience meetings.
    MeetingDetailsCard shows audience in view and edit modes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Dashboard audience-aware meeting display</name>
  <files>
    src/app/dashboard/page.tsx
    src/components/dashboard/UpcomingMeetingCard.tsx
    src/components/dashboard/AttendingToggle.tsx
    src/components/dashboard/PreviousMeetingsList.tsx
  </files>
  <action>
**Dashboard page** (`src/app/dashboard/page.tsx`):

1. Update meeting queries to fetch `audience` field:
   - Upcoming: `.select('id, title, date, time, venue, audience')` (note: now there can be multiple upcoming meetings!)
   - Active: `.select('id, title, audience')`
   - Previous (completed): `.select('id, title, date, venue, audience')`

2. **Multiple upcoming meetings**: Change from `.maybeSingle()` to fetching all upcoming meetings. Query: `supabase.from('meetings').select('id, title, date, time, venue, audience').eq('status', 'upcoming').order('date', { ascending: true })`.

3. For each upcoming meeting, determine if it targets the current user's role:
   ```typescript
   const isTargeted = (audience: string) => audience === 'everyone' || audience === role
   ```

4. **Upcoming meetings section**: Loop over all upcoming meetings. For each:
   - If `isTargeted(meeting.audience)`: Show `UpcomingMeetingCard` + `AttendingToggle` (current behavior). Need to fetch attendance data per meeting (move attendance fetch into the loop or batch-fetch for all upcoming meetings).
   - If NOT targeted: Show a greyed-out card with meeting details (title, date, time, venue) but NO RSVP toggle. Show a label like "Kun for ungdom" or "Kun for foreldre". Use `opacity-50` and a muted border style.

5. **Batch attendance fetch**: To avoid N+1, fetch attendance for ALL upcoming meeting IDs at once:
   ```typescript
   const upcomingIds = upcomingMeetings.map(m => m.id)
   const { data: allAttendanceRows } = await adminClient
     .from('meeting_attendance')
     .select('meeting_id, user_id, attending')
     .in('meeting_id', upcomingIds)
   ```
   Then compute per-meeting stats from the batch result.

6. **Active meeting**: If `activeMeeting` exists and has audience, check targeting:
   - If targeted OR 'everyone': current behavior (show group, stations, full interactive).
   - If NOT targeted: Show a muted card with meeting title and label "Kun for ungdom" / "Kun for foreldre". No group assignment, no station selector. Use similar greyed-out treatment as upcoming.

7. **Completed meetings**: Pass `audience` and `userRole` to `PreviousMeetingsList`.

**UpcomingMeetingCard.tsx**:

8. Add optional `audience?: string` prop. When audience is `youth` or `parent`, show a small label below the title: "Kun for ungdom" (teal) or "Kun for foreldre" (coral).

**AttendingToggle.tsx**:

9. No changes needed here -- the server action already validates. The dashboard just won't render AttendingToggle for non-targeted meetings.

**PreviousMeetingsList.tsx**:

10. Update interface to include `audience` in meeting objects and accept `userRole: string` prop.

11. For each completed meeting:
    - If targeted (audience === 'everyone' or audience === userRole): render as current Link to `/dashboard/meeting/[id]` with "Se diskusjoner" link.
    - If NOT targeted: render as a plain div (NOT a Link -- no navigation). Show meeting title, date, venue with `opacity-50`. Add a label "Kun for ungdom" / "Kun for foreldre". Remove the "Se diskusjoner" arrow text.

**Audience label helper**: Create a small inline helper or mapping at the top of dashboard page.tsx:
```typescript
const audienceLabels: Record<string, string> = {
  youth: 'Kun for ungdom',
  parent: 'Kun for foreldre',
}
```
  </action>
  <verify>
    TypeScript compiles and dev server builds: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx next build 2>&1 | tail -20`
  </verify>
  <done>
    Dashboard shows all upcoming meetings (not just one).
    Targeted meetings show full interactive card + RSVP toggle.
    Non-targeted meetings show greyed-out card with audience label, no RSVP.
    Active meeting shows greyed-out treatment for non-targeted users.
    Previous meetings list blocks navigation for non-targeted completed meetings.
    "Everyone" meetings behave exactly as before.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no TypeScript errors
2. `npx next build` -- production build succeeds
3. Migration SQL is syntactically valid
4. Manual verification: admin can create meetings with different audiences, dashboard shows correct greyed-out / interactive treatment based on user role
</verification>

<success_criteria>
- Admins can create meetings targeting everyone, youth only, or parents only
- Audience options are restricted by admin's role (youth-admin cannot create parent-only meetings)
- Admin meeting list shows only meetings matching admin's role
- Dashboard shows multiple upcoming meetings with audience-aware display
- Non-targeted meetings appear greyed-out with label, no RSVP toggle
- "Everyone" meetings work identically to current behavior
- Production build succeeds with no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/27-add-audience-targeting-to-meetings-with-/27-SUMMARY.md`
</output>
