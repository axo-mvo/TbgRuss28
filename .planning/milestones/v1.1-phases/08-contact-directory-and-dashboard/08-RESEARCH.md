# Phase 8: Contact Directory and Dashboard - Research

**Researched:** 2026-02-26
**Domain:** Dashboard restructuring, contact directory, meeting-state-aware UI, per-meeting attendance
**Confidence:** HIGH

## Summary

Phase 8 transforms the participant dashboard from a single-meeting-focused view into a multi-purpose hub that always shows a searchable contact directory and adapts its content based on meeting state (upcoming, active, or no meeting). The core technical challenges are: (1) restructuring the dashboard page to be meeting-state-aware, (2) building a searchable contact directory with two views (youth-centered and flat everyone), (3) migrating attendance from a global `profiles.attending` boolean to a per-meeting `meeting_attendance` table (SCOPE-02), and (4) showing previous meetings with summary stats on the dashboard.

The existing codebase already has most of the building blocks: a `SearchInput` component, a `RegisteredUsersOverview` component with the youth-expand-to-parents pattern, an `AttendingToggle` component, meeting data from the v1.1 schema, and `Card`/`Badge`/`EmptyState` UI primitives. The primary work is restructuring and extending what exists rather than building from scratch.

**Primary recommendation:** Use server-side meeting state detection (single Supabase query in the dashboard page) to conditionally render three dashboard variants, build the contact directory as a client component wrapping the existing search + list patterns, and create a new `meeting_attendance` junction table for per-meeting attendance tracking.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIR-01 | Dashboard shows a searchable contact directory as the main view | Architecture Pattern 1 (ContactDirectory component), existing SearchInput reuse, admin client for cross-profile reads |
| DIR-02 | Youth-centered view: expand a youth to see linked parents with contact info | Existing RegisteredUsersOverview pattern with `<details>` expand, extend with phone/email contact info |
| DIR-03 | Flat "everyone" view: all members searchable alphabetically by name | New flat list view with tab toggle, sort by full_name, show role badge + contact links |
| DIR-04 | Contact info shows name, phone, email with tap-to-call and tap-to-email links | `tel:` and `mailto:` href patterns, 44px touch targets, profiles already have phone and email columns |
| SCOPE-02 | Attendance (kommer/kommer ikke) is tracked per meeting, not globally | New `meeting_attendance` table (meeting_id, user_id, attending), migration from profiles.attending, updated server actions |
| DASH-01 | Dashboard reflects current state: upcoming meeting card, active meeting stations, or no-meeting directory view | Server-side meeting state detection, three conditional render branches in dashboard page |
| DASH-02 | Previous meetings are browsable from the dashboard with date, venue, and summary stats | Query completed meetings, compact list with MeetingCard-style rendering, link to meeting detail |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.x | App Router, server components, server actions | Already installed, SSR dashboard page pattern established |
| React | 19.2.x | Client components, useTransition for optimistic attendance | Already installed, useActionState for form patterns |
| @supabase/supabase-js | 2.97.x | Database queries, admin client for cross-profile reads | Already installed, all data access patterns established |
| Tailwind CSS | v4 | @theme directive styling, mobile-first responsive | Already installed, design tokens defined in globals.css |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | 0.8.x | Server-side Supabase client creation | Already installed, used in all server components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Admin client for directory data | New RLS policy allowing all authenticated users to read profiles | RLS policy is cleaner long-term but the admin client pattern is already established in the dashboard; recommend adding RLS policy as part of this phase for the directory specifically |
| Client-side search filtering | Server-side search with ILIKE | With ~80 users, client-side filtering is simpler and faster (no server round-trips per keystroke); server-side only needed at 500+ users |

