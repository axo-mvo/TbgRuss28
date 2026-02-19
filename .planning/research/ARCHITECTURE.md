# Architecture Research

**Domain:** Real-time group discussion webapp (Next.js 14 App Router + Supabase)
**Researched:** 2026-02-19
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth UI  │  │ Dashboard /  │  │ Station  │  │  Admin Panel  │  │
│  │ (Login/  │  │  Station     │  │  Chat    │  │  (Users/      │  │
│  │ Register)│  │  Selector    │  │  View    │  │  Groups/Codes)│  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └──────┬────────┘  │
│       │               │               │               │            │
│       │     ┌─────────┴───────────────┴───────────────┘            │
│       │     │         Supabase Browser Client                      │
│       │     │    (createBrowserClient from @supabase/ssr)          │
│       │     │    ┌──────────┐  ┌────────────┐                      │
│       │     │    │ Realtime │  │  DB Reads   │                      │
│       │     │    │ Channels │  │  (select)   │                      │
│       │     │    └──────────┘  └────────────┘                      │
├───────┴─────┴──────────────────────────────────────────────────────┤
│                     Next.js Middleware                              │
│           (Auth token refresh + role-based redirect)               │
├────────────────────────────────────────────────────────────────────┤
│                        SERVER (Next.js)                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Server       │  │ Server       │  │ Route Handlers           │  │
│  │ Components   │  │ Actions      │  │ (API routes for export,  │  │
│  │ (initial     │  │ (mutations:  │  │  invite code validation) │  │
│  │  data fetch) │  │  send msg,   │  │                          │  │
│  │              │  │  end station) │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                       │                │
│         └─────────────────┴───────────────────────┘                │
│                  Supabase Server Client                            │
│            (createServerClient from @supabase/ssr)                 │
├────────────────────────────────────────────────────────────────────┤
│                        SUPABASE                                    │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Auth   │  │  PostgreSQL  │  │ Realtime │  │   Storage    │  │
│  │ (email/  │  │  (8 tables   │  │ (WS for  │  │  (not used)  │  │
│  │ password)│  │   + RLS)     │  │ messages,│  │              │  │
│  │          │  │              │  │ sessions,│  │              │  │
│  │          │  │              │  │ meeting) │  │              │  │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Next.js Middleware** | Refresh auth tokens on every request, redirect unauthenticated users, enforce role-based routing (admin vs participant paths) | `middleware.ts` at project root using `@supabase/ssr` `createServerClient` with cookie get/set handlers |
| **Browser Supabase Client** | All client-side Supabase operations: Realtime subscriptions, direct DB reads (filtered by RLS) | Singleton from `createBrowserClient()` in `lib/supabase/client.ts` |
| **Server Supabase Client** | Server-side data fetching in Server Components, mutations in Server Actions, secure operations with service role | Created per-request in `lib/supabase/server.ts` using `cookies()` from `next/headers` |
| **Server Components** | Initial page data loading (station list, group info, session state) | Async components that `await` Supabase queries directly |
| **Server Actions** | All write operations: send message, start/end station, manage groups, create invite codes | `'use server'` functions called from Client Components |
| **Client Components** | Interactive UI: chat input, timer, Realtime subscriptions, optimistic updates | `'use client'` components that hold state and subscriptions |
| **RLS Policies** | Row-level security scoping all data access by authenticated user and group membership | SQL policies on all 8 tables, `is_admin()` helper function |
| **Realtime Channels** | Push database changes to subscribed clients for messages, station sessions, and meeting status | `supabase.channel().on('postgres_changes', ...).subscribe()` |

## Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout: metadata, font, Tailwind
│   ├── page.tsx                 # Landing page (redirect to login or dashboard)
│   ├── login/
│   │   └── page.tsx             # Login form (Server Component shell, Client form)
│   ├── register/
│   │   └── page.tsx             # Registration with invite code
│   ├── dashboard/
│   │   ├── layout.tsx           # Auth guard layout (redirects if not logged in)
│   │   ├── page.tsx             # Station selector grid
│   │   └── station/
│   │       └── [stationId]/
│   │           └── page.tsx     # Station chat view
│   ├── admin/
│   │   ├── layout.tsx           # Admin guard layout (redirects if not admin)
│   │   ├── page.tsx             # Admin overview dashboard
│   │   ├── users/page.tsx       # User management
│   │   ├── codes/page.tsx       # Invite code management
│   │   ├── groups/page.tsx      # Group assignment
│   │   ├── meeting/page.tsx     # Meeting start/stop control
│   │   └── export/page.tsx      # Conversation export
│   └── auth/
│       └── callback/
│           └── route.ts         # Auth callback handler (if needed)
├── components/
│   ├── ui/                      # Reusable primitives (Button, Card, Input, Badge)
│   ├── auth/
│   │   ├── LoginForm.tsx        # 'use client' - email/password form
│   │   └── RegisterForm.tsx     # 'use client' - invite code + registration
│   ├── dashboard/
│   │   ├── StationGrid.tsx      # 'use client' - 6 cards with Realtime status
│   │   └── StationCard.tsx      # Station card with status badge
│   ├── station/
│   │   ├── ChatView.tsx         # 'use client' - main chat container
│   │   ├── ChatMessage.tsx      # Single message bubble
│   │   ├── ChatInput.tsx        # 'use client' - text input + send
│   │   ├── QuestionPanel.tsx    # Collapsible questions + tip
│   │   └── StationTimer.tsx     # 'use client' - countdown from started_at
│   └── admin/
│       ├── UserTable.tsx        # User list with role management
│       ├── CodeManager.tsx      # Create/toggle invite codes
│       ├── GroupBuilder.tsx     # Drag-drop or multi-select group assignment
│       ├── MeetingControl.tsx   # Start/end meeting buttons
│       └── ExportButton.tsx     # Trigger export + download .md
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # createBrowserClient singleton
│   │   ├── server.ts            # createServerClient factory (per-request)
│   │   └── admin.ts             # Service role client (for Server Actions needing bypass)
│   ├── types/
│   │   └── database.ts          # Generated types from Supabase CLI (supabase gen types)
│   ├── actions/
│   │   ├── auth.ts              # Server Actions: register, validate invite code
│   │   ├── messages.ts          # Server Actions: send message
│   │   ├── stations.ts          # Server Actions: start/end station session
│   │   ├── groups.ts            # Server Actions: create/assign groups
│   │   └── meeting.ts           # Server Actions: start/end meeting, export
│   ├── hooks/
│   │   ├── useRealtimeMessages.ts   # Chat subscription hook
│   │   ├── useRealtimeSessions.ts   # Station session subscription hook
│   │   ├── useMeetingStatus.ts      # Meeting status subscription hook
│   │   └── useCountdown.ts          # Timer calculation hook
│   └── utils.ts                 # Formatting, Norwegian locale helpers
├── middleware.ts                 # Auth refresh + role-based redirects
└── supabase/
    └── migrations/              # SQL migration files
        ├── 001_schema.sql       # Tables + indexes
        ├── 002_rls.sql          # RLS policies
        ├── 003_functions.sql    # Database functions
        └── 004_seed.sql         # 6 stations + initial meeting_status
```

### Structure Rationale

- **`app/` route groups:** Dashboard and admin have separate `layout.tsx` files that act as auth guards. The dashboard layout verifies the user is authenticated; the admin layout additionally verifies `role = 'admin'`. This is defense-in-depth alongside middleware.
- **`components/` by domain:** Auth, dashboard, station, admin mirrors the route structure. Each domain folder contains only the components used by that route group, keeping colocation tight.
- **`lib/supabase/` three-client pattern:** Browser client (singleton, for Client Components), server client (per-request, for Server Components and Actions), and admin client (service role, for privileged operations). This is the officially recommended Supabase SSR pattern.
- **`lib/actions/` for Server Actions:** All mutations centralized here. Client Components import and call these. This keeps mutation logic server-side, testable, and separate from UI.
- **`lib/hooks/` for Realtime:** Custom hooks encapsulate subscription setup, cleanup, and state management. Reusable across components.
- **`supabase/migrations/` for schema:** SQL files that can be applied via `supabase db push` or migration tooling. Keeps the database schema version-controlled.

## Architectural Patterns

### Pattern 1: Server Component Shell + Client Component Island

**What:** Page-level Server Components fetch initial data, then pass it as props to Client Components that handle interactivity and Realtime subscriptions.
**When to use:** Every page that needs both initial data and real-time updates (station chat, station selector, meeting status).
**Trade-offs:** Maximizes server-side rendering benefits (fast initial load, SEO not relevant here but smaller JS bundle). Requires clear boundary between what's fetched server-side and what's subscribed client-side.

**Example:**
```typescript
// app/dashboard/station/[stationId]/page.tsx (Server Component)
import { createServerClient } from '@/lib/supabase/server'
import { ChatView } from '@/components/station/ChatView'

