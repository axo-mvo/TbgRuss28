# Phase 3: Station Chat and Timer - Research

**Researched:** 2026-02-19
**Domain:** Real-time chat (Supabase Broadcast), synchronized timer, station state management
**Confidence:** HIGH

## Summary

Phase 3 builds the core meeting-day experience: a station selector dashboard with 6 station cards, real-time group chat via Supabase Broadcast, and a synchronized 15-minute countdown timer. The existing database schema already provides `stations`, `station_sessions` (with `status`, `started_at`, `end_timestamp`, `completed_at`), and `messages` tables with RLS policies. The 6 stations are seeded in `004_seed.sql`.

The primary technical challenge is the two-path approach for chat: Supabase Broadcast delivers messages instantly to all group members via WebSocket, while a server action persists messages to the `messages` table for history and export. The timer uses a server-timestamp approach: store `end_timestamp` in `station_sessions` when the first group member opens a station, and all clients compute `remaining = end_timestamp - now()` locally. Private channels with RLS on `realtime.messages` enforce group isolation.

**Primary recommendation:** Use Supabase Broadcast with `private: true` channels for instant message delivery, server actions for DB persistence, channel naming convention `station:{sessionId}` for group isolation, and `end_timestamp`-based timer sync with `setInterval(1s)` on the client.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | Participant sees 6 station cards with per-group status (available/active/completed) | Station selector dashboard reads `station_sessions` table filtered by user's group_id. Existing RLS policy allows group members to read their sessions. Stations seeded in DB. |
| CHAT-02 | Participant can open an available station to enter real-time group chat | Opening a station creates/activates a `station_sessions` row (upsert with status='active', started_at=now(), end_timestamp=now()+15min). Server action enforces one-active constraint. |
| CHAT-03 | Messages appear instantly for all group members via Supabase Broadcast | Broadcast channel `station:{sessionId}` with `private: true`. Messages sent via `channel.send()` arrive instantly. See Code Examples section for verified pattern. |
| CHAT-04 | Each message shows sender name, role badge (youth/parent), timestamp, and content | Broadcast payload includes `{userId, fullName, role, content, createdAt}`. Badge component already exists with youth/parent variants. |
| CHAT-05 | Own messages are visually differentiated from others | Compare `message.userId === currentUser.id`. Own messages right-aligned with teal background; others left-aligned with neutral background. Broadcast `self: true` config to receive own messages via channel. |
| CHAT-06 | Chat auto-scrolls to newest message unless user has scrolled up | Intersection Observer on a sentinel div at the bottom of the message list. Only auto-scroll when sentinel is in viewport. See Architecture Patterns section. |
| CHAT-07 | Only one station can be active per group at a time | Server action checks `station_sessions` for any row with `status='active'` for the group before activating. DB constraint enforced server-side (not client). |
| TIMR-01 | 15-minute countdown starts when first group member opens a station | First opener's server action sets `started_at=now()` and `end_timestamp=now()+interval '15 minutes'`. Subsequent openers read existing `end_timestamp`. |
| TIMR-02 | All group members see the same synchronized countdown (server-timestamp based) | All clients compute `remaining = end_timestamp - Date.now()`. No server push needed. Server timestamp eliminates clock drift between clients. |
| TIMR-03 | Timer changes color: white >5min, yellow 1-5min, red <1min | CSS classes switched based on `remaining` value. Uses existing design tokens: `text-warm-white` / `text-warning` / `text-danger`. |
| TIMR-04 | At 0:00 timer shows "Tiden er ute!" -- chat remains open (soft deadline) | Timer clamps to 0, displays "Tiden er ute!" text. No input disabling. Chat continues to function normally. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.97.0 | Realtime channels (Broadcast + Presence), DB queries | Already installed. Provides `channel()`, `send()`, `on('broadcast')` APIs. v2.44.0+ required for private channels -- current v2.97.0 qualifies. |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client for auth + DB operations | Already installed. Used for server actions that persist messages and manage station sessions. |
| React 19 | ^19.2.4 | UI rendering, `useEffect` for channel subscriptions, `useActionState` for forms | Already installed. `useActionState` (not useFormState) for the send message form. |
| Next.js 15 | ^15.5.12 | App Router, server actions, dynamic routes | Already installed. Station chat page at `/dashboard/station/[sessionId]` or similar. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | No new dependencies required for Phase 3. All functionality covered by existing stack. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Broadcast for chat delivery | Postgres Changes (listen to INSERT on messages table) | Postgres Changes adds DB query load per message and ~100-200ms latency vs Broadcast's <50ms. Broadcast is ephemeral but faster -- persist separately via server action. |
| Private channels with RLS | Public channels with naming convention only | Public channels offer no server-enforced isolation. A malicious or buggy client could subscribe to another group's channel. Private channels enforce via RLS. |
| Custom auto-scroll logic | react-scroll-to-bottom library | Library adds dependency for something achievable with ~15 lines of Intersection Observer code. Keep it simple. |
| setInterval for timer | requestAnimationFrame | setInterval(1000) is sufficient for 1-second resolution. rAF would be overkill and waste CPU on a simple countdown. |

