---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/009_view_station_and_realtime.sql
  - src/lib/actions/station.ts
  - src/components/station/StationSelector.tsx
  - src/app/dashboard/station/[sessionId]/page.tsx
  - src/components/station/ChatRoom.tsx
  - src/lib/hooks/useCountdownTimer.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "When one group member opens a station, other members see the station card status change to 'active' on their dashboard without refreshing"
    - "When a station is completed, all group members' dashboards update the card to 'completed' without refreshing"
    - "Tapping an available station navigates to the station page showing questions/context but does NOT start the timer"
    - "User must click 'Start diskusjon' button to begin the 15-minute countdown"
    - "After clicking start, the chat input appears and the timer begins counting down"
  artifacts:
    - path: "supabase/migrations/009_view_station_and_realtime.sql"
      provides: "view_station Postgres function and Realtime publication for station_sessions"
    - path: "src/lib/actions/station.ts"
      provides: "viewStation server action for pre-start navigation"
    - path: "src/components/station/StationSelector.tsx"
      provides: "Real-time session subscription updating station cards live"
    - path: "src/app/dashboard/station/[sessionId]/page.tsx"
      provides: "Pre-start state detection passing isStarted to ChatRoom"
    - path: "src/components/station/ChatRoom.tsx"
      provides: "Pre-start view with station context and 'Start diskusjon' button"
  key_links:
    - from: "src/components/station/StationSelector.tsx"
      to: "supabase realtime station_sessions"
      via: "Postgres Changes subscription filtered by group_id"
      pattern: "supabase\\.channel.*postgres_changes.*station_sessions"
    - from: "src/components/station/StationSelector.tsx"
      to: "src/lib/actions/station.ts viewStation"
      via: "viewStation call on available station tap"
      pattern: "viewStation"
    - from: "src/components/station/ChatRoom.tsx"
      to: "src/lib/actions/station.ts openStation"
      via: "Start button calls openStation to transition session to active"
      pattern: "openStation.*stationId"
---

<objective>
Add real-time dashboard updates and an explicit start button for station discussions.

Purpose: (1) Group members should see station card status changes (available -> active -> completed) live on the dashboard without page refresh. (2) Users should preview station questions before starting the timer -- separating "viewing" from "starting" a discussion.

Output: Updated StationSelector with Realtime subscription, new viewStation action, modified station page and ChatRoom with pre-start state.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@supabase/migrations/001_schema.sql
@supabase/migrations/002_rls.sql
@supabase/migrations/007_station_chat.sql
@src/lib/actions/station.ts
@src/components/station/StationSelector.tsx
@src/components/station/StationCard.tsx
@src/app/dashboard/station/[sessionId]/page.tsx
@src/components/station/ChatRoom.tsx
@src/components/station/StationHeader.tsx
@src/lib/hooks/useCountdownTimer.ts
@src/lib/hooks/useRealtimeChat.ts
@src/app/dashboard/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration + viewStation server action</name>
  <files>
    supabase/migrations/009_view_station_and_realtime.sql
    src/lib/actions/station.ts
  </files>
  <action>
**Migration `009_view_station_and_realtime.sql`:**