**Installation:**
```bash
# No new dependencies needed -- zero new npm packages (project decision)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/dashboard/
│   └── page.tsx                      # Restructured: meeting-state-aware layout
├── components/dashboard/
│   ├── ContactDirectory.tsx           # NEW: searchable directory with tab toggle
│   ├── YouthDirectoryView.tsx         # NEW: youth-centered expand view (extracted from RegisteredUsersOverview)
│   ├── EveryoneDirectoryView.tsx      # NEW: flat alphabetical view
│   ├── ContactActions.tsx             # NEW: tap-to-call/email action links
│   ├── UpcomingMeetingCard.tsx         # NEW: participant-facing meeting card with attendance
│   ├── PreviousMeetingsList.tsx        # NEW: compact list of past meetings
│   ├── AttendingToggle.tsx            # MODIFIED: per-meeting attendance (meeting_id prop)
│   ├── RegisteredUsersOverview.tsx     # DEPRECATED: replaced by ContactDirectory
│   └── ParentInviteBanner.tsx         # KEPT: unchanged
├── lib/actions/
│   ├── auth.ts                        # MODIFIED: updateAttending accepts meetingId
│   └── attendance.ts                  # NEW (optional): dedicated attendance actions
└── supabase/migrations/
    └── 021_meeting_attendance.sql     # NEW: per-meeting attendance table + migration
```

### Pattern 1: Meeting-State-Aware Dashboard
**What:** The dashboard server component detects the current meeting state and conditionally renders different content sections.
**When to use:** When the same page URL must show different content based on backend state.
**Example:**
```typescript
// src/app/dashboard/page.tsx (server component)
// Step 1: Fetch meeting state
const { data: upcomingMeeting } = await supabase
  .from('meetings')
  .select('id, title, date, time, venue, status')
  .eq('status', 'upcoming')
  .maybeSingle()

const { data: activeMeeting } = await supabase
  .from('meetings')
  .select('id, title, status')
  .eq('status', 'active')
  .maybeSingle()

// Step 2: Conditional rendering
// - If activeMeeting exists AND user has locked group: show stations (existing behavior)
// - If upcomingMeeting exists: show upcoming meeting card + attendance + directory
// - If neither: show directory + previous meetings only
```

### Pattern 2: Client-Side Search with Tab Toggle
**What:** A client component that holds search state and a view toggle (youth-centered vs everyone), filtering data passed from the server.
**When to use:** Small dataset (<500 items) where filtering latency should be zero.
**Example:**
```typescript
// ContactDirectory.tsx (client component)
'use client'
import { useState } from 'react'
import SearchInput from '@/components/ui/SearchInput'

type ViewMode = 'youth' | 'everyone'

export default function ContactDirectory({ youth, everyone }: Props) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('youth')

  const normalizedSearch = search.toLowerCase().trim()
  // Filter applied to whichever view is active
  // Youth view: filter by youth name or parent name
  // Everyone view: filter by name
}
```

### Pattern 3: Per-Meeting Attendance with Junction Table
**What:** A `meeting_attendance` table replacing the global `profiles.attending` boolean, with a server action that upserts attendance per meeting.
**When to use:** When attendance must be tracked independently for each meeting (SCOPE-02).
**Example:**
```sql
-- meeting_attendance junction table
CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attending BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);
```