**Installation:**
```bash
# No new packages needed. All dependencies already in package.json.
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── dashboard/
│       ├── page.tsx                    # Station selector (modify existing)
│       └── station/
│           └── [sessionId]/
│               └── page.tsx            # Station chat page (server component shell)
├── components/
│   ├── station/
│   │   ├── StationCard.tsx             # Station card for selector grid
│   │   ├── StationSelector.tsx         # Grid of 6 station cards (client)
│   │   ├── ChatRoom.tsx                # Main chat container (client)
│   │   ├── MessageList.tsx             # Scrollable message list
│   │   ├── MessageBubble.tsx           # Single message display
│   │   ├── ChatInput.tsx               # Message input + send button
│   │   ├── CountdownTimer.tsx          # Synchronized timer display
│   │   └── StationHeader.tsx           # Header with back, title, timer
│   └── ui/
│       └── Badge.tsx                   # Existing -- reused for role badges
├── lib/
│   ├── actions/
│   │   └── station.ts                  # Server actions: openStation, sendMessage
│   └── hooks/
│       ├── useRealtimeChat.ts          # Broadcast subscribe/receive hook
│       ├── useCountdownTimer.ts        # Timer logic hook
│       └── useAutoScroll.ts            # Auto-scroll with scroll-up detection
└── supabase/
    └── migrations/
        └── 007_station_chat.sql        # RLS for realtime.messages + open_station function
```

### Pattern 1: Two-Path Chat (Broadcast + DB Persist)

**What:** Messages are delivered instantly via Broadcast and persisted asynchronously via server action. This decouples real-time delivery from database write latency.

**When to use:** Any chat where instant delivery matters but messages must also be stored for later retrieval (export, read-only mode).

**Example:**
```typescript
// Source: Context7 /supabase/supabase-js + /webdevsimplified/supabase-realtime-chat

// === CLIENT: useRealtimeChat.ts ===
"use client"
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useState, useCallback } from 'react'

type ChatMessage = {
  id: string
  userId: string
  fullName: string
  role: 'youth' | 'parent'
  content: string
  createdAt: string
  status: 'sent' | 'pending' | 'error'
}

export function useRealtimeChat(sessionId: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel
    let cancelled = false

    // setAuth() is required for private channels
    supabase.realtime.setAuth().then(() => {
      if (cancelled) return

      channel = supabase.channel(`station:${sessionId}`, {
        config: {
          private: true,
          broadcast: { self: true, ack: false },
        },
      })

      channel
        .on('broadcast', { event: 'new-message' }, (payload) => {
          const msg = payload.payload as ChatMessage
          setMessages((prev) => {
            // Deduplicate: if we sent it optimistically, replace pending with confirmed
            const exists = prev.find((m) => m.id === msg.id)
            if (exists) {
              return prev.map((m) => m.id === msg.id ? { ...msg, status: 'sent' } : m)
            }
            return [...prev, { ...msg, status: 'sent' }]
          })
        })
        .subscribe()
    })

    return () => {
      cancelled = true
      channel?.unsubscribe()
    }
  }, [sessionId, userId])

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  return { messages, setMessages, addOptimistic }
}

// === SERVER: sendMessage action ===
"use server"
import { createClient } from '@/lib/supabase/server'

export async function sendMessage(data: {
  id: string
  sessionId: string
  content: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Persist to messages table (RLS enforces group membership)
  const { error } = await supabase
    .from('messages')
    .insert({
      id: data.id,
      session_id: data.sessionId,
      user_id: user.id,
      content: data.content.trim(),
    })

  if (error) return { error: 'Kunne ikke sende melding' }
  return {}
}
```

