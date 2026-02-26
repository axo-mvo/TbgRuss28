# Phase 9: Meeting History - Research

**Researched:** 2026-02-26
**Domain:** Meeting history browsing, read-only discussion viewing, admin consolidated detail view
**Confidence:** HIGH

## Summary

Phase 9 is the final phase of milestone v1.1 and delivers two remaining requirements: DASH-03 (past meeting discussions viewable in read-only mode) and DASH-04 (admin meeting detail view consolidating groups, export, word cloud, and station config per meeting). The codebase is already well-prepared for this phase -- the admin meeting detail page (`/admin/meetings/[id]`) already has a fully functional consolidated view with three tabs (Stasjoner, Grupper, Resultat) including export and word cloud. The PreviousMeetingsList component on the dashboard already renders past meetings but currently shows display-only cards with no links (deliberately avoided in Phase 8 to prevent 404s before this phase).

The primary work is: (1) making PreviousMeetingsList cards tappable links to a new participant-facing meeting history page, (2) creating that meeting history page with read-only station discussions per group, and (3) verifying the existing admin meeting detail view satisfies DASH-04 requirements. The ChatRoom component already supports a `readOnly` prop and is used for completed stations during active meetings -- the same pattern applies to past meeting history. The station page (`/dashboard/station/[sessionId]`) already renders in read-only mode for completed sessions. The key challenge is allowing users to browse stations and groups from a PAST meeting, not just the active one.