export default async function StationPage({ params }: { params: { stationId: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch initial data server-side
  const { data: messages } = await supabase
    .from('messages')
    .select('*, profiles(full_name, role)')
    .eq('station_id', params.stationId)
    .eq('group_id', userGroupId)
    .order('created_at', { ascending: true })

  const { data: session } = await supabase
    .from('station_sessions')
    .select('*')
    .eq('station_id', params.stationId)
    .eq('group_id', userGroupId)
    .single()

  // Pass to Client Component for interactivity
  return (
    <ChatView
      stationId={params.stationId}
      groupId={userGroupId}
      initialMessages={messages ?? []}
      session={session}
      currentUser={user}
    />
  )
}
```

### Pattern 2: Realtime Subscription Hook with Cleanup

**What:** Custom React hooks that manage Supabase Realtime channel subscription lifecycle — subscribe on mount, unsubscribe on unmount, merge incoming events with local state.
**When to use:** Any component that needs live database updates (chat messages, station session status, meeting status).
**Trade-offs:** Clean separation of subscription logic from UI. Must handle the single-filter limitation of Supabase Realtime (see critical note below).

**Example:**
```typescript
// lib/hooks/useRealtimeMessages.ts
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types/database'

export function useRealtimeMessages(
  stationId: number,
  groupId: string,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${stationId}:${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        // LIMITATION: Supabase Realtime only supports ONE filter.
        // Filter by station_id, then client-filter by group_id.
        filter: `station_id=eq.${stationId}`,
      }, (payload) => {
        const newMessage = payload.new as Message
        // Client-side filter for group_id since Realtime
        // does not support multi-column filters
        if (newMessage.group_id === groupId) {
          setMessages((prev) => [...prev, newMessage])
        }
      })
      .subscribe()

    // CRITICAL: Always cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [stationId, groupId, supabase])

  return messages
}
```

### Pattern 3: Optimistic UI for Chat Messages

**What:** Show the user's own message immediately in the chat list before server confirmation, then reconcile when the Realtime event arrives.
**When to use:** Sending chat messages. The latency between INSERT and Realtime callback is noticeable enough to feel sluggish without optimistic updates.
**Trade-offs:** Requires deduplication logic (the optimistic message and the Realtime-delivered message are the same). Use a temporary client-side ID, then replace when the server-confirmed message arrives.

**Example:**
```typescript
// Simplified optimistic send pattern
const sendMessage = useCallback(async (content: string) => {
  // 1. Create optimistic message with temp ID
  const optimisticMsg = {
    id: `temp-${Date.now()}`,
    content,
    profile_id: currentUser.id,
    station_id: stationId,
    group_id: groupId,
    created_at: new Date().toISOString(),
    _optimistic: true,  // Flag for UI styling (e.g., slightly faded)
  }

  // 2. Add to local state immediately
  setMessages(prev => [...prev, optimisticMsg])

  // 3. Server Action to persist
  const result = await insertMessage({
    content,
    stationId,
    groupId,
  })

  if (result.error) {
    // 4. Remove optimistic message on failure
    setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
  }
  // On success: Realtime subscription will deliver the real message.
  // Dedup by checking if a non-optimistic message with same content
  // and similar timestamp already exists, then remove the optimistic one.
}, [currentUser, stationId, groupId])
```

### Pattern 4: Server-Timestamp Timer Sync

**What:** Store `started_at` as a server-side `now()` timestamp in `station_sessions`. All clients compute remaining time as `900 - (Date.now()/1000 - started_at_epoch)`. No WebSocket timer push needed.
**When to use:** The 15-minute countdown timer per station per group.
**Trade-offs:** Relies on client clocks being reasonably accurate (within a few seconds is fine for a 15-minute soft deadline). Eliminates need for continuous server-side timer broadcasting. The PRD explicitly calls this a "soft deadline" so sub-second accuracy is unnecessary.

**Example:**
```typescript
// lib/hooks/useCountdown.ts
'use client'
import { useState, useEffect } from 'react'

const DURATION_SECONDS = 900 // 15 minutes

export function useCountdown(startedAt: string | null) {
  const [remaining, setRemaining] = useState<number>(DURATION_SECONDS)

  useEffect(() => {
    if (!startedAt) return

    const startEpoch = new Date(startedAt).getTime() / 1000

    const tick = () => {
      const now = Date.now() / 1000
      const elapsed = now - startEpoch
      setRemaining(Math.max(0, DURATION_SECONDS - Math.floor(elapsed)))
    }

    tick() // immediate first calculation
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  return remaining
}
```

## Data Flow

### Chat Message Flow (Core)

```
User types message → ChatInput.tsx
    │
    ├── 1. Optimistic: Add temp message to local state (instant UI)
    │
    ├── 2. Server Action: insertMessage()
    │       │
    │       ├── Validates auth (getClaims)
    │       ├── Validates group membership
    │       ├── Validates station is active (not completed)
    │       ├── INSERT into messages table
    │       └── Returns success/error
    │
    ├── 3. Supabase Realtime: postgres_changes INSERT on messages
    │       │
    │       ├── Broadcasted to all subscribers on channel
    │       ├── RLS ensures only group members receive it
    │       └── Each client's useRealtimeMessages hook receives payload
    │
    └── 4. All group members see message appear
            (sender: dedups optimistic message)
            (others: appends new message, auto-scrolls)
```

### Station Lifecycle Flow

```
Meeting not started → Admin clicks "Start Meeting"
    │
    ├── Server Action: updateMeetingStatus('active')
    ├── Realtime: meeting_status UPDATE → all clients
    └── Dashboard shows station selector grid
            │
            ├── First group member opens Station 3
            │       │
            │       ├── Server Action: startStationSession(stationId=3, groupId)
            │       │     Uses SQL function with upsert + COALESCE
            │       │     Sets started_at = now(), status = 'active'
            │       │
            │       ├── Realtime: station_sessions UPDATE → all group members
            │       │     StationGrid updates card 3 status to "active"
            │       │
            │       └── ChatView opens: timer starts counting from started_at
            │
            ├── Other group members open Station 3
            │       │
            │       └── Server Action returns existing session (COALESCE preserves
            │           original started_at). Timer synced across all clients.
            │
            ├── 15 minutes pass → Timer hits 0:00
            │       └── Soft deadline: chat remains open, timer shows "Tiden er ute!"
            │
            └── Any member clicks "Avslutt stasjon"
                    │
                    ├── Confirmation dialog
                    ├── Server Action: endStationSession(stationId=3, groupId)
                    │     Sets ended_at = now(), status = 'completed'
                    │
                    ├── Realtime: station_sessions UPDATE → all group members
                    │     All members redirected to dashboard
                    │     Station 3 card shows completed (green checkmark)
                    │
                    └── Station 3 chat viewable in read-only mode
```

### Auth & Role-Based Routing Flow

```
Request hits Next.js
    │
    ├── middleware.ts runs:
    │     ├── Creates server Supabase client with cookie access
    │     ├── Calls supabase.auth.getUser() (refreshes token if expired)
    │     ├── No user? → Redirect to /login (except public routes)
    │     ├── Has user? → Check profile role:
    │     │     ├── Admin at /dashboard → Allow (admin can do everything)
    │     │     ├── Participant at /admin → Redirect to /dashboard
    │     │     └── Otherwise → Allow
    │     └── Pass refreshed cookies to response
    │
    ├── Layout auth guards (defense-in-depth):
    │     ├── dashboard/layout.tsx: Verify authenticated
    │     └── admin/layout.tsx: Verify role = 'admin'
    │
    └── Page renders with appropriate data
```

### Key Data Flows

1. **Registration flow:** Landing -> Validate invite code (Server Action with DB function) -> Show form -> Create auth user (Supabase Auth) -> Create profile row (trigger or Server Action) -> Link parent-youth if parent role -> Redirect to dashboard
2. **Group assignment flow:** Admin -> GroupBuilder loads all profiles -> Admin creates groups and assigns members -> Server Actions INSERT into groups + group_members -> Participants see their group on dashboard
3. **Export flow:** Admin -> ExportButton triggers Server Action -> Calls `export_meeting_data()` SQL function -> Returns structured JSON -> Client-side transforms to Markdown -> Browser downloads .md file

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-80 users (this project) | Current architecture is more than sufficient. Single Supabase project, free tier handles this easily. All Realtime channels, RLS policies, and DB functions work fine at this scale. No optimization needed. |
| 80-1k users | Still fine with current architecture. Consider adding indexes on frequently queried columns (already specified in PRD). Monitor Realtime channel count — each unique station+group combination creates a channel. |
| 1k-10k users | RLS policy performance becomes relevant. The `is_admin()` function and group membership subqueries in RLS policies may need optimization. Consider materialized views for group membership lookups. Realtime subscription filtering becomes a bottleneck since each change is authorized per-user. |

### Scaling Priorities

1. **First bottleneck (unlikely for this project):** Realtime authorization overhead. Each postgres_change must be checked against RLS for every subscriber. With ~80 users in ~6 groups, this is negligible.
2. **Second bottleneck (irrelevant at this scale):** Database connection limits on Supabase free tier. Not a concern for 80 concurrent users.

**Honest assessment:** This is a single-event app for ~80 people. Scaling is not a real concern. The architecture should optimize for development speed and correctness, not horizontal scalability.

## Anti-Patterns

### Anti-Pattern 1: Fetching Data Client-Side When Server Components Suffice

**What people do:** Using `useEffect` + `useState` to fetch initial data in Client Components when the page first loads.
**Why it's wrong:** Causes a loading spinner on every page navigation. The browser must download JS, hydrate, then make a separate API call. Doubles the round trips.
**Do this instead:** Fetch initial data in Server Components (which run on the server and stream HTML), then pass as props to Client Components that handle interactivity. Reserve `useEffect` fetching for data that updates in real-time via subscriptions.

### Anti-Pattern 2: Using getSession() for Auth Checks on the Server

**What people do:** Calling `supabase.auth.getSession()` in Server Components or middleware to verify the user.
**Why it's wrong:** `getSession()` reads from cookies which can be spoofed. It does not validate the JWT signature. An attacker could modify the session cookie and bypass auth.
**Do this instead:** Use `supabase.auth.getUser()` (or `supabase.auth.getClaims()` in newer versions) which validates the JWT against Supabase's signing key on every call.

### Anti-Pattern 3: Creating Multiple Supabase Browser Clients

**What people do:** Calling `createBrowserClient()` inside every component that needs Supabase access.
**Why it's wrong:** Each call potentially creates a new client instance with a new Realtime connection. This wastes connections and can cause subscription duplication or missed events.
**Do this instead:** Create a singleton browser client in `lib/supabase/client.ts` and import it wherever needed. The `@supabase/ssr` `createBrowserClient()` function already implements singleton behavior, but wrapping it in your own module makes the pattern explicit and testable.

### Anti-Pattern 4: RLS-Only Mutations Without Server Validation

**What people do:** Letting Client Components INSERT directly into tables, relying solely on RLS policies for validation.
**Why it's wrong:** RLS only checks structural rules (correct user, correct group). It cannot validate business logic like "station must be active before sending a message" or "invite code must not be expired." Also, debugging RLS policy failures is painful.
**Do this instead:** Route all mutations through Server Actions. Validate business logic in TypeScript, then insert using the server Supabase client. RLS still acts as a safety net for reads, but the primary mutation path goes through server-side code with proper error messages.

### Anti-Pattern 5: Subscribing to Entire Tables Without Filters

**What people do:** Subscribing to `postgres_changes` on the `messages` table without any filter, then filtering in the callback.
**Why it's wrong:** Supabase must authorize every change event against every subscriber. Subscribing without filters means the server processes events for all groups and all stations for every connected client — O(users * messages) authorization checks.
**Do this instead:** Always filter by at least one column. For this project, filter by `station_id` (the more selective dimension since there are only 6 stations vs potentially many groups). Then client-side filter by `group_id` (see Pattern 2 above).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Supabase Auth** | `@supabase/ssr` with cookie-based session management | Use `getUser()` not `getSession()` for server-side auth checks. Middleware refreshes tokens on every request. |
| **Supabase Database** | Direct queries via Supabase client (PostgREST under the hood) | All 8 tables specified in PRD. Use generated TypeScript types from `supabase gen types typescript`. |
| **Supabase Realtime** | WebSocket channels via `supabase.channel()` | Enable Realtime on `messages`, `station_sessions`, `meeting_status` tables in Supabase dashboard. |
| **Vercel** | Auto-deploy from Git, environment variables in Vercel dashboard | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Components -> Client Components | Props (initial data passed down) | Data flows one direction. Client Components never pass data back up to Server Components. |
| Client Components -> Server Actions | Function calls (React Server Actions protocol) | Server Actions are imported and called like regular async functions. Next.js handles the POST request under the hood. |
| Client Components -> Supabase Realtime | WebSocket subscription | Browser client connects directly to Supabase Realtime. No Next.js server involvement. |
| Middleware -> Supabase Auth | HTTP (JWT refresh) | Runs on every request matching the route matcher. Transparent to application code. |
| Database -> Realtime | PostgreSQL logical replication | Supabase internally streams WAL changes to Realtime service. Enabled per-table in dashboard. |

## Critical Architecture Note: Supabase Realtime Single-Filter Limitation

**Confidence: HIGH** (verified via [GitHub issue #97](https://github.com/supabase/realtime-js/issues/97), open since 2021, repository archived January 2026 without resolution)

Supabase Realtime `postgres_changes` subscriptions support only ONE filter column per subscription. The PRD specifies filtering by both `station_id` AND `group_id`, but this is not possible at the subscription level.

**Recommended workaround for this project:**

1. Filter by `station_id` at the subscription level (since users are on one station page at a time, this is the natural filter)
2. Client-side filter incoming events by `group_id` in the subscription callback
3. RLS policies on the `messages` table already restrict what the server sends to group members, providing server-side data security regardless of client-side filter

This is acceptable for this project's scale (~80 users, ~6 groups). The RLS policies prevent data leakage, and the client-side filter prevents rendering messages from other groups. The only cost is slightly more authorization work on the Supabase Realtime server, which is negligible at this scale.

**Alternative considered:** Creating a composite column (`station_group_id = station_id || '_' || group_id`) to enable single-column filtering. Rejected because it adds schema complexity for minimal benefit at this scale, and RLS already provides the security boundary.

## Build Order (Dependency-Driven)

Based on component dependencies, the recommended build order is:

```
Phase 1: Foundation (no dependencies)
├── Supabase project setup + schema migration
├── Three Supabase client utilities (browser, server, admin)
├── Next.js middleware for auth token refresh
├── TypeScript types generation
└── Base UI components (Button, Card, Input, Badge)

Phase 2: Auth (depends on: Phase 1)
├── Invite code validation (Server Action + DB function)
├── Registration flow (youth, then parent with child-linking)
├── Login flow
└── Role-based redirect in middleware

Phase 3: Admin Panel (depends on: Phase 2)
├── Admin layout guard
├── User management (read profiles, change roles)
├── Invite code management (CRUD)
├── Group creation and member assignment
├── Meeting status control (start/end)
└── These can be built in any order within this phase

Phase 4: Meeting-Day Core (depends on: Phase 2 + Phase 3 groups)
├── Station selector dashboard with status grid
├── Station chat view with Realtime messages
├── Countdown timer component
├── Collapsible question panel
├── End-station flow with group-wide redirect
└── Realtime subscriptions for sessions + meeting status

Phase 5: Export & Polish (depends on: Phase 4)
├── Markdown export (Server Action + DB function)
├── Read-only mode for completed stations
├── Mobile responsive polish
└── Error handling and edge cases
```

**Rationale:** Auth must come first because every subsequent feature depends on knowing who the user is and what group they belong to. Admin panel comes before meeting-day features because groups must be assigned before the chat experience works. The export and polish phase comes last because it only adds value after the core meeting flow exists.

## Sources

- [Supabase: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- HIGH confidence (official docs)
- [Supabase: Using Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) -- HIGH confidence (official docs)
- [Supabase: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- HIGH confidence (official docs, filter API verified)
- [Supabase: Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- HIGH confidence (official docs)
- [GitHub Issue #97: Multi-column filter not supported](https://github.com/supabase/realtime-js/issues/97) -- HIGH confidence (official repo, confirmed limitation)
- [Makerkit: API Routes vs Server Actions](https://makerkit.dev/docs/next-supabase/how-to/api/api-routes-vs-server-actions) -- MEDIUM confidence (well-maintained third-party guide)
- [catjam.fi: Next.js + Supabase in production lessons](https://catjam.fi/articles/next-supabase-what-do-differently) -- MEDIUM confidence (production experience report, multiple corroborating sources)
- [React docs: useOptimistic](https://react.dev/reference/react/useOptimistic) -- HIGH confidence (official React docs)
- [Medium: Syncing Countdown Timers Across Multiple Clients](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a) -- MEDIUM confidence (corroborates the timestamp-based approach used in PRD)

---
*Architecture research for: Real-time group discussion webapp (Buss 2028 Fellesmote-appen)*
*Researched: 2026-02-19*