### Pattern 4: Contact Action Links (Mobile-First)
**What:** Inline `tel:` and `mailto:` links that respect 44px minimum touch targets on mobile.
**When to use:** Displaying phone and email as tappable action links.
**Example:**
```typescript
// ContactActions.tsx
function ContactActions({ phone, email }: { phone: string | null; email: string }) {
  return (
    <div className="flex gap-2 mt-1">
      {phone && (
        <a href={`tel:+47${phone}`} className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm text-teal-primary">
          <PhoneIcon className="h-4 w-4" />
          {phone}
        </a>
      )}
      <a href={`mailto:${email}`} className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm text-teal-primary">
        <EmailIcon className="h-4 w-4" />
        {email}
      </a>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Fetching profiles with RLS client on non-admin users:** The profiles table only allows `id = auth.uid()` for non-admins. Directory data MUST use `createAdminClient()` or a new RLS policy must be added. Attempting to query other profiles with the regular client will return empty results silently.
- **Global attendance boolean for multi-meeting:** The existing `profiles.attending` column is global. Using it for per-meeting attendance would break when a new meeting is created (previous attendance state would carry over). Must use a junction table.
- **Fetching all profiles on every search keystroke:** With ~80 users, fetch once in the server component and pass to the client. Do not make a server action call per keystroke.
- **Nested async calls in the dashboard page:** The dashboard already does many sequential queries. Use `Promise.all()` for independent queries (meeting state, profiles, links, attendance) to reduce waterfall latency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search filtering | Custom search algorithm | Simple `.toLowerCase().includes()` on full_name | 80 users, no need for fuzzy matching or indexing |
| Tab component | Custom tab state management | Two-button toggle with `useState<'youth' \| 'everyone'>` | Minimal UI, no need for a tab library |
| Phone number formatting | Complex formatter | Display raw 8-digit string, prefix `+47` in `tel:` href only | Norwegian 8-digit numbers are already clean |
| Attendance upsert | Manual check-then-insert/update | Postgres `ON CONFLICT ... DO UPDATE` via `.upsert()` | Atomic, handles both insert and update in one call |
| Date formatting | Custom date formatter | `toLocaleDateString('nb-NO', {...})` | Already used in MeetingCard, consistent Norwegian formatting |

**Key insight:** The contact directory is a read-heavy, small-dataset feature. Every "advanced" solution (server-side search, pagination, virtual scrolling) is unnecessary overhead for ~80 users. Simple client-side filtering of server-fetched data is the right approach.

## Common Pitfalls

### Pitfall 1: RLS Blocking Directory Reads for Non-Admin Users
**What goes wrong:** The contact directory shows empty or only the user's own profile because RLS on `profiles` restricts non-admin SELECT to `id = auth.uid()`.
**Why it happens:** The v1.0 RLS was designed for a meeting app where users only needed their own profile. A directory feature requires reading all profiles.
**How to avoid:** Either (a) use `createAdminClient()` server-side to bypass RLS (current pattern in dashboard), or (b) add an RLS policy: `CREATE POLICY "Authenticated users can view all profiles for directory" ON profiles FOR SELECT TO authenticated USING (true)`. Option (a) is simpler and follows the established pattern. Option (b) is cleaner but has security implications (any authenticated user can read all emails/phones via the Supabase client directly).
**Warning signs:** Directory shows 0 results or only 1 result for non-admin users.
**Recommendation:** Use `createAdminClient()` in the server component (established pattern). The directory data is fetched server-side and passed as props — users never get direct Supabase client access to other profiles.

### Pitfall 2: Stale Attendance After Meeting Changes
**What goes wrong:** User marks "attending" on meeting A, meeting A completes, meeting B is created — user's attendance toggle still shows their old answer.
**Why it happens:** If attendance is stored globally on `profiles.attending`, it persists across meetings.
**How to avoid:** Use a per-meeting `meeting_attendance` junction table. When rendering the attendance toggle, query attendance for the specific upcoming meeting. No attendance row = "not responded yet".
**Warning signs:** Attendance counts carry over from previous meetings.

### Pitfall 3: Dashboard Flicker on Meeting State Transition
**What goes wrong:** When admin activates or completes a meeting, the participant dashboard doesn't update until they manually refresh.
**Why it happens:** `revalidatePath('/dashboard')` is already called in `activateMeeting` and `completeMeeting` actions, but the user's browser may have a stale cached page.
**How to avoid:** The existing `revalidatePath('/dashboard')` calls in meeting lifecycle actions should handle this. For real-time awareness, the dashboard could subscribe to meeting status changes, but this adds complexity for a rare event (meeting transitions happen 2-3 times per meeting). The simpler approach is acceptable — users will see updated content on their next page load or navigation.
**Warning signs:** User sees "upcoming meeting" card after admin has activated the meeting.

### Pitfall 4: Missing Phone/Email Data
**What goes wrong:** Contact directory shows name but no phone or email for some users.
**Why it happens:** The `phone` column was added in migration 015 and `email` is required, but older user registrations before the phone field was added may have null phones. The registration form requires phone since the field was added, but there may be edge cases.
**How to avoid:** Always handle null phone gracefully (show email only). Display a "Ikke oppgitt" placeholder or simply omit the phone action link when null.
**Warning signs:** Empty contact info rows in the directory.

### Pitfall 5: Meeting-Scoped Group Membership Not Found
**What goes wrong:** Dashboard shows "no group" for a user who was assigned to a group in an active meeting.
**Why it happens:** The current dashboard queries `group_members` without filtering by meeting. With multi-meeting groups, a user may have memberships in previous meetings' groups. The query must find the group for the ACTIVE meeting specifically.
**How to avoid:** When an active meeting exists, join `group_members` -> `groups` -> filter by `groups.meeting_id = activeMeeting.id`.
**Warning signs:** User sees "Du er ikke tildelt gruppe ennå" despite being assigned.

## Code Examples

### Fetching Meeting State (Server Component)
```typescript
// Parallel fetch of meeting states (eliminates waterfall)
const [upcomingResult, activeResult, previousResult] = await Promise.all([
  supabase.from('meetings').select('id, title, date, time, venue').eq('status', 'upcoming').maybeSingle(),
  supabase.from('meetings').select('id, title').eq('status', 'active').maybeSingle(),
  supabase.from('meetings').select('id, title, date, venue, created_at').eq('status', 'completed').order('date', { ascending: false }),
])

