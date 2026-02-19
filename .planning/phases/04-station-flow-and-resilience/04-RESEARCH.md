# Phase 4: Station Flow and Resilience - Research

**Researched:** 2026-02-19
**Domain:** Station lifecycle (end/complete), cross-client redirect via Broadcast, read-only chat mode, connection status monitoring
**Confidence:** HIGH

## Summary

Phase 4 completes the station rotation lifecycle by adding: (1) an "end station" action that sets `station_sessions.status = 'completed'` and broadcasts a redirect event to all group members via the existing Broadcast channel, (2) a read-only mode for completed stations that loads message history without Broadcast subscription or chat input, and (3) a connection status indicator using Supabase Realtime's `onHeartbeat` API combined with the browser's `navigator.onLine` for immediate offline detection.

The existing codebase provides nearly all the infrastructure needed. Phase 3 already built the Broadcast channel (`station:{sessionId}`), chat components (ChatRoom, MessageList, StationHeader), server actions (openStation, sendMessage, loadMessages), and a reusable Dialog component with confirm/cancel buttons. The key additions are: a new `endStation` server action + Postgres function, a broadcast event type `station-ended` that triggers `router.push('/dashboard')` on all clients, a new `ReadOnlyChatRoom` component (or a `readOnly` prop on the existing ChatRoom), and a `useConnectionStatus` hook wrapping `onHeartbeat` + `navigator.onLine`.

**Primary recommendation:** Use the existing Broadcast channel to signal station-ended events to all group members. Reuse the Dialog component for the confirmation dialog. Create a `complete_station` Postgres function (SECURITY DEFINER, like `open_station`) for atomic status transition. Add a compact connection indicator dot in the StationHeader. Make StationCard tappable for completed stations to navigate to a read-only view.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FLOW-01 | Any group member can end the station via confirmation dialog | Existing Dialog component (`src/components/ui/Dialog.tsx`) provides confirm/cancel UI. New `endStation` server action calls `complete_station` Postgres function to atomically set `status='completed'` and `completed_at=now()`. Button placed in StationHeader or chat area. |
| FLOW-02 | Ending a station redirects all group members to station selector | Broadcast a `station-ended` event on the existing `station:{sessionId}` channel. All subscribed clients listen for this event and call `router.push('/dashboard')`. The ending user broadcasts before navigating. |
| FLOW-03 | Completed stations are viewable in read-only mode | StationCard becomes tappable for completed stations (currently `opacity-60` and non-interactive). Navigation goes to the same `/dashboard/station/[sessionId]` page, which detects `session.status === 'completed'` and renders without ChatInput or Broadcast subscription. loadMessages already works for completed sessions. |
| FLOW-04 | Connection status indicator shows reconnecting/offline state | `useConnectionStatus` hook combining `supabase.realtime.onHeartbeat()` (heartbeat status: ok/timeout/disconnected/error) with `navigator.onLine` listener. Small colored dot indicator in StationHeader: green=connected, yellow=reconnecting, red=offline. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.97.0 | Broadcast events for redirect signaling, `onHeartbeat` for connection monitoring, DB operations | Already installed. v2.97.0 includes `onHeartbeat` API (verified in installed `realtime-js` source). |
| @supabase/ssr | ^0.8.0 | Server-side client for `endStation` server action | Already installed. Same pattern as existing `openStation` and `sendMessage` actions. |
| React 19 | ^19.2.4 | Hooks for connection status, Dialog state management | Already installed. `useSyncExternalStore` available for `navigator.onLine` if desired, but `useState`+`useEffect` is simpler and sufficient. |
| Next.js 15 | ^15.5.12 | `router.push('/dashboard')` for redirect, server actions | Already installed. Dynamic route `[sessionId]/page.tsx` already handles server-side session fetching. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | No new dependencies required for Phase 4. All functionality covered by existing stack. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Broadcast for redirect signaling | Postgres Changes (listen for UPDATE on station_sessions) | Postgres Changes adds ~100-200ms latency and DB load. Broadcast is instant and already subscribed. Use Broadcast. |
| `onHeartbeat` for connection status | `navigator.onLine` only | `navigator.onLine` detects device-level offline but not WebSocket-specific issues (e.g., Supabase server unreachable). Combining both gives complete coverage. |
| ReadOnly prop on ChatRoom | Separate ReadOnlyChatRoom component | Either works. Prop approach is simpler (fewer files), but may add conditional complexity. Recommend the prop approach since the difference is just hiding ChatInput and skipping Broadcast subscription. |
| Postgres function for endStation | Direct UPDATE via server action | Server action UPDATE works but lacks atomicity guarantees (e.g., checking status is still 'active' before completing). A Postgres function with `FOR UPDATE` lock mirrors the established `open_station` pattern. |

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
│       ├── page.tsx                    # Station selector (modify: make completed stations tappable)
│       └── station/
│           └── [sessionId]/
│               └── page.tsx            # Station page (modify: detect completed status, pass readOnly prop)
├── components/
│   └── station/
│       ├── StationCard.tsx             # Modify: make completed stations tappable, show "Se samtale" label
│       ├── StationSelector.tsx         # Modify: navigate to completed station sessions
│       ├── StationHeader.tsx           # Modify: add "Avslutt" button and ConnectionStatus indicator
│       ├── ChatRoom.tsx                # Modify: add readOnly mode, add endStation flow, listen for station-ended broadcast
│       ├── ChatInput.tsx               # No change (hidden in read-only mode)
│       ├── MessageList.tsx             # No change
│       ├── MessageBubble.tsx           # No change
│       ├── CountdownTimer.tsx          # No change
│       └── ConnectionStatus.tsx        # NEW: compact connection indicator dot
├── lib/
│   ├── actions/
│   │   └── station.ts                 # Modify: add endStation server action
│   └── hooks/
│       ├── useRealtimeChat.ts          # Modify: add onStationEnded callback, skip subscription in readOnly mode
│       ├── useConnectionStatus.ts      # NEW: onHeartbeat + navigator.onLine hook
│       ├── useCountdownTimer.ts        # No change
│       └── useAutoScroll.ts            # No change
└── supabase/
    └── migrations/
        └── 008_complete_station.sql    # NEW: complete_station Postgres function