### Pattern 2: Server-Timestamp Timer Sync

**What:** Store `end_timestamp` in the database when the first group member opens a station. All clients compute `remaining = end_timestamp - Date.now()` locally with `setInterval(1000)`.

**When to use:** Countdown timers that must be synchronized across multiple clients without continuous server communication.

**Example:**
```typescript
// Source: Verified pattern from PRD + web research on timer sync

// === useCountdownTimer.ts ===
"use client"
import { useState, useEffect } from 'react'

type TimerState = {
  remaining: number // seconds
  color: 'white' | 'yellow' | 'red'
  expired: boolean
  display: string // "MM:SS" or "Tiden er ute!"
}

export function useCountdownTimer(endTimestamp: string | null): TimerState {
  const [remaining, setRemaining] = useState<number>(() => {
    if (!endTimestamp) return 900 // 15 min default
    const diff = Math.max(0, Math.floor((new Date(endTimestamp).getTime() - Date.now()) / 1000))
    return diff
  })

  useEffect(() => {
    if (!endTimestamp) return

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(endTimestamp).getTime() - Date.now()) / 1000)
      setRemaining(Math.max(0, diff))
    }, 1000)

    return () => clearInterval(interval)
  }, [endTimestamp])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const expired = remaining <= 0

  let color: 'white' | 'yellow' | 'red' = 'white'
  if (remaining <= 60) color = 'red'
  else if (remaining <= 300) color = 'yellow'

  const display = expired
    ? 'Tiden er ute!'
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { remaining, color, expired, display }
}
```

### Pattern 3: Auto-Scroll with Scroll-Up Detection

**What:** Use Intersection Observer on a sentinel element at the bottom of the message list. Only auto-scroll when the sentinel is visible (user is at bottom). If user scrolls up, stop auto-scrolling.

**When to use:** Chat interfaces where new messages should scroll into view unless the user is reading history.

**Example:**
```typescript
// Source: Community best practices + Intersection Observer API

// === useAutoScroll.ts ===
"use client"
import { useRef, useEffect, useCallback } from 'react'

export function useAutoScroll(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        isAtBottomRef.current = entry.isIntersecting
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Scroll to bottom when deps change (new message) IF user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current && sentinelRef.current) {
      sentinelRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return { containerRef, sentinelRef, scrollToBottom }
}
```

### Pattern 4: Private Channel with Group Isolation

**What:** Use channel naming convention `station:{sessionId}` with `private: true`. RLS on `realtime.messages` checks that the authenticated user is a member of the group associated with the session.

**When to use:** Any Realtime channel that should be restricted to specific users.

**Example:**
```sql
-- Source: Supabase Realtime Authorization docs
-- https://supabase.com/docs/guides/realtime/authorization

-- RLS policy on realtime.messages for Broadcast + Presence
-- Allows group members to send and receive on station channels
CREATE POLICY "Group members can use station channels"
ON "realtime"."messages"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM station_sessions ss
    JOIN group_members gm ON gm.group_id = ss.group_id
    WHERE gm.user_id = (SELECT auth.uid())
      AND 'station:' || ss.id::text = (SELECT realtime.topic())
      AND realtime.messages.extension IN ('broadcast', 'presence')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM station_sessions ss
    JOIN group_members gm ON gm.group_id = ss.group_id
    WHERE gm.user_id = (SELECT auth.uid())
      AND 'station:' || ss.id::text = (SELECT realtime.topic())
      AND realtime.messages.extension IN ('broadcast', 'presence')
  )
);
```