const upcomingMeeting = upcomingResult.data
const activeMeeting = activeResult.data
const previousMeetings = previousResult.data ?? []
```

### Per-Meeting Attendance Upsert (Server Action)
```typescript
export async function updateMeetingAttendance(
  meetingId: string,
  attending: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('meeting_attendance')
    .upsert(
      { meeting_id: meetingId, user_id: user.id, attending, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id,user_id' }
    )

  if (error) return { error: 'Kunne ikke oppdatere oppmøtestatus' }
  revalidatePath('/dashboard')
  return {}
}
```

### Meeting Attendance Migration
```sql
-- 021_meeting_attendance.sql
-- Per-meeting attendance tracking (SCOPE-02)
-- Replaces global profiles.attending with meeting-scoped attendance

CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attending BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view attendance (needed for dashboard counts)
CREATE POLICY "Authenticated users can view meeting attendance"
  ON meeting_attendance FOR SELECT
  TO authenticated
  USING (true);

-- Users can upsert their own attendance
CREATE POLICY "Users can manage own attendance"
  ON meeting_attendance FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attendance"
  ON meeting_attendance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
  ON meeting_attendance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Performance index
CREATE INDEX idx_meeting_attendance_meeting_id ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_user_id ON meeting_attendance(user_id);

-- Migrate existing profiles.attending data to the first meeting (if any upcoming/active meeting exists)
-- This is a data-preserving migration: existing attendance answers are not lost
DO $$
DECLARE
  v_meeting_id UUID;
BEGIN
  -- Find the most recent non-completed meeting (upcoming or active)
  SELECT id INTO v_meeting_id
  FROM meetings
  WHERE status IN ('upcoming', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  -- If a current meeting exists and profiles have attendance data, migrate it
  IF v_meeting_id IS NOT NULL THEN
    INSERT INTO meeting_attendance (meeting_id, user_id, attending)
    SELECT v_meeting_id, id, attending
    FROM profiles
    WHERE attending IS NOT NULL;
  END IF;
END $$;

-- Note: profiles.attending column is NOT dropped -- it can be removed in a later cleanup phase
-- This avoids breaking any code that still references it during the transition
```

### Contact Directory Tab Toggle
```typescript
// Two-button segmented control for view switching
<div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
  <button
    onClick={() => setView('youth')}
    className={`flex-1 min-h-[44px] text-sm font-medium transition-colors ${
      view === 'youth'
        ? 'bg-teal-primary text-white'
        : 'bg-white text-text-muted hover:bg-gray-50'
    }`}
  >
    Ungdommer
  </button>
  <button
    onClick={() => setView('everyone')}
    className={`flex-1 min-h-[44px] text-sm font-medium transition-colors ${
      view === 'everyone'
        ? 'bg-teal-primary text-white'
        : 'bg-white text-text-muted hover:bg-gray-50'
    }`}
  >
    Alle
  </button>
</div>
```

### Meeting-Scoped Group Query
```typescript
// When active meeting exists, find user's group for THAT meeting
if (activeMeeting) {
  const { data: membership } = await supabase
    .from('group_members')
    .select('group:groups!inner(id, name, locked, meeting_id)')
    .eq('user_id', user.id)
    .eq('groups.meeting_id', activeMeeting.id)
    .maybeSingle()
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `profiles.attending` global boolean | `meeting_attendance` junction table | Phase 8 (this phase) | Attendance is per-meeting, supports meeting series |
| Single-state dashboard (always shows stations) | Meeting-state-aware dashboard with three variants | Phase 8 (this phase) | Dashboard adapts: upcoming card, active stations, or directory-only |
| RegisteredUsersOverview (attendance-focused) | ContactDirectory (contact-info-focused with search) | Phase 8 (this phase) | Directory shows phone/email with action links, not just attendance dots |

**Deprecated/outdated:**
- `profiles.attending` column: Replaced by `meeting_attendance` table. Column kept temporarily for backward compatibility but should be removed in a later cleanup.
- `RegisteredUsersOverview` component: Replaced by `ContactDirectory` with richer contact info and search. The expand-youth-to-see-parents pattern is preserved.
- Hardcoded meeting info in `AttendingToggle` ("Fellesmote onsdag kl. 18:00 - Greveskogen VGS"): Must be replaced with dynamic meeting title, date, time, venue from the meetings table.

## Open Questions

1. **Should `profiles.attending` column be dropped in this phase?**
   - What we know: The column will be superseded by `meeting_attendance`. Dropping it would break any code still referencing it.
   - What's unclear: Whether there are any other references beyond the dashboard and auth actions.
   - Recommendation: Keep the column but stop writing to it. Add a comment marking it deprecated. Drop in a future cleanup phase or Phase 9.

2. **Should non-admin users see phone/email of ALL members, or only their linked contacts?**
   - What we know: The requirements (DIR-04) say "Contact info shows name, phone, email with tap-to-call and tap-to-email links" without restricting visibility. The use case is a small closed group (~80 people) who all know each other.
   - What's unclear: Privacy preference for showing phone numbers to all members.
   - Recommendation: Show phone and email for all members (the group is small and closed). The data is already accessible to admins. If privacy is a concern, this can be revisited later with a "hide my phone" toggle.

3. **Previous meetings on dashboard: just a list, or expandable with stats?**
   - What we know: DASH-02 says "Previous meetings are browsable from the dashboard with date, venue, and summary stats."
   - What's unclear: What "summary stats" means — attendance count? Number of stations? Number of messages?
   - Recommendation: Show date, venue, and attendance count (X deltakere). Keep it simple — Phase 9 handles the full meeting history browsing experience.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/app/dashboard/page.tsx`, `src/components/dashboard/`, `src/lib/actions/`, `supabase/migrations/` — full audit of current patterns
- Supabase documentation patterns: `.upsert()` with `onConflict`, RLS policies, junction tables — verified against existing migration patterns in the project

### Secondary (MEDIUM confidence)
- Mobile touch target guidelines: 44px minimum from existing project patterns (already used throughout the codebase)
- `tel:` and `mailto:` URI schemes: Standard HTML5 patterns, well-supported on iOS Safari and Android Chrome

### Tertiary (LOW confidence)
- None — all findings are based on existing codebase patterns and standard web development practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all patterns exist in codebase
- Architecture: HIGH - Clear restructuring of existing components with well-understood patterns
- Pitfalls: HIGH - All identified pitfalls come from direct codebase analysis (RLS policies, schema, existing queries)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable — no external dependencies or fast-moving libraries)