```

### Pattern 1: Broadcast-Based Cross-Client Redirect (FLOW-01 + FLOW-02)

**What:** When any group member ends a station, broadcast a `station-ended` event on the existing channel. All subscribed clients (including the sender with `self: true`) react by navigating to `/dashboard`.

**When to use:** Any action by one user that should trigger navigation or state change for all connected group members.

**Example:**
```typescript
// === In ChatRoom.tsx: End station handler ===

async function handleEndStation() {
  // 1. Call server action to mark station as completed
  const result = await endStation(sessionId)
  if (result.error) {
    // Show error, don't redirect
    return
  }

  // 2. Broadcast station-ended event to all group members
  // (self: true means sender also receives this)
  await channelRef.current?.send({
    type: 'broadcast',
    event: 'station-ended',
    payload: { sessionId },
  })

  // 3. Navigate to dashboard (also triggered by broadcast listener below)
  router.push('/dashboard')
}

// === In useRealtimeChat.ts: Listen for station-ended ===

channel
  .on('broadcast', { event: 'new-message' }, (payload) => {
    // existing message handler...
  })
  .on('broadcast', { event: 'station-ended' }, () => {
    // Callback provided by the component
    onStationEnded?.()
  })
  .subscribe()
```

### Pattern 2: Atomic Station Completion via Postgres Function (FLOW-01)

**What:** A `complete_station` Postgres function atomically transitions `station_sessions.status` from `active` to `completed`, setting `completed_at = now()`. Uses `FOR UPDATE` row lock to prevent race conditions (two members clicking "end" simultaneously).

**When to use:** Any status transition that must be idempotent and concurrent-safe.

**Example:**
```sql
-- Source: Mirrors existing open_station pattern from 007_station_chat.sql

