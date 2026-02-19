---
phase: 04-station-flow-and-resilience
plan: 01
subsystem: station-flow
tags: [postgres, supabase-rpc, broadcast, realtime, react, dialog]

# Dependency graph
requires:
  - phase: 03-station-chat-and-timer
    provides: ChatRoom, useRealtimeChat, StationHeader, station.ts server actions, 007_station_chat.sql
provides:
  - complete_station Postgres function (atomic idempotent station completion)
  - endStation server action with group membership verification
  - station-ended broadcast event listener in useRealtimeChat
  - readOnly mode for ChatRoom and useRealtimeChat
  - End station confirmation dialog in ChatRoom
  - Avslutt button in StationHeader
affects: [04-02-resilience, station-page, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [idempotent-rpc, broadcast-redirect, readOnly-mode]

key-files:
  created:
    - supabase/migrations/008_complete_station.sql
  modified:
    - src/lib/actions/station.ts
    - src/lib/hooks/useRealtimeChat.ts
    - src/components/station/ChatRoom.tsx
    - src/components/station/StationHeader.tsx

key-decisions:
  - "Idempotent completion: already-completed sessions return success, not error (prevents second-clicker seeing error toast)"
  - "onStationEnded stored in ref to avoid re-triggering useEffect on callback identity changes"
  - "channelRef exposed from useRealtimeChat so ChatRoom can broadcast station-ended directly after endStation action"

patterns-established:
  - "Idempotent RPC: non-active status returns success instead of error for race-safe multi-user flows"
  - "Broadcast-then-redirect: action caller broadcasts event then redirects; receivers redirect via listener callback"
  - "readOnly mode: hook skips subscription, component swaps input for banner"

requirements-completed: [FLOW-01, FLOW-02]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 4 Plan 1: End Station Flow Summary

**Atomic end-station flow with complete_station RPC, broadcast redirect, confirmation dialog, and readOnly mode for completed stations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T17:48:30Z
- **Completed:** 2026-02-19T17:51:43Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Atomic idempotent complete_station Postgres function with FOR UPDATE row lock
- endStation server action with group membership verification before RPC call
- station-ended broadcast listener in useRealtimeChat redirects all group members to /dashboard
- readOnly mode: ChatRoom hides input, shows "Diskusjonen er avsluttet" banner, useRealtimeChat skips subscription
- Confirmation dialog ("Avslutt stasjon?") with danger button and loading state
- StationHeader shows "Avslutt" button when active, "Fullfort" label when readOnly

## Task Commits

Each task was committed atomically:

1. **Task 1: complete_station Postgres function and endStation server action** - `a4eecac` (feat)
2. **Task 2: useRealtimeChat readOnly mode, station-ended listener, and ChatRoom end-station UI** - `71d3c4a` (feat)

## Files Created/Modified
- `supabase/migrations/008_complete_station.sql` - Atomic idempotent station completion function (SECURITY DEFINER, FOR UPDATE lock)
- `src/lib/actions/station.ts` - Added endStation server action with group membership check and complete_station RPC
- `src/lib/hooks/useRealtimeChat.ts` - Added readOnly mode (skips subscription), station-ended broadcast listener, exposed channelRef
- `src/components/station/ChatRoom.tsx` - End station dialog, handleEndStation flow, readOnly banner replacing ChatInput
- `src/components/station/StationHeader.tsx` - Avslutt button when active, Fullfort label when readOnly, onEndStation callback prop

## Decisions Made
- Idempotent completion: already-completed sessions return success, not error (prevents second-clicker seeing error toast)
- onStationEnded stored in useRef to avoid re-triggering subscription useEffect on callback identity changes
- channelRef exposed from useRealtimeChat so ChatRoom can broadcast station-ended event directly after endStation action succeeds

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- End station flow complete, ready for Plan 04-02 (resilience: timer expiry handling, error recovery, reconnection)
- readOnly mode foundation in place for viewing completed station history
- Station page needs to pass readOnly prop when session status is 'completed' (likely in 04-02 or station page updates)

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (a4eecac, 71d3c4a) verified in git log.

---
*Phase: 04-station-flow-and-resilience*
*Completed: 2026-02-19*
