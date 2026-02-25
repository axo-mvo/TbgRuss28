# Phase 7: Admin Meeting Management - Research

**Researched:** 2026-02-26
**Domain:** Admin CRUD, meeting lifecycle, station configuration, per-meeting group management, meeting-scoped export/wordcloud
**Confidence:** HIGH

## Summary

Phase 7 transforms the admin panel from a flat menu (Brukere, Grupper, Ordsky, Eksporter) into a meeting-centric hub. The current `/admin` page links to independent sub-pages; it must become a meetings overview with per-meeting detail pages containing tabbed sections for Stasjoner, Grupper, and Resultat. The existing GroupBuilder component, export API, and WordCloud component are reused but scoped to a specific meeting via `meeting_id` filters.

The database schema from Phase 6 already supports this: `meetings` table exists with status/date/time/venue, `stations.meeting_id` and `groups.meeting_id` FK columns are NOT NULL, and a partial unique index enforces one upcoming meeting. No new npm dependencies are needed -- the existing stack (Next.js 15, React 19, Supabase, @dnd-kit/react, Tailwind v4) covers everything.

**Primary recommendation:** Build three main routes -- `/admin/meetings` (overview), `/admin/meetings/new` (creation form), and `/admin/meetings/[id]` (detail with tabs) -- using server actions for all mutations and the established `verifyAdmin()` + `createAdminClient()` pattern for DB access.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Meeting Creation Flow:** Dedicated page at /admin/meetings/new with date, time, and venue fields. After creation, redirect to the new meeting's detail page for immediate station/group configuration. Block creation when an upcoming meeting already exists -- show "Det finnes allerede et kommende mote" message. "Moter" tab replaces the standalone "Grupper" tab in admin nav -- group management moves into each meeting's detail page.
- **Station Configuration:** Stations displayed as a vertical list on the meeting detail page with inline expand-to-edit. Drag handle for reorder, tap to expand and edit title/questions/tip. Station questions entered as a single textarea (free text, line breaks separate questions). Flexible station count -- admin decides how many stations per meeting (minimum 1). "Legg til stasjon" button at bottom of list to add new stations. Stations locked (read-only) once meeting becomes active -- no mid-discussion edits.
- **Meeting Lifecycle Controls:** Manual activation: "Start mote" button with confirmation dialog on meeting detail page. Prerequisites: activation blocked until at least 1 station and 1 group exist. Manual completion: "Avslutt mote" button with confirmation dialog. Before completing: warn admin if groups are still active ("X grupper er fortsatt aktive. Avslutt likevel?"), then force-close all active sessions. Participants redirected to dashboard with "Motet er avsluttet" on force-close.
- **Admin Meeting Hub:** Meetings overview page: prominent upcoming meeting card at top with quick actions (Rediger, Start), previous meetings listed chronologically below. "Nytt mote" button visible when no upcoming meeting exists. Meeting detail page uses tabbed layout: Stasjoner | Grupper | Resultat. "Resultat" tab combines export download button and word cloud display. Completed meetings open in the same tabbed detail page but in read-only mode -- admin can view stations, groups, export, and word cloud for any past meeting.