CREATE OR REPLACE FUNCTION public.complete_station(
  p_session_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT * INTO v_session
  FROM station_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN json_build_object('error', 'Okt ikke funnet');
  END IF;

  -- Only active sessions can be completed
  IF v_session.status != 'active' THEN
    RETURN json_build_object('error', 'Stasjonen er ikke aktiv');
  END IF;

  -- Transition to completed
  UPDATE station_sessions
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_session_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 3: Read-Only Chat Mode (FLOW-03)

**What:** The same station page (`/dashboard/station/[sessionId]`) detects when `session.status === 'completed'` and renders the chat in read-only mode: no ChatInput, no Broadcast subscription, just the message history loaded via `loadMessages`.

**When to use:** Viewing historical data in the same layout used for the live experience.

**Example:**
```typescript
// === In [sessionId]/page.tsx: Detect read-only mode ===

const isReadOnly = session.status === 'completed'

return (
  <ChatRoom
    sessionId={session.id}
    userId={user.id}
    // ... other props
    readOnly={isReadOnly}
    initialMessages={formattedMessages}
  />
)

// === In ChatRoom.tsx: Conditional rendering ===

export default function ChatRoom({ readOnly = false, ...props }: ChatRoomProps) {
  // Skip Broadcast subscription in read-only mode
  const { messages, setMessages, sendBroadcast } = readOnly
    ? { messages: [], setMessages: () => {}, sendBroadcast: async () => {} }
    : useRealtimeChat(sessionId, userId)

  // NOTE: The above violates React hook rules (conditional hook call).
  // Better approach: pass readOnly to useRealtimeChat and skip subscription internally.

  return (
    <div className="flex flex-col h-dvh bg-warm-white/50">
      <StationHeader
        stationTitle={stationTitle}
        stationNumber={stationNumber}
        endTimestamp={readOnly ? null : endTimestamp}
        readOnly={readOnly}
      />

      {/* Message area - same for both modes */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Station context card */}
        {/* ... */}
        <MessageList messages={messages} currentUserId={userId} />
      </div>

      {/* Only show input in active mode */}
      {!readOnly && <ChatInput onSend={handleSend} />}

      {/* Read-only banner */}
      {readOnly && (
        <div className="px-4 py-3 bg-text-muted/10 text-center text-sm text-text-muted">
          Diskusjonen er avsluttet. Du kan lese tilbake samtalen.
        </div>
      )}
    </div>
  )
}
```

### Pattern 4: Connection Status Hook (FLOW-04)

**What:** A `useConnectionStatus` hook that combines two signals: (1) `navigator.onLine` for device-level offline detection (instant), and (2) Supabase `onHeartbeat` for WebSocket-specific health monitoring (detects server unreachable, timeout). Returns a unified status: `connected`, `reconnecting`, or `offline`.

**When to use:** Any real-time feature where users need to know if their connection is healthy.

**Example:**
```typescript
// Source: Supabase onHeartbeat docs + navigator.onLine browser API

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type ConnectionStatus = 'connected' | 'reconnecting' | 'offline'

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected'
  )

  useEffect(() => {
    const supabase = createClient()

    // Layer 1: Browser online/offline events (instant detection)
    function handleOnline() {
      // Don't immediately set 'connected' — wait for heartbeat confirmation
      setStatus('reconnecting')
    }
    function handleOffline() {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Layer 2: Supabase heartbeat monitoring (WebSocket-level health)
    supabase.realtime.onHeartbeat((heartbeatStatus: string) => {
      if (heartbeatStatus === 'ok') {
        setStatus('connected')
      } else if (heartbeatStatus === 'timeout' || heartbeatStatus === 'error') {
        setStatus('reconnecting')
      } else if (heartbeatStatus === 'disconnected') {
        setStatus('offline')
      }
      // 'sent' status is ignored (just means heartbeat was sent, waiting for reply)
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
```

### Pattern 5: Connection Status Indicator Component (FLOW-04)

**What:** A compact visual indicator showing connection health. A small colored dot with optional tooltip text, placed in the StationHeader next to the timer.

**Example:**
```typescript
'use client'
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus'

const statusConfig = {
  connected: { color: 'bg-green-500', label: '' }, // Hidden when connected
  reconnecting: { color: 'bg-yellow-500 animate-pulse', label: 'Kobler til...' },
  offline: { color: 'bg-red-500', label: 'Frakoblet' },
} as const

export default function ConnectionStatus() {
  const status = useConnectionStatus()

  // Don't show anything when connected (clean UI)
  if (status === 'connected') return null

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${statusConfig[status].color}`} />
      <span className="text-[10px] text-warm-white/70">
        {statusConfig[status].label}
      </span>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Polling for session status:** Do not use `setInterval` to poll the database for station completion. Use Broadcast events for instant cross-client notification.