**Primary recommendation:** Create a new `/dashboard/meeting/[id]` route for participant-facing meeting history, reuse the existing station session + ChatRoom read-only pattern for viewing past discussions, and convert PreviousMeetingsList from display-only cards to tappable links. The admin side (DASH-04) is already complete via the existing `/admin/meetings/[id]` page with MeetingTabs.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-03 | Past meeting discussions are viewable in read-only mode (reuses existing ChatRoom readOnly) | Architecture Pattern 1 (participant meeting history page), Pattern 2 (station picker for past meetings), existing ChatRoom readOnly prop + MessageList/MessageBubble components, existing loadMessages server action |
| DASH-04 | Admin meeting detail view consolidates groups, export, word cloud, and station config per meeting | Already complete -- existing `/admin/meetings/[id]` page with MeetingTabs (Stasjoner, Grupper, Resultat tabs), MeetingResultsTab with export + WordCloud. Needs verification only, no new code required |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App Router, server components, dynamic routes | Already installed, all routing patterns established |
| React | 19.x | Client components, ChatRoom with readOnly | Already installed, ChatRoom readOnly pattern working |
| @supabase/supabase-js | 2.x | Database queries, admin client | Already installed, all data access patterns established |
| Tailwind CSS | v4 | @theme directive styling, mobile-first | Already installed, design tokens in globals.css |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | 0.x | Server-side Supabase client creation | Already installed, used in all server components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `/dashboard/meeting/[id]` route | Reuse existing `/dashboard/station/[sessionId]` with meetingId param | Existing station page only shows one session; a meeting history page needs to show the full meeting context (all stations, pick a group) before diving into a specific discussion |
| Server component meeting history page | Client-side data fetching with SWR | Unnecessary complexity; server component follows the established pattern and the data is static (completed meetings don't change) |

**Installation:**
```bash
# No new dependencies needed -- zero new npm packages (project decision)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/dashboard/
│   ├── page.tsx                         # MODIFY: PreviousMeetingsList becomes tappable links
│   └── meeting/
│       └── [id]/
│           └── page.tsx                 # NEW: participant meeting history page
├── components/dashboard/
│   ├── PreviousMeetingsList.tsx          # MODIFY: cards become Link elements
│   └── MeetingStationPicker.tsx         # NEW: station+group picker for past meeting
├── components/station/
│   └── ChatRoom.tsx                     # REUSE: already has readOnly prop
├── app/admin/meetings/[id]/
│   └── page.tsx                         # VERIFY: already has consolidated view (DASH-04)
└── components/admin/
    └── MeetingTabs.tsx                  # VERIFY: already has Stasjoner/Grupper/Resultat tabs
```

### Pattern 1: Participant Meeting History Page
**What:** A new server component route (`/dashboard/meeting/[id]`) that shows a completed meeting's details and lets users browse stations by group, viewing read-only discussions.
**When to use:** When a participant taps a previous meeting from the dashboard list.
**Example:**
```typescript
// src/app/dashboard/meeting/[id]/page.tsx (server component)
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'

export default async function MeetingHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ station?: string; group?: string }>
}) {
  const { id } = await params
  const { station: stationParam, group: groupParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch meeting (must be completed)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title, date, venue, status')
    .eq('id', id)
    .eq('status', 'completed')
    .single()

  if (!meeting) notFound()

  // Fetch stations for this meeting
  const { data: stations } = await supabase
    .from('stations')
    .select('id, number, title')
    .eq('meeting_id', id)
    .order('number')

  // Fetch groups for this meeting (for group picker)
  const admin = createAdminClient()
  const { data: groups } = await admin
    .from('groups')
    .select('id, name')
    .eq('meeting_id', id)
    .order('created_at')

  // If station+group selected, fetch the session and messages
  let session = null
  let messages = null
  if (stationParam && groupParam) {
    const { data: sessionData } = await admin
      .from('station_sessions')
      .select('id, status')
      .eq('station_id', stationParam)
      .eq('group_id', groupParam)
      .maybeSingle()

    if (sessionData) {
      session = sessionData
      // Load messages using the same pattern as the station page
      // ... (see Pattern 3 below)
    }
  }

  // Render meeting header + station/group picker + optional ChatRoom
}
```

### Pattern 2: Station/Group Picker for Past Meetings
**What:** A client component that lets users select which station and group discussion to view from a completed meeting. Uses URL search params for navigation so the selection is shareable and back-button-friendly.
**When to use:** When viewing a past meeting's discussions -- user picks station first, then group.
**Example:**
```typescript
// src/components/dashboard/MeetingStationPicker.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  meetingId: string
  stations: Array<{ id: string; number: number; title: string }>
  groups: Array<{ id: string; name: string }>
  selectedStation?: string
  selectedGroup?: string
}

export default function MeetingStationPicker({
  meetingId, stations, groups, selectedStation, selectedGroup,
}: Props) {
  const router = useRouter()

  function selectStation(stationId: string) {
    // Navigate with searchParam, preserving group if set
    const params = new URLSearchParams()
    params.set('station', stationId)
    if (selectedGroup) params.set('group', selectedGroup)
    router.push(`/dashboard/meeting/${meetingId}?${params.toString()}`)
  }

  function selectGroup(groupId: string) {
    if (!selectedStation) return
    const params = new URLSearchParams()
    params.set('station', selectedStation)
    params.set('group', groupId)
    router.push(`/dashboard/meeting/${meetingId}?${params.toString()}`)
  }

  return (
    <div>
      {/* Station grid (same visual style as StationCard) */}
      {/* Group selector (appears after station is picked) */}
      {/* All stations are "completed" status visually */}
    </div>
  )
}
```

### Pattern 3: Reusing ChatRoom in Read-Only Mode for History
**What:** The existing ChatRoom component with `readOnly={true}` is already designed for viewing completed discussions. For past meeting history, it needs messages loaded from a specific session and displayed without any real-time subscription or input.
**When to use:** When displaying a past meeting's station discussion.
**Key insight:** When `readOnly` is true, the `useRealtimeChat` hook skips subscription entirely (`if (readOnly) return`), so there is no WebSocket overhead for viewing history. The ChatRoom renders StationHeader (with "Fullfort" badge), MessageList, and a "Diskusjonen er avsluttet" footer. However, for history viewing, the "Gjenåpne" (reopen) button in the read-only footer should be hidden since the meeting is completed.
**Example:**
```typescript
// In the meeting history page, when session and messages are loaded:
<ChatRoom
  sessionId={session.id}
  userId={user.id}
  userFullName={profile.full_name}
  userRole={profile.role as 'youth' | 'parent'}
  endTimestamp={null}
  stationTitle={station.title}
  stationNumber={station.number}
  stationQuestions={station.questions}
  stationTip={station.tip}
  initialMessages={formattedMessages}
  readOnly={true}
  isStarted={true}
/>
```

### Pattern 4: PreviousMeetingsList with Tappable Links
**What:** Converting the current display-only PreviousMeetingsList cards to `<Link>` elements that navigate to the meeting history page.
**When to use:** On the dashboard, for the "Tidligere moter" section.
**Example:**
```typescript
// Current (Phase 8): display-only <div>
<div key={meeting.id} className="p-3 rounded-lg border border-gray-200 bg-white">
  ...
</div>

// Phase 9: tappable <Link>
<Link
  href={`/dashboard/meeting/${meeting.id}`}
  key={meeting.id}
  className="block p-3 rounded-lg border border-gray-200 bg-white
    hover:border-teal-primary hover:shadow-sm transition-all"
>
  ...
  <span className="text-xs text-teal-primary mt-1 block">Se diskusjoner</span>
</Link>
```

### Anti-Patterns to Avoid
- **Creating a new chat page for history:** Do NOT create a separate ChatRoom-like component for history viewing. The existing ChatRoom with `readOnly={true}` is designed for this exact use case. When readOnly is true, no WebSocket subscription occurs.
- **Loading all messages for all stations at once:** Only load messages for the selected station+group combination. Past meetings may have 6+ stations x 4+ groups = 24+ sessions. Loading all at once would be wasteful.
- **Allowing reopen on past meeting discussions:** The "Gjenåpne" button in ChatRoom's read-only footer should be hidden or disabled when viewing a COMPLETED meeting's history (not just a completed station in an active meeting). Consider adding a `hideReopen` or `meetingCompleted` prop to ChatRoom.
- **Breaking the existing station/[sessionId] page for active meetings:** The existing station page must continue to work for active meeting sessions. The history viewing is a separate route.
- **Skipping group membership check for history:** Even for completed meetings, verify the user is authenticated. RLS already allows any authenticated user to view meetings, stations, and messages. No admin client is needed for read access except for groups (where the admin client is used because the groups table has stricter RLS in some contexts).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Read-only message display | Custom history viewer component | Existing ChatRoom with `readOnly={true}` | Already handles no-input, no-timer, no-realtime, message display |
| Message loading | Custom history message fetcher | Existing `loadMessages` server action | Already fetches messages with profile joins, correct ordering |
| Date formatting | Custom Norwegian date formatter | `toLocaleDateString('nb-NO', {...})` | Already used throughout the app consistently |
| Admin consolidated view | New admin dashboard for meetings | Existing `/admin/meetings/[id]` with MeetingTabs | Already has Stasjoner/Grupper/Resultat tabs with export and word cloud |
| URL-based state for station/group selection | Complex client state management | Next.js `searchParams` | Back-button friendly, shareable, server-rendered |

**Key insight:** This phase is primarily a "wiring" phase that connects existing components in a new context. The ChatRoom, MessageList, MessageBubble, StationHeader, loadMessages, and admin MeetingTabs components are already built and tested. The new code is mostly a server component route and a station/group picker.

## Common Pitfalls

### Pitfall 1: Reopen Button Visible on Past Meeting History
**What goes wrong:** When viewing a completed meeting's discussion history, the "Gjenåpne" (reopen) button appears, and clicking it would attempt to reopen a station in a completed meeting.
**Why it happens:** ChatRoom renders the reopen button whenever `readOnly={true}` and `isStarted={true}`. It does not distinguish between "completed station in active meeting" (reopen is valid) and "station in completed meeting" (reopen should be blocked).
**How to avoid:** Add a prop to ChatRoom (e.g., `hideReopen?: boolean`) or check the meeting status before allowing reopen. The simplest approach: the ReopenDialog's `handleReopen` calls `reopenStation()` which will fail server-side (the Postgres function checks session state), but hiding the button is better UX. Pass `hideReopen={true}` or conditionally omit the reopen button when the meeting is completed.
**Warning signs:** "Gjenåpne" button visible when browsing old meeting history.

### Pitfall 2: Station Session Not Found for Group+Station Combo
**What goes wrong:** User selects a station and group, but no station_session exists for that combination (the group never visited that station during the meeting).
**Why it happens:** Not all groups visit all stations. A group may have only completed 3 of 6 stations before the meeting ended.
**How to avoid:** Query `station_sessions` for the specific `station_id` + `group_id` combination. If no session exists, display a clear "Denne gruppen diskuterte ikke denne stasjonen" (This group did not discuss this station) message instead of a blank screen or error.
**Warning signs:** Blank page or error when selecting certain station+group combinations.

### Pitfall 3: Groups Not Visible to Non-Admin Users via RLS
**What goes wrong:** The group picker shows no groups or the query fails silently because RLS on the `groups` table restricts reads.
**Why it happens:** The `groups` table RLS may restrict non-admin users to only see groups they are a member of, but for history browsing, users need to see ALL groups' discussions (to browse any station+group combination from a past meeting).
**How to avoid:** Use `createAdminClient()` server-side to fetch groups for the meeting history page, following the established pattern from the dashboard and admin pages. The group data is fetched server-side and passed as props -- users never query groups directly.
**Warning signs:** Empty group picker, or only the user's own group visible.

### Pitfall 4: Dashboard PreviousMeetingsList Navigation 404
**What goes wrong:** User taps a previous meeting on the dashboard but gets a 404 because the `/dashboard/meeting/[id]` route does not exist yet.
**Why it happens:** Phase 8 deliberately made PreviousMeetingsList display-only to avoid 404s. If the links are added before the route exists, users will get 404s.
**How to avoid:** Create the `/dashboard/meeting/[id]` route BEFORE converting PreviousMeetingsList to use links. Or do both in the same plan/task.
**Warning signs:** 404 error when tapping a previous meeting.

### Pitfall 5: Message Loading Fails Due to Group Membership Check
**What goes wrong:** `loadMessages` returns empty or errors because it implicitly checks group membership, but the user may not be a member of the group whose discussion they are viewing in history mode.
**Why it happens:** The `messages` table has RLS that checks membership: a user can only read messages from sessions where they are a member of the session's group. For history browsing, users should be able to read ANY group's discussions from past meetings.
**How to avoid:** Use `createAdminClient()` server-side to fetch messages for history viewing, bypassing RLS restrictions. This is safe because the data is fetched in a server component and only rendered as read-only HTML -- no direct client access. Alternatively, load messages directly in the page server component instead of using the `loadMessages` action (which uses the authenticated user's client).
**Warning signs:** Empty message list when viewing discussions from a group the user was NOT a member of.

## Code Examples

Verified patterns from the existing codebase:

### Loading Messages for History (Server-Side with Admin Client)
```typescript
// In /dashboard/meeting/[id]/page.tsx
// Use admin client to bypass RLS for cross-group history viewing
const admin = createAdminClient()

const { data: messagesData } = await admin
  .from('messages')
  .select(`
    id,
    user_id,
    content,
    created_at,
    profiles:user_id (full_name, role)
  `)
  .eq('session_id', session.id)
  .order('created_at', { ascending: true })

const formattedMessages: ChatMessage[] = (messagesData ?? []).map((msg) => {
  const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
  return {
    id: msg.id,
    userId: msg.user_id,
    fullName: profile?.full_name ?? 'Ukjent',
    role: (profile?.role ?? 'youth') as 'youth' | 'parent',
    content: msg.content,
    createdAt: msg.created_at,
    status: 'sent' as const,
  }
})
```

### Finding Session for Station+Group
```typescript
// Query station_session for a specific station and group combo
const { data: sessionData } = await admin
  .from('station_sessions')
  .select('id, status')
  .eq('station_id', selectedStationId)
  .eq('group_id', selectedGroupId)
  .maybeSingle()

// sessionData may be null if the group never visited this station
```

### Meeting History Page Header
```typescript
// Consistent with existing admin meeting detail header pattern
<div className="flex items-center gap-3 mb-6">
  <h1 className="text-2xl font-bold text-text-primary">{meeting.title}</h1>
  <Badge variant="completed">Fullfort</Badge>
</div>

<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 text-sm text-text-muted">
      {/* Calendar icon */}
      <span>{formatDate(meeting.date)}</span>
    </div>
    {meeting.venue && (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        {/* Location icon */}
        <span>{meeting.venue}</span>
      </div>
    )}
  </div>
</div>
```

### Hiding Reopen Button for Completed Meeting History
```typescript
// Option A: Add hideReopen prop to ChatRoom
interface ChatRoomProps {
  // ... existing props
  hideReopen?: boolean  // NEW: hide reopen button for completed meeting history
}

// In ChatRoom render, readOnly footer:
{localReadOnly ? (
  <div className="px-4 py-3 bg-text-muted/10 border-t border-text-muted/10 flex items-center justify-between">
    <span className="text-sm text-text-muted">Diskusjonen er avsluttet</span>
    {!hideReopen && (
      <button type="button" onClick={() => setShowReopenDialog(true)} ...>
        Gjenåpne
      </button>
    )}
  </div>
) : ...}

// Option B: Simply pass readOnly + don't pass stationId (reopen won't work)
// But user still sees the button, which is confusing. Option A is better.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PreviousMeetingsList display-only | Tappable links to meeting history page | Phase 9 (this phase) | Users can browse past meeting discussions |
| No participant-facing meeting history | `/dashboard/meeting/[id]` route with station/group picker | Phase 9 (this phase) | Full read-only browsing of past discussions |
| Admin detail view scattered across pages | Already consolidated in `/admin/meetings/[id]` with tabs | Phase 7 | DASH-04 already satisfied by existing code |

**Deprecated/outdated:**
- Nothing new deprecated in this phase. The `profiles.attending` column was deprecated in Phase 8 but is unrelated to Phase 9.

## Open Questions

1. **Should all users see all groups' discussions, or only their own group?**
   - What we know: The success criteria says "Past meeting discussions are viewable in read-only mode per station per group, reusing the existing ChatRoom component." This implies users can view ANY group's discussion, not just their own. The admin detail page already shows all groups.
   - What's unclear: Whether there is a privacy concern about one group seeing another group's discussion after the meeting.
   - Recommendation: Allow all authenticated users to view all groups' discussions from completed meetings. The app is for a small closed group (~80 people) and the discussions are not private -- they are exported and shared with Claude for analysis. If privacy is a concern, add a filter to only show the user's own group's discussions, but this seems unnecessary for this use case.

2. **Should the admin meeting detail view be changed for DASH-04, or is it already complete?**
   - What we know: The existing `/admin/meetings/[id]` page already has MeetingTabs with three tabs: Stasjoner (station config), Grupper (group management/viewing), and Resultat (word cloud + export). All are meeting-scoped. This matches the DASH-04 requirement: "Admin meeting detail view consolidates groups, export, word cloud, and station config per meeting."
   - What's unclear: Whether there are any missing features. The Stasjoner tab allows editing (StationList + StationEditor) which is appropriate for upcoming/active but should be read-only for completed meetings.
   - Recommendation: Mark DASH-04 as already satisfied by the existing admin meeting detail page. Verify during implementation that the StationList is read-only for completed meetings (the MeetingLifecycleControls and GroupBuilder already handle `meeting.status === 'completed'` for read-only mode). If StationList does not have read-only mode, add it.

3. **Should the back button in ChatRoom (StationHeader) navigate to the meeting history page instead of /dashboard when viewing history?**
   - What we know: StationHeader's back button always navigates to `/dashboard`. When viewing a past meeting's discussion, the user should go back to the meeting history page, not the dashboard.
   - What's unclear: Whether to modify ChatRoom/StationHeader or handle this at the page level.
   - Recommendation: Either (a) add a `backHref` prop to ChatRoom/StationHeader, or (b) render the ChatRoom inline in the meeting history page (not as a full-page component) so the meeting header stays visible. Option (b) is better UX because the user can switch between stations/groups without leaving the page.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/app/dashboard/page.tsx`, `src/components/dashboard/PreviousMeetingsList.tsx`, `src/components/station/ChatRoom.tsx`, `src/app/admin/meetings/[id]/page.tsx`, `src/components/admin/MeetingTabs.tsx`, `src/components/admin/MeetingResultsTab.tsx`, `src/app/dashboard/station/[sessionId]/page.tsx`, `src/lib/actions/station.ts`, `src/lib/hooks/useRealtimeChat.ts`
- Database schema: `supabase/migrations/020_meetings_migration.sql`, `supabase/migrations/021_meeting_attendance.sql`
- Phase 8 research: `.planning/phases/08-contact-directory-and-dashboard/08-RESEARCH.md` (patterns and decisions still apply)

### Secondary (MEDIUM confidence)
- Project decisions from STATE.md: zero new npm dependencies, admin client pattern for cross-profile reads, PreviousMeetingsList deliberately display-only in Phase 8

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all patterns exist in codebase
- Architecture: HIGH - Clear extension of existing patterns (ChatRoom readOnly, server component pages, admin client for data access)
- Pitfalls: HIGH - All identified pitfalls come from direct codebase analysis (RLS policies, ChatRoom reopen behavior, session existence edge cases)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable -- no external dependencies or fast-moving libraries)