### Claude's Discretion
- Exact form field types for date/time/venue inputs
- Tab styling and mobile tab bar implementation
- Drag-and-drop library choice for station reorder
- Loading states and error handling patterns
- How the existing group builder integrates into the meeting detail Grupper tab
- Exact confirmation dialog styling and animation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEET-01 | Admin can create a meeting with date, time, and venue | Meeting creation form at `/admin/meetings/new` using server action, INSERT into `meetings` table, redirect to detail page. DB schema already has date/time/venue columns. |
| MEET-02 | Admin can configure stations per meeting (title, questions, optional tip) | Station CRUD server actions using `createAdminClient()`, INSERT/UPDATE/DELETE on `stations` table with `meeting_id` FK. Stations have `number` (ordering), `title`, `questions` (JSONB), `tip`, `description` columns. |
| MEET-04 | Admin controls meeting lifecycle: upcoming -> active -> completed | Server actions to UPDATE `meetings.status`, with prerequisite checks (stations >= 1, groups >= 1 for activation). Force-close active sessions on completion via UPDATE `station_sessions SET status = 'completed'`. |
| SCOPE-01 | Groups are created fresh per meeting via the existing group builder | Existing GroupBuilder component reused, but `createGroup` action modified to accept `meetingId` parameter. Groups page becomes a tab within meeting detail, pre-filtered by meeting_id. |
| SCOPE-04 | Export downloads discussions from a specific meeting with meeting title/date in header | Export API route accepts `meetingId` query param, filters messages through station_sessions -> stations -> meetings chain. `buildExportMarkdown` updated with meeting title/date in header. |
| SCOPE-05 | Word cloud shows word frequencies from a specific meeting's discussions | WordCloud page embedded in Resultat tab, data query filtered by meeting_id through the stations -> station_sessions -> messages FK chain. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.x | App Router, Server Components, Server Actions | Already installed, dynamic routes for `[id]` |
| React | 19.2.x | UI, `useActionState` for forms, `useState` for tabs | Already installed |
| @supabase/ssr | 0.8.x | Server-side Supabase client with cookie auth | Already installed, `createClient()` pattern established |
| @supabase/supabase-js | 2.97.x | Admin client (service role), DB queries | Already installed, `createAdminClient()` pattern established |
| @dnd-kit/react | 0.3.x | Drag-and-drop for station reorder | Already installed, used in GroupBuilder for group member assignment |
| @dnd-kit/helpers | 0.3.x | `move` utility for dnd-kit | Already installed, used in GroupBuilder |
| Tailwind CSS | 4.x | Styling with @theme custom properties | Already installed, design tokens in globals.css |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | Zero new dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/react for station reorder | Manual arrow buttons (up/down) | Simpler but less intuitive on mobile; dnd-kit already installed and pattern exists in GroupBuilder |
| Native `<input type="date">` | date-fns + custom date picker | Native inputs are sufficient for admin-only form; no need for custom picker |
| Custom tab component | Headless UI tabs | Extra dependency; simple CSS tabs with state are sufficient for 3 tabs |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/admin/
├── page.tsx                          # Admin hub (MODIFY: replace Grupper link with Moter)
├── layout.tsx                        # Admin auth guard (KEEP as-is)
├── users/page.tsx                    # User management (KEEP as-is)
├── meetings/
│   ├── page.tsx                      # NEW: Meetings overview (list all meetings)
│   ├── new/
│   │   └── page.tsx                  # NEW: Create meeting form
│   └── [id]/
│       └── page.tsx                  # NEW: Meeting detail (tabs: Stasjoner|Grupper|Resultat)
├── groups/page.tsx                   # REMOVE or redirect (absorbed into meetings/[id])
└── wordcloud/page.tsx                # REMOVE or redirect (absorbed into meetings/[id] Resultat tab)
src/components/admin/
├── GroupBuilder.tsx                   # MODIFY: accept meetingId prop for scoped group CRUD
├── GroupBucket.tsx                    # KEEP as-is
├── UnassignedPool.tsx                # KEEP as-is
├── WordCloud.tsx                     # KEEP as-is (already accepts filtered data)
├── MeetingCard.tsx                   # NEW: Meeting card for overview list
├── MeetingTabs.tsx                   # NEW: Tab container (Stasjoner|Grupper|Resultat)
├── StationList.tsx                   # NEW: Sortable station list with inline edit
├── StationEditor.tsx                 # NEW: Expandable station edit form
├── MeetingLifecycleControls.tsx      # NEW: Start/End meeting buttons with dialogs
└── MeetingResultsTab.tsx             # NEW: Export button + WordCloud wrapper
src/lib/actions/
├── admin.ts                          # MODIFY: add meeting CRUD, station CRUD, scoped group actions
└── meeting.ts                        # NEW (optional): separate meeting actions if admin.ts grows too large
```

### Pattern 1: Server Actions with verifyAdmin + Admin Client
**What:** Every admin mutation follows the same pattern: verify caller is admin via session client, then perform DB operations via service-role client.
**When to use:** All admin CRUD operations (meeting create, station add/edit/delete, lifecycle transitions).
**Example:**
```typescript
// Source: existing pattern in src/lib/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return { error: 'Ikke autorisert' }
  return { userId: user.id }
}