- **Separate Broadcast channel for control events:** Do not create a second channel like `control:{sessionId}`. Reuse the existing `station:{sessionId}` channel. Just use a different event name (`station-ended` vs `new-message`).
- **Conditional hook calls:** Do not conditionally call `useRealtimeChat` based on `readOnly`. Instead, pass `readOnly` as a parameter to the hook so it can skip subscription internally while maintaining consistent hook call order.
- **Relying solely on `navigator.onLine`:** This only detects device-level offline. It does not detect when the WebSocket connection to Supabase has dropped (e.g., server restart, network partition). Always combine with `onHeartbeat`.
- **Blocking redirect on `endStation` error:** If the server action succeeds but the Broadcast send fails (extremely unlikely), the ending user should still navigate. Other clients will see the updated status on their next dashboard visit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-client redirect signaling | Custom polling or Postgres Changes listener | Broadcast event `station-ended` on existing channel | Instant delivery, no additional connections, clients already subscribed |
| Confirmation dialog UI | Custom modal with backdrop handling | Existing `Dialog` component (`src/components/ui/Dialog.tsx`) | Already built with `<dialog>` element, showModal/close, backdrop, Button integration |
| Connection health monitoring | Custom WebSocket ping/pong or periodic fetch | `supabase.realtime.onHeartbeat()` + `navigator.onLine` | Supabase handles heartbeat timing (25s default), exponential backoff reconnection |
| Atomic status transition | Client-side status check then UPDATE | `complete_station` Postgres function with `FOR UPDATE` | Prevents race condition when two members click "end" simultaneously |
| Read-only message rendering | Separate read-only page/component | `readOnly` prop on existing ChatRoom + `loadMessages` | Message history already loaded by the same `loadMessages` server action. Same layout, less code. |

**Key insight:** Phase 4 is primarily about wiring existing infrastructure together. The Broadcast channel, Dialog component, server action pattern, and message loading are all already built. The new code is: one Postgres function, one server action, one hook, one small component, and modifications to 4-5 existing files.

## Common Pitfalls

### Pitfall 1: Race Condition on "End Station" Click

**What goes wrong:** Two group members click "End Station" simultaneously. Both server actions try to update the session to 'completed'. One succeeds, the other sees unexpected state or errors.
**Why it happens:** Without row-level locking, both reads see `status = 'active'` and both attempt the UPDATE.
**How to avoid:** Use a Postgres function with `FOR UPDATE` row lock (same pattern as `open_station`). The function returns `{success: true}` on first call and `{error: 'Stasjonen er ikke aktiv'}` on second. The server action treats both as success (station is completed either way).
**Warning signs:** Error toast appearing for the second user who clicks "end".

### Pitfall 2: Broadcast Event Lost During Disconnect

**What goes wrong:** User A ends the station and broadcasts `station-ended`. User B is temporarily disconnected (phone screen off, backgrounded). User B never receives the redirect event and stays on the chat page.
**Why it happens:** Broadcast is ephemeral. If a client is not connected when the event is sent, they miss it.
**How to avoid:** Two layers: (1) The Broadcast event handles the instant case. (2) When User B reconnects or navigates back, the station page's server component checks `session.status`. If it's 'completed', render read-only mode instead of active chat. The user is never "stuck" in an active chat for a completed station.
**Warning signs:** User still seeing active chat after station was ended by someone else.

### Pitfall 3: StationCard Click Handler for Completed Stations

**What goes wrong:** Completed stations are currently non-interactive (`isTappable = status !== 'completed'`). If we just change this without a navigation target, clicking does nothing or errors.
**Why it happens:** The existing StationCard was designed to only handle available/active stations.
**How to avoid:** For completed stations, the `onOpen` callback in StationSelector should navigate to `/dashboard/station/{sessionId}` using the existing session ID from the sessions array. The session ID is already available in the `sessions` prop.
**Warning signs:** Clicking a completed station does nothing, or navigates to an undefined URL.

### Pitfall 4: Hook Call Order Violation in Read-Only Mode

**What goes wrong:** If ChatRoom conditionally skips `useRealtimeChat()` when `readOnly` is true, React throws "Rendered more hooks than during the previous render."
**Why it happens:** React requires hooks to be called in the same order on every render. Conditional hook calls violate this rule.
**How to avoid:** Always call `useRealtimeChat`, but pass `readOnly` as a parameter. Inside the hook, skip the Broadcast subscription when `readOnly` is true. The hook still returns the same shape (messages, setMessages, etc.) but doesn't establish a WebSocket connection.
**Warning signs:** React error in console about hook order, component crashes.

### Pitfall 5: Connection Indicator Showing False "Reconnecting" on Initial Load