1. Add `station_sessions` to the Supabase Realtime publication so Postgres Changes events are emitted:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE station_sessions;
```

2. Create a `view_station` Postgres function (SECURITY DEFINER) that ensures a session row exists for a station+group pair WITHOUT starting the timer. Logic:
   - If session already exists (any status), return its `{id, status, end_timestamp}` as-is (do not modify it)
   - If no session exists, INSERT a new row with `status = 'available'`, `started_at = NULL`, `end_timestamp = NULL`, and return `{id, status: 'available', end_timestamp: null}`
   - Uses `INSERT ... ON CONFLICT (station_id, group_id) DO NOTHING` then a SELECT to get the row (avoids modifying existing rows)
   - Parameters: `p_station_id UUID`, `p_group_id UUID`
   - Returns JSON: `{id, status, end_timestamp}` or `{error}`

**Server action in `src/lib/actions/station.ts`:**

Add a new `viewStation` server action (above `openStation`):
```typescript
export async function viewStation(
  stationId: string
): Promise<{ sessionId?: string; status?: string; endTimestamp?: string | null; error?: string }>
```
- Auth check (same pattern as openStation)
- Get user's group_id via group_members
- Call `supabase.rpc('view_station', { p_station_id: stationId, p_group_id: membership.group_id })`
- Return `{ sessionId: result.id, status: result.status, endTimestamp: result.end_timestamp }`

Also modify `openStation` to accept `stationId` (it already does) -- no changes needed to openStation itself. It already handles the case where a session exists with status='available' via ON CONFLICT (transitions to 'active' and sets timer).

Wait -- actually the existing `open_station` RPC ON CONFLICT clause uses `COALESCE(station_sessions.started_at, now())` which preserves existing `started_at`. But for a 'view_station'-created row, `started_at` is NULL, so COALESCE will set it to `now()`. And `end_timestamp` is NULL, so COALESCE will set it to `now() + 15 min`. This is correct behavior -- when the user clicks "Start", the timer starts fresh.

No changes needed to `openStation` server action or `open_station` RPC.
  </action>
  <verify>
    - `supabase/migrations/009_view_station_and_realtime.sql` exists with both the publication ALTER and view_station function
    - `viewStation` export exists in `src/lib/actions/station.ts` with proper auth, group lookup, and RPC call
    - TypeScript compiles: `npx tsc --noEmit`
  </verify>
  <done>
    - New `view_station` Postgres function creates session rows in 'available' status without starting timers
    - `station_sessions` table is added to Realtime publication
    - `viewStation` server action is callable from client components
  </done>
</task>

<task type="auto">
  <name>Task 2: Real-time dashboard updates + explicit start button UI</name>
  <files>
    src/components/station/StationSelector.tsx
    src/app/dashboard/station/[sessionId]/page.tsx
    src/components/station/ChatRoom.tsx
    src/lib/hooks/useCountdownTimer.ts
  </files>
  <action>
**StationSelector.tsx -- Real-time subscription:**

1. Add a Supabase Realtime subscription to listen for Postgres Changes on `station_sessions` filtered by `group_id`:
```typescript
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
```

2. Track sessions in local state (initialize from props):
```typescript
const [liveSessions, setLiveSessions] = useState<Session[]>(sessions)
```

3. In a `useEffect`, create a Supabase Realtime channel subscribing to postgres_changes on `station_sessions` with filter `group_id=eq.{groupId}`:
```typescript
useEffect(() => {
  const supabase = createClient()
  const channel = supabase
    .channel(`dashboard:${groupId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'station_sessions',
      filter: `group_id=eq.${groupId}`,
    }, (payload) => {
      // payload.new contains the updated/inserted row
      const row = payload.new as { station_id: string; id: string; status: string; end_timestamp: string | null }
      setLiveSessions(prev => {
        const idx = prev.findIndex(s => s.station_id === row.station_id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { station_id: row.station_id, id: row.id, status: row.status, end_timestamp: row.end_timestamp }
          return updated
        }
        return [...prev, { station_id: row.station_id, id: row.id, status: row.status, end_timestamp: row.end_timestamp }]
      })
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [groupId])
```

4. Use `liveSessions` instead of `sessions` prop everywhere in the component (getStatus, getSessionId, hasActiveStation).

5. Remove the `void _groupId` line -- groupId is now actively used for the subscription filter and is no longer unused.

6. Change `handleOpen` for **available** stations: call `viewStation(stationId)` instead of `openStation(stationId)`. Import `viewStation` from `@/lib/actions/station`. Navigate to the station page with the returned sessionId. The station page will show the pre-start view.

For **active** stations: keep existing behavior (navigate directly to station page -- it will show the active chat).
For **completed** stations: keep existing behavior (navigate to read-only view).

**Station page `[sessionId]/page.tsx` -- Pre-start detection:**

The page already fetches `session.status`. Pass the status to ChatRoom:
- Add prop `isStarted={session.status === 'active'}` (or equivalently, when status is 'available', the station hasn't started yet)
- Also pass `stationId={station.id}` to ChatRoom so it can call `openStation` on start

**ChatRoom.tsx -- Pre-start state:**

1. Add new props: `isStarted: boolean` (default true for backward compat), `stationId?: string`
2. Add local state: `const [started, setStarted] = useState(isStarted)`
3. Add local state for endTimestamp: `const [localEndTimestamp, setLocalEndTimestamp] = useState(endTimestamp)` -- this allows updating the timer after starting

4. When `!started`, render a pre-start view INSTEAD of the chat:
```tsx
if (!started) {
  return (
    <div className="flex flex-col h-dvh bg-warm-white/50">
      <StationHeader
        stationTitle={stationTitle}
        stationNumber={stationNumber}
        endTimestamp={null}
        readOnly={false}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Station context -- questions and tip */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary mb-2">
            Stasjon {stationNumber}: {stationTitle}
          </h2>
          {stationQuestions && stationQuestions.length > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-teal-primary/5 border border-teal-primary/10">
              <p className="text-sm font-semibold text-teal-primary mb-2">Diskusjonssprorsmal:</p>
              <ul className="space-y-2">
                {stationQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-text-primary pl-3 border-l-2 border-teal-primary/30">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stationTip && (
            <div className="p-4 rounded-xl bg-coral/5 border border-coral/10">
              <p className="text-sm text-text-muted italic">
                Tips: {stationTip}
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-text-muted text-center mb-4">
          Nar dere er klare, trykk start for a begynne diskusjonen. Nedtellingen starter da.
        </p>
      </div>

      <div className="px-4 py-4 border-t border-text-muted/10 bg-warm-white">
        <Button
          variant="primary"
          className="w-full"
          onClick={handleStart}
          disabled={starting}
        >
          {starting ? 'Starter...' : 'Start diskusjon'}
        </Button>
      </div>
    </div>
  )
}
```

5. Import Button from `@/components/ui/Button`. Add `handleStart` function:
```typescript
const [starting, setStarting] = useState(false)

async function handleStart() {
  if (!stationId) return
  setStarting(true)
  const result = await openStation(stationId)
  if (result.error) {
    console.error('Failed to start station:', result.error)
    setStarting(false)
    return
  }
  if (result.endTimestamp) {
    setLocalEndTimestamp(result.endTimestamp)
  }
  setStarted(true)
  setStarting(false)
}
```

6. Use `localEndTimestamp` instead of `endTimestamp` prop for the StationHeader and timer throughout the component. This ensures the timer starts correctly after the user clicks start.

7. The `useRealtimeChat` hook and message merge effect should still work as before once started=true. The hook subscribes on mount regardless -- that's fine since it needs to be ready when chat starts. Actually, looking at the hook, it subscribes based on sessionId which exists even in pre-start state. This is OK -- the channel will be ready when chat begins.

**useCountdownTimer.ts -- Handle null endTimestamp gracefully:**

The hook already handles `null` endTimestamp by skipping the effect. But it returns `remaining: 900` and `display: '15:00'` by default when endTimestamp is null. For the pre-start state, this would show "15:00" in the header. Instead:
- When `endTimestamp` is null, return `display: '--:--'` and `color: 'white'` and `expired: false`
- Change the initial useState from `900` to `-1` as a sentinel
- In the return: if `remaining < 0`, return the placeholder state

This ensures the timer shows "--:--" before the discussion starts (when endTimestamp is null).
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - StationSelector has a Supabase channel subscription on `station_sessions` with `group_id` filter
    - StationSelector calls `viewStation` for available stations instead of `openStation`
    - Station page passes `isStarted` and `stationId` to ChatRoom
    - ChatRoom renders pre-start view with "Start diskusjon" button when `!started`
    - ChatRoom calls `openStation` on start button click, then transitions to chat view
    - useCountdownTimer shows "--:--" when endTimestamp is null
  </verify>
  <done>
    - Dashboard station cards update in real-time when sessions change (opened/completed by any group member)
    - Tapping an available station shows a pre-start view with station questions and a "Start diskusjon" button
    - Clicking "Start diskusjon" calls openStation, starts the 15-minute timer, and transitions to the full chat view
    - Timer displays "--:--" in the header until the discussion is started
  </done>
</task>

</tasks>

<verification>
1. Open the app in two browser tabs as two members of the same group
2. In Tab 1, tap an available station -- should navigate to pre-start view showing questions and "Start diskusjon" button, no timer running
3. In Tab 2, verify the station card on the dashboard does NOT change status (still 'available' since we only created a pending session)
4. In Tab 1, click "Start diskusjon" -- timer starts, chat input appears
5. In Tab 2, verify the station card immediately changes to "Aktiv" (real-time update)
6. In Tab 1, end the station
7. In Tab 2, verify the station card immediately changes to "Fullfort" (real-time update)
</verification>

<success_criteria>
- Station cards on the dashboard update in real-time for all group members when a station is opened or completed
- Navigating to a station shows a preview with questions/tip and a "Start diskusjon" button
- Timer only begins when "Start diskusjon" is clicked, not on page load
- Existing flows (active station navigation, completed station read-only view) continue to work unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/1-realtime-dashboard-station-status-and-ex/1-SUMMARY.md`
</output>