### Pattern 5: Station Opening with One-Active Constraint

**What:** Server action to open a station. Checks no other station is active for the group, then upserts `station_sessions` with atomicity guarantees.

**Example:**
```typescript
// === Server action: openStation ===
"use server"

export async function openStation(stationId: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Check if station already active for this group
  const { data: existing } = await supabase
    .from('station_sessions')
    .select('id, status, end_timestamp')
    .eq('station_id', stationId)
    .eq('group_id', groupId)
    .single()

  // If already active, just return the existing session
  if (existing?.status === 'active') {
    return { sessionId: existing.id, endTimestamp: existing.end_timestamp }
  }

  if (existing?.status === 'completed') {
    return { error: 'Stasjonen er allerede fullfort' }
  }

  // Check no other station is active for this group
  const { data: activeSession } = await supabase
    .from('station_sessions')
    .select('id')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeSession) {
    return { error: 'Gruppen har allerede en aktiv stasjon' }
  }

  // Create or activate the session
  // Use upsert: if row exists (available), update; if not, insert
  const endTimestamp = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { data: session, error } = await supabase
    .from('station_sessions')
    .upsert({
      station_id: stationId,
      group_id: groupId,
      status: 'active',
      started_at: new Date().toISOString(),
      end_timestamp: endTimestamp,
    }, { onConflict: 'station_id,group_id' })
    .select('id, end_timestamp')
    .single()

  if (error) return { error: 'Kunne ikke apne stasjonen' }

  return { sessionId: session.id, endTimestamp: session.end_timestamp }
}
```

### Anti-Patterns to Avoid

- **Postgres Changes for chat delivery:** Using `on('postgres_changes', ...)` to listen for INSERT on messages table adds ~100-200ms latency per message and creates unnecessary DB load. Use Broadcast for delivery, DB for persistence.
- **Client-side timer with `Date.now()` as start:** Each client's clock differs. Always use a server-generated `end_timestamp` and compute remaining time locally.
- **Public Realtime channels:** Without `private: true`, any authenticated user could subscribe to any group's channel by guessing the session ID. Always use private channels with RLS.
- **Sending messages only via Broadcast (no DB persist):** Broadcast messages are ephemeral. If a user refreshes or joins late, they lose all history. Always persist to `messages` table.
- **Using `useFormState` (React 18):** In React 19, use `useActionState` for server action forms. `useFormState` is deprecated.
- **Using `h-screen` for mobile layout:** Use `h-dvh` (dynamic viewport height) which accounts for mobile browser chrome and keyboard. Already established in the codebase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Realtime message delivery | Custom WebSocket server | Supabase Broadcast | Handles reconnection, channel management, scaling, auth. Free tier supports 200 concurrent connections (sufficient for ~80 users). |
| Channel authorization | Custom token validation | Supabase private channels + RLS on `realtime.messages` | Server-enforced access control. Cached per connection (not per message = no perf hit). |
| Message deduplication | Custom sequence numbers | UUID-based dedup in state update callback | Generate `crypto.randomUUID()` on client, use as message ID. Deduplicate in `setMessages` callback by checking ID existence. |
| Timer synchronization | Custom NTP sync / server polling | Server-timestamp `end_timestamp` + client-side `setInterval` | DB stores end time, all clients compute locally. Drift is negligible for 15-minute timers (typical clock skew < 1 second). |
| Scroll position tracking | Manual scroll event listeners + math | Intersection Observer on sentinel div | Browser-native API, performant, no scroll event throttling needed. |

**Key insight:** The Supabase Realtime stack (Broadcast + Presence + private channels) provides everything needed for this phase. No additional libraries or services are required. The existing database schema already has the tables needed.

## Common Pitfalls

### Pitfall 1: Forgetting `setAuth()` Before Private Channel Subscribe

**What goes wrong:** Channel subscription silently fails or returns CHANNEL_ERROR. No messages are received.
**Why it happens:** Private channels require the client to pass its JWT to the Realtime server. Without `setAuth()`, the server rejects the connection.
**How to avoid:** Always call `await supabase.realtime.setAuth()` before subscribing to any private channel. Do this in the `useEffect` that sets up the channel.
**Warning signs:** Channel status callback receives error status instead of 'SUBSCRIBED'.

