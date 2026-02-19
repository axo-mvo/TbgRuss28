---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/station/StationSelector.tsx
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "When one group member starts a station, other members viewing the dashboard see the station card change from 'Tilgjengelig' to 'Aktiv' within seconds without refreshing"
    - "When a station is completed, other members viewing the dashboard see the card change to 'Fullfort' within seconds without refreshing"
  artifacts:
    - path: "src/components/station/StationSelector.tsx"
      provides: "Realtime postgres_changes subscription with setAuth"
      contains: "setAuth"
  key_links:
    - from: "src/components/station/StationSelector.tsx"
      to: "supabase.realtime"
      via: "postgres_changes subscription with setAuth() auth token"
      pattern: "setAuth.*postgres_changes|postgres_changes.*setAuth"
---

<objective>
Fix dashboard realtime station state updates so group members see station status changes (available -> active -> completed) in realtime without page refresh.

Purpose: The StationSelector component already has a postgres_changes subscription, but it does not call `supabase.realtime.setAuth()` before subscribing. Without setAuth(), the Realtime server lacks the user's JWT needed to evaluate RLS policies on `station_sessions`, so events are silently dropped and never delivered to the client. This is confirmed by the pattern in `useRealtimeChat.ts` which correctly calls `setAuth()` before channel subscription.

Output: Working realtime dashboard updates when any group member starts or completes a station.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/station/StationSelector.tsx
@src/lib/hooks/useRealtimeChat.ts
@src/lib/supabase/client.ts
@.planning/quick/1-realtime-dashboard-station-status-and-ex/1-SUMMARY.md
@.planning/quick/2-fix-chat-messages-not-appearing-add-opti/2-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add setAuth() to StationSelector realtime subscription and improve reliability</name>
  <files>src/components/station/StationSelector.tsx</files>
  <action>
    The root cause: StationSelector subscribes to postgres_changes on `station_sessions` but never calls `supabase.realtime.setAuth()`. The Realtime server needs the user's JWT to evaluate RLS policies and determine which change events to deliver. Without it, the subscription connects but receives no events.

    Fix the useEffect subscription block (lines ~41-89) in StationSelector.tsx:

    1. Make the useEffect callback async-aware using a `cancelled` flag pattern (same pattern as useRealtimeChat.ts lines 42-81).

    2. BEFORE creating the channel, call `await supabase.realtime.setAuth()` -- this sends the user's JWT to the Realtime server so it can evaluate RLS policies for postgres_changes events.

    3. After setAuth resolves, check the `cancelled` flag before proceeding.

    4. Keep the existing channel subscription logic intact:
       - Channel name: `dashboard:${groupId}`
       - postgres_changes on `station_sessions` filtered by `group_id=eq.${groupId}`
       - The payload handler that updates `liveSessions` state

    5. In the cleanup function, set `cancelled = true` and call `supabase.removeChannel(channel)` (keep existing cleanup pattern).

    The key change is adding `setAuth()` before `.subscribe()`. The rest of the subscription logic is already correct and should remain unchanged.

    Reference pattern from useRealtimeChat.ts:
    ```
    supabase.realtime.setAuth().then(() => {
      if (cancelled) return
      // ... create channel and subscribe
    })
    ```

    You can use the same `.then()` pattern or an async IIFE -- either works. The critical thing is setAuth() completes BEFORE subscribe().
  </action>
  <verify>
    1. `npx tsc --noEmit` passes with no errors
    2. `npm run build` succeeds
    3. Grep the file to confirm `setAuth` appears before the channel subscription
    4. Verify the cleanup properly handles the async pattern (cancelled flag)
  </verify>
  <done>
    StationSelector.tsx calls supabase.realtime.setAuth() before subscribing to postgres_changes, matching the proven pattern from useRealtimeChat.ts. TypeScript compiles clean and build succeeds.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- TypeScript compiles without errors
2. `npm run build` -- Next.js production build succeeds
3. Manual test: Open dashboard on two devices/tabs logged in as different group members. Start a station on one device. The other device should see the station card update from "Tilgjengelig" to "Aktiv" within a few seconds without refreshing.
</verification>

<success_criteria>
- StationSelector realtime subscription includes setAuth() call before channel subscription
- TypeScript compiles clean, build succeeds
- Dashboard station cards update in realtime across group members without page refresh
</success_criteria>

<output>
After completion, create `.planning/quick/3-dashboard-realtime-station-state-updates/3-SUMMARY.md`
</output>