export async function createMeeting(formData: FormData): Promise<{ id?: string; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Check no upcoming meeting exists
  const { data: existing } = await admin
    .from('meetings')
    .select('id')
    .eq('status', 'upcoming')
    .maybeSingle()

  if (existing) return { error: 'Det finnes allerede et kommende møte' }

  const { data, error } = await admin
    .from('meetings')
    .insert({
      title: `Fellesmøte`,
      date: formData.get('date'),
      time: formData.get('time'),
      venue: formData.get('venue'),
      status: 'upcoming',
    })
    .select('id')
    .single()

  if (error) return { error: 'Kunne ikke opprette møte' }

  revalidatePath('/admin/meetings')
  return { id: data.id }
}
```

### Pattern 2: Dynamic Route with Async Params (Next.js 15)
**What:** Meeting detail page uses `[id]` dynamic segment with async params.
**When to use:** `/admin/meetings/[id]` route.
**Example:**
```typescript
// Source: Next.js 15 docs - params is a Promise
export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (!meeting) notFound()

  return <MeetingTabs meeting={meeting} />
}
```

### Pattern 3: Client-Side Tab State (No URL State)
**What:** Simple useState-based tabs for Stasjoner/Grupper/Resultat.
**When to use:** Meeting detail page tabbed layout.
**Example:**
```typescript
'use client'

import { useState } from 'react'

type Tab = 'stasjoner' | 'grupper' | 'resultat'

export default function MeetingTabs({ meeting, stations, groups, ... }) {
  const [activeTab, setActiveTab] = useState<Tab>('stasjoner')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stasjoner', label: 'Stasjoner' },
    { key: 'grupper', label: 'Grupper' },
    { key: 'resultat', label: 'Resultat' },
  ]

  return (
    <div>
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-teal-primary border-b-2 border-teal-primary'
                : 'text-text-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'stasjoner' && <StationList ... />}
      {activeTab === 'grupper' && <GroupBuilder ... />}
      {activeTab === 'resultat' && <MeetingResultsTab ... />}
    </div>
  )
}
```

### Pattern 4: Station Sortable List with @dnd-kit/react
**What:** Reuse the existing @dnd-kit/react pattern from GroupBuilder for station reorder.
**When to use:** Station list on meeting detail Stasjoner tab.
**Key insight:** Project uses @dnd-kit/react v0.3.x (the new rewrite), NOT @dnd-kit/core. The API uses `DragDropProvider` (not `DndContext`) and `move` from `@dnd-kit/helpers`. The existing GroupBuilder already demonstrates this pattern perfectly.
**Example:**
```typescript
// Matches existing GroupBuilder pattern
import { DragDropProvider } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'