### Pitfall 2: Race Condition on Station Opening

**What goes wrong:** Two group members open the same station simultaneously, creating duplicate sessions or both thinking they're the "first opener" who starts the timer.
**Why it happens:** Client-side checks can't prevent concurrent server-side writes.
**How to avoid:** Use a Postgres function with `INSERT ... ON CONFLICT` (upsert) that atomically creates or returns the existing session. The `UNIQUE(station_id, group_id)` constraint on `station_sessions` prevents duplicates. The server action should read-after-write to get the canonical `end_timestamp`.
**Warning signs:** Multiple `station_sessions` rows for the same station+group, or timer start times differing between group members.

### Pitfall 3: Mobile Keyboard Covering Chat Input

**What goes wrong:** On iOS Safari and some Android browsers, the virtual keyboard pushes the page up or covers the fixed-position input field.
**Why it happens:** `position: fixed; bottom: 0` doesn't account for the virtual keyboard on mobile browsers. iOS uses "visual viewport" resizing, not "layout viewport" resizing.
**How to avoid:** Use `h-dvh` for the outer container (already established in codebase). Use flex layout with the chat input at the bottom of a flex column. Consider adding `interactive-widget=resizes-content` to the viewport meta tag for Android. For iOS, use the `visualViewport` API to detect keyboard height and adjust input position.
**Warning signs:** Input field disappears behind keyboard on iPhone Safari.

### Pitfall 4: Auto-Scroll Firing When User Is Reading History

**What goes wrong:** User scrolls up to read earlier messages, then a new message arrives and the chat jumps to the bottom, losing their position.
**Why it happens:** Naive `scrollIntoView()` in a `useEffect` that runs on every new message.
**How to avoid:** Use Intersection Observer on a sentinel div. Only auto-scroll when the sentinel (at the bottom of the message list) is visible in the viewport.
**Warning signs:** Users complaining about losing their scroll position during active discussions.

### Pitfall 5: Supabase Free Tier Connection Limits

**What goes wrong:** With ~80 users each opening a Broadcast channel + Presence channel, you approach the 200 concurrent connection limit (free tier).
**Why it happens:** Each `supabase.channel()` subscription counts as one connection. If users subscribe to multiple channels simultaneously (e.g., station selector + chat), connections multiply.
**How to avoid:** Use a single channel per user session that combines Broadcast + Presence (they share one WebSocket connection per channel). Unsubscribe from channels when navigating away from the chat page. With ~80 users and 1 channel each = 80 connections, well within the 200 limit.
**Warning signs:** Connection errors in browser console, users unable to receive messages.

### Pitfall 6: Stale Channel Subscriptions on Navigation

**What goes wrong:** User navigates between station selector and chat page multiple times. Old channel subscriptions accumulate, causing duplicate messages or memory leaks.
**Why it happens:** React `useEffect` cleanup not properly unsubscribing from channels.
**How to avoid:** Always return a cleanup function from `useEffect` that calls `channel.unsubscribe()` and `channel.untrack()` (if using Presence). Use a `cancelled` flag to prevent subscription setup after unmount.
**Warning signs:** Duplicate messages appearing, increasing memory usage, multiple WebSocket connections in Network tab.

### Pitfall 7: Missing Initial Message Load

**What goes wrong:** User joins a station where messages were already sent. They see an empty chat because Broadcast only delivers new messages.
**Why it happens:** Broadcast is ephemeral -- it doesn't store history. The two-path approach means DB has the history, but the client needs to load it.
**How to avoid:** On mount, fetch existing messages from the `messages` table via a server action or direct query. Then subscribe to Broadcast for new messages. Deduplicate by message ID.
**Warning signs:** Users joining mid-discussion see no prior messages.

## Code Examples

Verified patterns from official sources:

### Supabase Broadcast Channel Setup (Private)
```typescript
// Source: Context7 /supabase/supabase-js + Supabase Realtime Authorization docs

const supabase = createClient()

// REQUIRED for private channels
await supabase.realtime.setAuth()

const channel = supabase.channel(`station:${sessionId}`, {
  config: {
    private: true,
    broadcast: {
      self: true,  // Receive own messages (for confirmation)
      ack: false,  // Don't wait for server ack (faster delivery)
    },
  },
})

channel
  .on('broadcast', { event: 'new-message' }, (payload) => {
    // payload.payload contains the message data
    console.log('New message:', payload.payload)
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected to station channel')
    }
  })

// Send a message
await channel.send({
  type: 'broadcast',
  event: 'new-message',
  payload: {
    id: crypto.randomUUID(),
    userId: user.id,
    fullName: profile.full_name,
    role: profile.role,
    content: 'Hei alle sammen!',
    createdAt: new Date().toISOString(),
  },
})
```

### Message Bubble with Role Badge
```typescript
// Source: Existing Badge component pattern + PRD layout spec

import Badge from '@/components/ui/Badge'

type MessageBubbleProps = {
  fullName: string
  role: 'youth' | 'parent'
  content: string
  createdAt: string
  isOwn: boolean
}

export function MessageBubble({ fullName, role, content, createdAt, isOwn }: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex flex-col gap-1 max-w-[80%] ${isOwn ? 'ml-auto items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-primary">{fullName}</span>
        <Badge variant={role}>
          {role === 'youth' ? 'Ungdom' : 'Forelder'}
        </Badge>
        <span className="text-xs text-text-muted">{time}</span>
      </div>
      <div
        className={`rounded-2xl px-4 py-2 ${
          isOwn
            ? 'bg-teal-primary text-warm-white rounded-br-sm'
            : 'bg-warm-white border border-teal-primary/10 text-text-primary rounded-bl-sm'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  )
}
```

### Timer Display with Color Transitions
```typescript
// Source: PRD timer spec + design system tokens

export function CountdownTimer({ endTimestamp }: { endTimestamp: string | null }) {
  const { display, color, expired } = useCountdownTimer(endTimestamp)

  const colorClasses = {
    white: 'text-text-primary',
    yellow: 'text-warning',
    red: 'text-danger animate-pulse',
  }

  return (
    <div className={`font-mono text-sm font-bold ${colorClasses[color]}`}>
      {expired ? display : `${display}`}
    </div>
  )
}
```

### Chat Input with Send on Enter
```typescript
// Source: /webdevsimplified/supabase-realtime-chat pattern

"use client"
import { useState, FormEvent } from 'react'

