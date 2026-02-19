---
phase: 03-station-chat-and-timer
plan: 01
subsystem: database, api, hooks
tags: [supabase-realtime, broadcast, rls, postgres-function, react-hooks, countdown-timer, auto-scroll]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Supabase client/server setup, auth middleware, database schema"
  - phase: 02-admin-panel
    provides: "Groups, group_members, parent-youth links"
provides:
  - "RLS policy on realtime.messages for private Broadcast channel authorization"
  - "open_station Postgres function for atomic station opening"
  - "Server actions: openStation, sendMessage, loadMessages"
  - "useRealtimeChat hook with private Broadcast and deduplication"
  - "useCountdownTimer hook with server-timestamp sync and color states"
  - "useAutoScroll hook with IntersectionObserver scroll detection"
affects: [03-02-PLAN, station-ui, chat-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-path chat: Broadcast for instant delivery, DB for persistence"
    - "Server-timestamp timer sync: store end_timestamp, clients compute remaining"
    - "Private Broadcast channels with RLS on realtime.messages"
    - "Atomic station opening via Postgres function with COALESCE for first-opener timestamp"

key-files:
  created:
    - supabase/migrations/007_station_chat.sql
    - src/lib/actions/station.ts
    - src/lib/hooks/useRealtimeChat.ts
    - src/lib/hooks/useCountdownTimer.ts
    - src/lib/hooks/useAutoScroll.ts
  modified: []

key-decisions:
  - "open_station uses SECURITY DEFINER Postgres function with FOR UPDATE row lock for atomicity"
  - "COALESCE on started_at/end_timestamp preserves first opener's timestamp in concurrent upserts"
  - "useRealtimeChat exposes setMessages for merging initial history from loadMessages"
  - "ChatMessage includes status field (sent/pending/error) for optimistic UI tracking"

patterns-established:
  - "Station server actions pattern: getUser() then group_members lookup then operation"
  - "Private Broadcast channel pattern: setAuth() then channel() with private:true config"
  - "Timer color states: white >5min, yellow 1-5min, red <1min"

requirements-completed: [CHAT-02, CHAT-03, CHAT-06, CHAT-07, TIMR-01, TIMR-02]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 3 Plan 1: Station Backend Infrastructure Summary

**Realtime channel authorization via RLS on realtime.messages, atomic station opening with Postgres function, and three React hooks for chat broadcast, countdown timer, and auto-scroll**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T14:10:24Z
- **Completed:** 2026-02-19T14:13:24Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- RLS policy on `realtime.messages` enabling private Broadcast channels scoped to group membership via station_sessions join
- Atomic `open_station` Postgres function enforcing one-active-station-per-group with COALESCE to preserve first opener's timestamp
- Three server actions (openStation, sendMessage, loadMessages) following established admin.ts pattern with Norwegian error messages
- useRealtimeChat hook with `setAuth()`, private channel, `self:true` broadcast, and ID-based deduplication
- useCountdownTimer hook computing remaining seconds from server-generated end_timestamp with color transitions
- useAutoScroll hook using IntersectionObserver on sentinel element for scroll-up detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and server actions** - `d87496e` (feat)
2. **Task 2: React hooks for real-time chat, timer, auto-scroll** - `c56677e` (feat)

## Files Created/Modified
- `supabase/migrations/007_station_chat.sql` - RLS policy for realtime.messages and open_station Postgres function
- `src/lib/actions/station.ts` - Server actions: openStation (RPC call), sendMessage (DB insert), loadMessages (profile-joined select)
- `src/lib/hooks/useRealtimeChat.ts` - Broadcast subscription hook with private channel auth and message deduplication
- `src/lib/hooks/useCountdownTimer.ts` - Server-timestamp countdown with color states (white/yellow/red) and display formatting
- `src/lib/hooks/useAutoScroll.ts` - IntersectionObserver-based auto-scroll with scroll-up detection

## Decisions Made
- Used `SECURITY DEFINER` with `FOR UPDATE` row lock on open_station function for true atomicity (plan suggested it, confirmed correct approach)
- Added `status` field to ChatMessage type (sent/pending/error) for optimistic UI support in Plan 02
- Exposed `setMessages` from useRealtimeChat so the page component can merge initial message history from loadMessages
- loadMessages handles Supabase PostgREST join variability (object vs array) with defensive type handling

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` section specifies:
- **Supabase Realtime Settings:** Disable "Enable Realtime for anonymous users" toggle in Supabase Dashboard -> Project Settings -> API -> Realtime Settings. This is required for private channels to work correctly.

## Next Phase Readiness
- All 5 backend artifacts ready for Plan 02 UI components to import
- Server actions follow established pattern and compile cleanly
- Hooks are client-side ("use client") and ready for component integration
- No blockers for Plan 02 execution

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (d87496e, c56677e) verified in git log. Build passes with zero errors.

---
*Phase: 03-station-chat-and-timer*
*Completed: 2026-02-19*