// For sortable items within the provider:
// Each station item gets a unique id, drag handle, and reorder callback
```

### Pattern 5: Scoped Group Builder Integration
**What:** Existing GroupBuilder component is reused inside the Grupper tab, but all group operations are scoped to the current meeting via `meeting_id`.
**When to use:** Meeting detail Grupper tab.
**Key changes needed:**
1. `GroupBuilder` accepts `meetingId: string` prop
2. `createGroup` action accepts `meetingId` parameter, inserts with `meeting_id` FK
3. Groups page queries `groups.meeting_id = meetingId` instead of all groups
4. `saveGroupMembers`, `deleteGroup`, `toggleGroupsLock` work within meeting scope

### Anti-Patterns to Avoid
- **Editing stations during active meeting:** DB should not allow station updates when meeting status is 'active'. Enforce in server action, not just UI.
- **Multiple upcoming meetings:** The DB partial unique index already prevents this, but the UI must handle the constraint error gracefully (show message, don't crash).
- **Global group operations:** Never modify groups without meeting_id scope. The old `/admin/groups` page operated globally; all group operations must now be meeting-scoped.
- **Fetching all messages for export/wordcloud without meeting filter:** Always filter through the meeting_id chain (meetings -> stations -> station_sessions -> messages).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop station reorder | Custom touch event handlers | @dnd-kit/react (already installed) | Touch handling, accessibility, animation all included; pattern exists in GroupBuilder |
| Confirmation dialogs | Custom modal logic | Existing `Dialog` component (`src/components/ui/Dialog.tsx`) | Uses native `<dialog>` element, accessible, already styled |
| Mobile bottom sheets | Custom overlay | Existing `BottomSheet` component | Same pattern as Dialog, already used in GroupBuilder |
| Form inputs | Custom styled inputs | Existing `Input` component (`src/components/ui/Input.tsx`) | 44px min-height touch targets, error state built in |
| Meeting creation form | Complex form library (react-hook-form, formik) | Native `<form>` + server action | Only 3 fields; no complex validation needed |
| Date/time inputs | Custom date picker library | Native `<input type="date">` and `<input type="time">` | Admin-only interface, native pickers are good enough on mobile |

**Key insight:** The existing codebase has a complete UI component library (Button, Input, Label, Card, Dialog, BottomSheet, Badge, EmptyState, SearchInput) and established patterns for admin CRUD. The primary work is wiring these to meeting-scoped data, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Station Number Assignment on New Meetings
**What goes wrong:** When creating stations for a new meeting, the station `number` column (used for ordering) must be unique per meeting (compound unique index `idx_stations_meeting_number`). Inserting a station without computing the next available number causes constraint violations.
**Why it happens:** The old schema had a global unique constraint on `stations.number`; the new schema has per-meeting uniqueness.
**How to avoid:** Server action for creating a station should query `SELECT MAX(number) FROM stations WHERE meeting_id = ?` and use `max + 1` (or 1 if no stations).
**Warning signs:** Unique constraint violation errors on station insert.

### Pitfall 2: Forgetting to Update station.number on Reorder
**What goes wrong:** After drag-and-drop reorder, the visual order changes but `stations.number` values in DB still reflect old order. Export and dashboard show wrong station order.
**Why it happens:** Reorder is client-side state; must be persisted to DB.
**How to avoid:** On reorder save, UPDATE all station `number` values in a batch (loop through ordered list, set number = index + 1). Use `createAdminClient()` for the update.
**Warning signs:** Station order resets on page refresh.

### Pitfall 3: Race Condition on Meeting Activation
**What goes wrong:** Admin clicks "Start mote" while prerequisites (stations/groups) are being checked; between check and status update, another admin modifies data.
**Why it happens:** Check-then-update is not atomic.
**How to avoid:** Use a single server action that checks prerequisites and updates status atomically. Consider a Postgres function with FOR UPDATE lock on the meeting row, similar to `open_station`.
**Warning signs:** Meeting activates with 0 stations or 0 groups.

### Pitfall 4: Existing GroupBuilder Assumes Global Groups
**What goes wrong:** Current GroupBuilder queries all groups without meeting_id filter. In a multi-meeting world, it would show groups from all meetings.
**Why it happens:** v1.0 had no meeting concept; groups were global.
**How to avoid:** The groups page (now a tab) must filter `groups.meeting_id = ?` in the server component, and all group actions must include `meeting_id`.
**Warning signs:** Groups from completed meetings appear in the upcoming meeting's group builder.

### Pitfall 5: Force-Close Without Participant Notification
**What goes wrong:** Admin ends a meeting while groups are actively chatting. Sessions are marked completed in DB, but participants with open chat windows don't know.
**Why it happens:** Session status changes aren't pushed to participants via Realtime.
**How to avoid:** When force-closing, update all active `station_sessions` to 'completed'. Participants' existing Realtime subscriptions or page refreshes will detect the status change. The ChatRoom component already handles completed sessions (read-only mode). Consider broadcasting a "meeting_ended" event on a meeting-level channel.
**Warning signs:** Participants continue typing into a "completed" session.

### Pitfall 6: Export/WordCloud Not Filtering by Meeting
**What goes wrong:** Export downloads messages from ALL meetings. WordCloud shows words from all meetings.
**Why it happens:** Current export API and wordcloud page query all messages without meeting filter.
**How to avoid:** Both must accept a `meetingId` parameter and filter through the FK chain: `meetings -> stations (WHERE meeting_id = ?) -> station_sessions -> messages`.
**Warning signs:** Export file contains data from the demo/backfilled "Fellesmote #1" when viewing a new meeting.

## Code Examples

### Meeting Creation Server Action
```typescript
// Pattern: server action with verifyAdmin + createAdminClient
export async function createMeeting(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const venue = (formData.get('venue') as string)?.trim()

  if (!date || !time || !venue) {
    return { error: 'Alle felt er paakrevd' }
  }

  const admin = createAdminClient()

  // DB partial unique index prevents duplicates, but check for UX
  const { data: existing } = await admin
    .from('meetings')
    .select('id')
    .eq('status', 'upcoming')
    .maybeSingle()

  if (existing) {
    return { error: 'Det finnes allerede et kommende mote' }
  }

  const { data, error } = await admin
    .from('meetings')
    .insert({ date, time, venue, status: 'upcoming' })
    .select('id')
    .single()

  if (error) return { error: 'Kunne ikke opprette motet' }

  revalidatePath('/admin/meetings')
  // Caller redirects to /admin/meetings/${data.id}
  return { id: data.id }
}
```

### Station CRUD Server Actions
```typescript
export async function addStation(
  meetingId: string,
  data: { title: string; questions: string; tip?: string }
): Promise<{ error?: string; station?: { id: string; number: number } }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Verify meeting is upcoming (not active/completed)
  const { data: meeting } = await admin
    .from('meetings').select('status').eq('id', meetingId).single()
  if (meeting?.status !== 'upcoming') {
    return { error: 'Kan bare redigere stasjoner for kommende moter' }
  }

  // Get next station number
  const { data: maxRow } = await admin
    .from('stations')
    .select('number')
    .eq('meeting_id', meetingId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNumber = (maxRow?.number ?? 0) + 1

  // Parse questions from textarea (line breaks -> JSONB array)
  const questionsArray = data.questions
    .split('\n')
    .map(q => q.trim())
    .filter(Boolean)

  const { data: station, error } = await admin
    .from('stations')
    .insert({
      meeting_id: meetingId,
      number: nextNumber,
      title: data.title.trim(),
      questions: JSON.stringify(questionsArray),
      tip: data.tip?.trim() || null,
      description: null,
    })
    .select('id, number')
    .single()

  if (error) return { error: 'Kunne ikke legge til stasjon' }

  revalidatePath(`/admin/meetings/${meetingId}`)
  return { station: { id: station.id, number: station.number } }
}