**What goes wrong:** When the page first loads, the heartbeat hasn't fired yet, so the connection status defaults to 'connected' (assumption) or shows 'reconnecting' briefly until the first heartbeat succeeds.
**Why it happens:** `onHeartbeat` fires on heartbeat cycle intervals (default 25s), not immediately on connection.
**How to avoid:** Default to 'connected' status. Only show non-connected states when actively detected. Use `navigator.onLine` as the initial check (it's synchronous). The first heartbeat will confirm or correct within 25 seconds.
**Warning signs:** Brief flash of "Reconnecting" indicator on page load.

### Pitfall 6: Supabase Client Instance in useConnectionStatus

**What goes wrong:** Creating a new Supabase client inside `useConnectionStatus` creates a separate Realtime connection from the one used by `useRealtimeChat`. The heartbeat status may not reflect the actual chat channel's health.
**Why it happens:** `createClient()` from `@supabase/ssr` browser client creates a singleton (Supabase browser client caches the instance). So this is actually fine -- both hooks use the same underlying client.
**How to avoid:** Verify that `createClient` returns a singleton in the browser. The existing `src/lib/supabase/client.ts` uses `createBrowserClient` from `@supabase/ssr`, which does cache the client instance. No action needed, but worth noting.
**Warning signs:** Multiple WebSocket connections in Network tab (would indicate non-singleton behavior).

## Code Examples

Verified patterns from official sources and existing codebase:

### Server Action: endStation
```typescript
// Source: Mirrors existing openStation pattern in src/lib/actions/station.ts

export async function endStation(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Verify user is a member of this session's group
  const { data: session } = await supabase
    .from('station_sessions')
    .select('group_id')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Okt ikke funnet' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', session.group_id)
    .maybeSingle()

  if (!membership) return { error: 'Du er ikke i denne gruppen' }

  // Call the atomic complete_station Postgres function
  const { data, error } = await supabase.rpc('complete_station', {
    p_session_id: sessionId,
  })

  if (error) return { error: 'Kunne ikke avslutte stasjonen' }

  const result = data as { success?: boolean; error?: string }
  if (result.error) return { error: result.error }

  return {}
}
```

### Confirmation Dialog Integration
```typescript
// Source: Existing Dialog component + StationHeader placement

// In ChatRoom or StationHeader:
const [showEndDialog, setShowEndDialog] = useState(false)
const [ending, setEnding] = useState(false)

<Dialog
  open={showEndDialog}
  onClose={() => setShowEndDialog(false)}
  onConfirm={async () => {
    setEnding(true)
    await handleEndStation()
    setEnding(false)
  }}
  title="Avslutt stasjon?"
  description="Er du sikker pa at du vil avslutte denne stasjonen? Alle gruppemedlemmer vil bli sendt tilbake til stasjonsoversikten."
  confirmLabel="Avslutt"
  confirmVariant="danger"
  loading={ending}
/>
```

### Channel Subscribe Status Monitoring
```typescript
// Source: Verified from installed @supabase/realtime-js source code

channel.subscribe((status, err) => {
  // Status values (from REALTIME_SUBSCRIBE_STATES enum):
  // 'SUBSCRIBED' - Successfully connected to channel
  // 'CHANNEL_ERROR' - Error subscribing (err.message available)
  // 'TIMED_OUT' - Server did not respond in time
  // 'CLOSED' - Channel was unexpectedly closed

  if (status === 'SUBSCRIBED') {
    console.log('Connected to station channel')
  }
  if (status === 'CHANNEL_ERROR') {
    console.error('Channel error:', err?.message)
  }
})
```

### Heartbeat Status Values
```typescript
// Source: Verified from installed @supabase/realtime-js/dist/module/RealtimeClient.js

// heartbeatCallback receives these status values:
// 'sent' - Heartbeat message sent to server (waiting for reply)
// 'ok' - Server responded successfully to heartbeat
// 'error' - Communication error occurred
// 'timeout' - Server response delayed beyond threshold
// 'disconnected' - Connection lost

// The callback also receives latency (ms) as second parameter when status is 'ok':
supabase.realtime.onHeartbeat((status: string, latency?: number) => {
  if (status === 'ok') {
    console.log(`Heartbeat OK, latency: ${latency}ms`)
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling DB for session status changes | Broadcast events for instant cross-client signaling | Supabase Broadcast stable since 2023 | Zero polling, instant notification, no DB load |
| `navigator.onLine` only for connection status | `onHeartbeat` + `navigator.onLine` combined | `onHeartbeat` available in supabase-js v2.x (2024+) | Detects both device offline AND WebSocket-level disconnections |
| Custom reconnection logic | Supabase built-in exponential backoff (1s, 2s, 5s, 10s) | Supabase realtime-js handles internally | No custom retry logic needed. Heartbeat detects and client auto-reconnects. |
| Separate read-only page for completed content | Same page with `readOnly` prop/mode | Pattern, not library change | Single component serves both active and historical views. Less code to maintain. |

**Deprecated/outdated:**
- Nothing new deprecated since Phase 3 research. Same cautions apply: `useFormState` (use `useActionState`), `getSession()` (use `getUser()`), `h-screen` (use `h-dvh`).

## Open Questions

1. **Where should the "End Station" button be placed?**
   - What we know: StationHeader currently has a back button (left), station title (center), and countdown timer (right). The chat area has the station context card and message list.
   - What's unclear: Whether to put the end button in the header (next to back button or replacing it) or as a prominent button below the timer / in the chat area. Mobile screen real estate is limited.
   - Recommendation: Place an "Avslutt" button in the StationHeader, to the left of the timer (or as a small icon button). This keeps the action accessible but not accidentally tappable. The confirmation dialog provides the safety net. Alternative: a bottom-area button visible after timer expires ("Tiden er ute! Avslutt stasjonen").

2. **Should the endStation action verify the station timer has expired?**
   - What we know: The timer is a soft deadline ("Tiden er ute!" but chat remains open). The PRD says "any group member can end the station" without mentioning timer state as a condition.
   - What's unclear: Whether users should be able to end a station early (before 15 minutes).
   - Recommendation: Allow ending at any time (no timer check). The confirmation dialog provides sufficient friction. Enforcing timer completion would frustrate groups who finish early. This matches the PRD which has no timer constraint on station ending.

3. **Should completed StationCards show the conversation count or last message preview?**
   - What we know: Currently completed cards show "Fullfort" badge and are non-interactive with `opacity-60`.
   - What's unclear: Whether users want a preview of the completed discussion before tapping in.
   - Recommendation: Keep it simple for v1. Show "Fullfort" badge and make tappable. Add a subtle visual change (like a "Se samtale" secondary label or a small icon indicating it's viewable). Message preview would require an additional DB query on the dashboard which adds complexity for minimal benefit.

## Sources

### Primary (HIGH confidence)
- Installed `@supabase/realtime-js` source code (node_modules) - Verified `REALTIME_SUBSCRIBE_STATES` enum values (SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR), `onHeartbeat` API, heartbeat status values (sent, ok, error, timeout, disconnected), CONNECTION_STATE enum
- Existing codebase: `src/lib/hooks/useRealtimeChat.ts`, `src/lib/actions/station.ts`, `src/components/ui/Dialog.tsx`, `src/components/station/ChatRoom.tsx`, `src/components/station/StationCard.tsx` - Pattern verification for all modifications
- `supabase/migrations/007_station_chat.sql` - Existing `open_station` function pattern to mirror for `complete_station`

### Secondary (MEDIUM confidence)
- [Supabase Realtime Heartbeat Monitoring](https://supabase.com/docs/guides/troubleshooting/realtime-heartbeat-messages) - `onHeartbeat` API, heartbeat status values, connection indicator pattern
- [Supabase Silent Disconnections Guide](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) - `heartbeatCallback` pattern, Web Worker integration for background apps
- [Supabase Broadcast docs](https://supabase.com/docs/guides/realtime/broadcast) - Broadcast send/receive pattern, `self` config for sender receiving own events
- [Supabase Channel Subscribe Discussion #10293](https://github.com/orgs/supabase/discussions/10293) - Channel status callback pattern with all four states

### Tertiary (LOW confidence)
- [Supabase Auto Reconnect Discussion #27513](https://github.com/orgs/supabase/discussions/27513) - Reconnection behavior after CLOSED state (community reports, not official docs)
- [Supabase Realtime Reconnect Issue #1088](https://github.com/supabase/realtime/issues/1088) - Known reconnection issues after TIMED_OUT (may be resolved in current version)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies. All APIs verified in installed source code.
- Architecture: HIGH - All patterns build on existing Phase 3 infrastructure. Broadcast, Dialog, server actions, and hooks are proven patterns in this codebase.
- Pitfalls: HIGH - Race condition prevention mirrors existing `open_station` pattern. Hook order violation is a well-known React constraint. Broadcast event loss mitigated by server-side fallback.
- Connection status: HIGH - `onHeartbeat` API verified in installed `@supabase/realtime-js` source. All five status values confirmed: sent, ok, error, timeout, disconnected.

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days - stable stack, no breaking changes expected)
