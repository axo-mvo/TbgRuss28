---
phase: 04-station-flow-and-resilience
plan: 02
subsystem: station-flow
tags: [react, supabase-realtime, connection-status, read-only, navigation]

# Dependency graph
requires:
  - phase: 04-station-flow-and-resilience
    provides: readOnly mode in ChatRoom and useRealtimeChat, StationHeader readOnly label, complete_station RPC
provides:
  - Tappable completed StationCards with "Se samtale" label
  - Completed station navigation from StationSelector
  - Read-only page detection in station page (passes readOnly + null endTimestamp)
  - useConnectionStatus hook (onHeartbeat + navigator.onLine)
  - ConnectionStatus indicator component (hidden when connected)
  - StationHeader ConnectionStatus integration
affects: [05-polish, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [connection-health-monitoring, completed-station-navigation]

key-files:
  created:
    - src/lib/hooks/useConnectionStatus.ts
    - src/components/station/ConnectionStatus.tsx
  modified:
    - src/components/station/StationCard.tsx
    - src/components/station/StationSelector.tsx
    - src/app/dashboard/station/[sessionId]/page.tsx
    - src/components/station/StationHeader.tsx

key-decisions:
  - "ConnectionStatus hidden when connected -- clean UI default, only shows on degradation"
  - "Online event sets reconnecting (not connected) -- waits for heartbeat confirmation before showing green"

patterns-established:
  - "Connection health: combine browser online/offline events with Supabase realtime heartbeat for accurate status"
  - "Completed navigation: same router.push pattern as active stations, with readOnly prop chain through page -> ChatRoom"

requirements-completed: [FLOW-03, FLOW-04]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 4 Plan 2: Completed Station Viewing and Connection Status Summary

**Tappable completed stations with read-only chat viewing, and a connection status indicator using Supabase realtime heartbeat + navigator.onLine**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T18:25:00Z
- **Completed:** 2026-02-19T18:27:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Completed stations are now tappable with "Se samtale" hint and navigate to read-only chat view
- Station page detects completed status and passes readOnly=true and endTimestamp=null to ChatRoom
- useConnectionStatus hook provides connection health from Supabase heartbeat + browser online/offline events
- ConnectionStatus indicator renders yellow pulsing dot for reconnecting, red dot for offline, hidden when connected
- StationHeader shows ConnectionStatus between title and timer area (only for active stations)

## Task Commits

Each task was committed atomically:

1. **Task 1: Completed station navigation and read-only page detection** - `9c9ae59` (feat)
2. **Task 2: Connection status hook and indicator component** - `ce8baa7` (feat)

## Files Created/Modified
- `src/components/station/StationCard.tsx` - Completed stations now tappable (opacity-75), "Se samtale" label added
- `src/components/station/StationSelector.tsx` - Added completed status handling in handleOpen, navigates to station page
- `src/app/dashboard/station/[sessionId]/page.tsx` - Detects completed status, passes readOnly and null endTimestamp to ChatRoom
- `src/lib/hooks/useConnectionStatus.ts` - Hook combining Supabase realtime onHeartbeat with browser online/offline events
- `src/components/station/ConnectionStatus.tsx` - Compact dot indicator with Norwegian labels (Kobler til.../Frakoblet)
- `src/components/station/StationHeader.tsx` - Renders ConnectionStatus between title and timer when not readOnly

## Decisions Made
- ConnectionStatus hidden when connected for clean UI -- only shows indicators on degradation
- Browser online event sets status to 'reconnecting' (not 'connected') -- waits for heartbeat confirmation before showing healthy
- Completed stations use opacity-75 (not 60) for subtler dimming that still looks tappable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 04 complete: end station flow, completed station viewing, and connection resilience all implemented
- Ready for Phase 05 (polish/testing)
- Full station lifecycle covered: open -> chat -> end -> view completed

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (9c9ae59, ce8baa7) verified in git log.

---
*Phase: 04-station-flow-and-resilience*
*Completed: 2026-02-19*