export async function reorderStations(
  meetingId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Update each station's number based on position
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin
      .from('stations')
      .update({ number: i + 1 })
      .eq('id', orderedIds[i])
      .eq('meeting_id', meetingId)

    if (error) return { error: 'Kunne ikke endre rekkefølge' }
  }

  revalidatePath(`/admin/meetings/${meetingId}`)
  return {}
}
```

### Meeting Lifecycle Transition
```typescript
export async function activateMeeting(
  meetingId: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Fetch meeting with prerequisites
  const { data: meeting } = await admin
    .from('meetings').select('status').eq('id', meetingId).single()

  if (!meeting) return { error: 'Motet finnes ikke' }
  if (meeting.status !== 'upcoming') return { error: 'Motet er ikke i kommende status' }

  // Check prerequisites
  const { count: stationCount } = await admin
    .from('stations').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId)
  const { count: groupCount } = await admin
    .from('groups').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId)

  if (!stationCount || stationCount < 1) return { error: 'Minst 1 stasjon kreves' }
  if (!groupCount || groupCount < 1) return { error: 'Minst 1 gruppe kreves' }

  const { error } = await admin
    .from('meetings')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  if (error) return { error: 'Kunne ikke starte motet' }

  revalidatePath('/admin/meetings')
  revalidatePath('/dashboard')
  return {}
}