type ChatInputProps = {
  onSend: (content: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const text = message.trim()
    if (!text || disabled) return
    onSend(text)
    setMessage('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-teal-primary/10 bg-warm-white">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Skriv en kommentar..."
        maxLength={2000}
        disabled={disabled}
        className="flex-1 rounded-full px-4 py-2 border border-teal-primary/20 text-sm
                   focus:outline-none focus:border-teal-primary bg-white text-text-primary
                   placeholder:text-text-muted/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="rounded-full w-10 h-10 flex items-center justify-center
                   bg-teal-primary text-warm-white disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
      </button>
    </form>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Postgres Changes for chat | Broadcast for delivery + DB for persistence | Supabase Broadcast available since 2023, private channels since v2.44.0 (2024) | 3-5x faster message delivery. No WAL overhead per message. |
| Public Realtime channels | Private channels with RLS on `realtime.messages` | Supabase v2.44.0+ (2024) | Server-enforced channel access control. Required for multi-tenant/multi-group apps. |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 (2024) | `useFormState` is deprecated. `useActionState` provides pending state and error handling for server actions. |
| `h-screen` for full-height | `h-dvh` (dynamic viewport height) | CSS dvh units widely supported since 2023 | Accounts for mobile browser chrome (URL bar, bottom bar). Essential for chat interfaces. |
| Manual `scrollTop` math | Intersection Observer for auto-scroll | Intersection Observer API stable since 2019, but pattern crystallized for chat UIs in 2023-2024 | Cleaner, more performant than scroll event listeners. No need for scroll throttling. |

**Deprecated/outdated:**
- `useFormState` from `react-dom`: Replaced by `useActionState` from `react` in React 19
- `getSession()` in middleware: Use `getUser()` (or `getClaims()` with `getUser()` fallback as established in Phase 1)

## Open Questions

1. **Should we use Presence to show who's currently in the chat?**
   - What we know: Supabase Presence tracks which users are online in a channel. The PRD does not explicitly require a "who's online" indicator for the chat. However, it could improve UX.
   - What's unclear: Whether the product owner wants this feature, and whether Presence adds meaningful connection overhead.
   - Recommendation: Skip for Phase 3. It's low-priority and can be added later without architectural changes. The channel setup already supports adding `.on('presence', ...)` listeners.

2. **Should station opening use a DB function for atomicity?**
   - What we know: The `UNIQUE(station_id, group_id)` constraint prevents duplicate sessions. A server action with upsert handles the common case.
   - What's unclear: Whether concurrent opens from multiple group members could create a race condition where both try to set `started_at` and get different values.
   - Recommendation: Use `INSERT ... ON CONFLICT (station_id, group_id) DO UPDATE SET status = 'active', started_at = COALESCE(station_sessions.started_at, now())` in a Postgres function. The `COALESCE` ensures `started_at` is only set once (first opener). This eliminates the race condition at the DB level.

3. **Message ordering: should we use `created_at` from DB or client-side timestamp?**
   - What we know: Messages are persisted with `created_at TIMESTAMPTZ DEFAULT now()` (server time). Broadcast payloads include a client-generated `createdAt`.
   - What's unclear: Whether client timestamps could be out of order due to network delays.
   - Recommendation: Use the client-generated timestamp for display ordering in the real-time view (it's the order users composed messages). Use DB `created_at` for the initial history load and export. The difference is negligible for a 15-minute chat session.

4. **Disabling Realtime public access globally**
   - What we know: Private channels require disabling the "Allow public access" setting in Supabase Realtime Settings via the dashboard.
   - What's unclear: Whether this setting has been toggled already, and whether it affects any existing functionality.
   - Recommendation: Add as a setup step in the first plan task. This is a one-time dashboard setting change.

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase-js` v2.58.0 - Broadcast channel setup, Presence tracking, `send()` API, `subscribe()` status, `self`/`ack` options
- Context7 `/webdevsimplified/supabase-realtime-chat` - Complete Next.js chat implementation with Supabase Realtime, optimistic updates, server actions, client/server Supabase setup
- [Supabase Realtime Authorization docs](https://supabase.com/docs/guides/realtime/authorization) - Private channels, RLS on `realtime.messages`, `setAuth()`, `realtime.topic()` helper, extension-based filtering
- [Supabase Broadcast docs](https://supabase.com/docs/guides/realtime/broadcast) - Broadcast from client/REST/DB, `self`/`ack` options, channel configuration, Broadcast replay feature

### Secondary (MEDIUM confidence)
- [Supabase Manage Realtime Peak Connections](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-peak-connections) - Free tier: 200 connections, Pro: 500, connection counting methodology
- [Supabase Realtime Blog Post](https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization) - Authorization architecture details, caching behavior
- [Medium: Syncing Countdown Timers](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a) - Server init_time + diff correction vs end_time approach comparison
- [Fix mobile keyboard with dvh](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualViewport) - `h-dvh`, `visualViewport` API, `interactive-widget` meta tag

### Tertiary (LOW confidence)
- [autoscroll-react npm](https://github.com/thk2b/autoscroll-react) - Auto-scroll library pattern (used as reference, not recommended to install)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed. All patterns verified via Context7 and official Supabase docs.
- Architecture: HIGH - Two-path chat pattern verified in Context7 reference project. Timer sync pattern is well-established. Private channel RLS documented officially.
- Pitfalls: HIGH - Identified from official docs (setAuth requirement), verified community patterns (mobile keyboard, auto-scroll), and confirmed Supabase limits (200 connections).

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days - stable stack, no breaking changes expected)