export async function completeMeeting(
  meetingId: string
): Promise<{ error?: string; forceClosedCount?: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Force-close all active sessions for this meeting's groups
  const { data: activeSessionIds } = await admin
    .from('station_sessions')
    .select('id, groups!inner(meeting_id)')
    .eq('status', 'active')
    .eq('groups.meeting_id', meetingId)

  const forceClosedCount = activeSessionIds?.length ?? 0

  if (forceClosedCount > 0) {
    const ids = activeSessionIds!.map(s => s.id)
    await admin
      .from('station_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', ids)
  }

  const { error } = await admin
    .from('meetings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  if (error) return { error: 'Kunne ikke avslutte motet' }

  revalidatePath('/admin/meetings')
  revalidatePath('/dashboard')
  return { forceClosedCount }
}
```

### Meeting-Scoped Export
```typescript
// Modified export route: /api/export?meetingId=xxx
export async function GET(request: Request) {
  // ... auth check (same as existing) ...

  const { searchParams } = new URL(request.url)
  const meetingId = searchParams.get('meetingId')
  if (!meetingId) return new Response('meetingId kreves', { status: 400 })

  const admin = createAdminClient()

  // Fetch meeting info for header
  const { data: meeting } = await admin
    .from('meetings')
    .select('title, date, venue')
    .eq('id', meetingId)
    .single()

  // Fetch messages scoped to this meeting
  const { data } = await admin
    .from('messages')
    .select(`
      id, content,
      station_sessions:session_id (
        stations:station_id ( number, title, meeting_id ),
        groups:group_id ( name )
      )
    `)
    .order('created_at', { ascending: true })

  // Filter to only messages from this meeting's stations
  const meetingMessages = data?.filter(msg => {
    const session = Array.isArray(msg.station_sessions)
      ? msg.station_sessions[0]
      : msg.station_sessions
    const station = session?.stations
    return station?.meeting_id === meetingId
  })

  // Build markdown with meeting header
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 | Server action forms use `useActionState` with `(prevState, formData)` signature |
| `params: { id: string }` (Next 14) | `params: Promise<{ id: string }>` (Next 15) | Next.js 15 | Dynamic route params must be awaited |
| `@dnd-kit/core` + `@dnd-kit/sortable` (classic) | `@dnd-kit/react` + `@dnd-kit/helpers` (v0.3.x rewrite) | 2024 | Project uses the NEW dnd-kit rewrite; `DragDropProvider` not `DndContext` |
| `h-screen` | `h-dvh` | Modern CSS | Mobile viewport; already used throughout codebase |

**Deprecated/outdated:**
- `useFormState`: Replaced by `useActionState` in React 19
- `@dnd-kit/core`: Project uses `@dnd-kit/react` v0.3.x (the rewrite); do NOT import from `@dnd-kit/core`
- `tailwind.config.js`: Tailwind v4 uses `@theme` in CSS; project has no config file

## Open Questions

1. **Meeting title auto-generation vs. manual entry**
   - What we know: The `meetings` table has a `title` column (NOT NULL). The backfilled meeting is "Fellesmote #1".
   - What's unclear: Should the admin type a title, or auto-generate "Fellesmote #N"?
   - Recommendation: Auto-generate based on count (e.g., "Fellesmote #2") but allow admin to override via an optional title field. Keep it simple.

2. **Station `description` column usage**
   - What we know: The `stations` table has a `description` column (TEXT, nullable) used in v1.0 for short station descriptions on the station selector.
   - What's unclear: The CONTEXT.md specifies title, questions, and tip -- but not description.
   - Recommendation: Keep description optional. The Stasjoner tab edit form shows title, questions textarea, and tip. Description can be auto-derived or left empty. It is displayed on the participant-facing StationSelector but is not critical for admin management.

3. **Force-close active sessions: FK chain for filtering**
   - What we know: `station_sessions` references `stations` and `groups`, both of which have `meeting_id`. To find active sessions for a meeting, need to join through either FK.
   - What's unclear: Best query approach -- join through stations or groups?
   - Recommendation: Join through `groups` since `station_sessions.group_id -> groups.meeting_id` is the most direct chain and groups are always meeting-scoped. Alternatively, use `station_sessions.station_id -> stations.meeting_id`. Either works; consistency matters more.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/app/admin/`, `src/lib/actions/admin.ts`, `src/components/admin/GroupBuilder.tsx` -- establishes all patterns
- Supabase migrations `001_schema.sql`, `020_meetings_migration.sql` -- confirms DB schema with meetings, meeting_id FKs, partial unique index
- Next.js 15 docs (Context7 /websites/nextjs) -- async params, useActionState, server actions
- @dnd-kit docs (Context7 /websites/dndkit) -- sortable list pattern (classic API documented; project uses v0.3.x rewrite but pattern is similar)

### Secondary (MEDIUM confidence)
- Supabase docs (Context7 /websites/supabase) -- RLS policy patterns, SECURITY DEFINER functions
- Tailwind v4 @theme directive -- confirmed by existing `globals.css`

### Tertiary (LOW confidence)
- None -- all findings verified against existing codebase or Context7 documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero new dependencies; entire stack already installed and patterned
- Architecture: HIGH - follows established codebase patterns (verifyAdmin, createAdminClient, Dialog, existing components)
- Pitfalls: HIGH - identified from direct codebase analysis (global group queries, station number uniqueness, export filter gaps)

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable stack, no fast-moving dependencies)
