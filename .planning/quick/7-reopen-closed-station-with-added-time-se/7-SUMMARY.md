---
phase: quick-7
plan: 1
subsystem: station
tags: [postgres, realtime, dialog, mobile-ui]

# Dependency graph
requires:
  - phase: 03-station
    provides: "open_station/complete_station DB functions, ChatRoom component, useRealtimeChat hook"
provides:
  - "reopen_station Postgres function for atomic station reopening"
  - "reopenStation server action with auth + membership checks"
  - "ReopenDialog component with time selection pills"
  - "localReadOnly state pattern for seamless readOnly-to-active transition"
affects: [station, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "localReadOnly state to allow client-side transition from readOnly to active without page reload"

key-files:
  created:
    - "supabase/migrations/014_reopen_station.sql"
    - "src/components/station/ReopenDialog.tsx"
  modified:
    - "src/lib/actions/station.ts"
    - "src/components/station/ChatRoom.tsx"

key-decisions:
  - "Used localReadOnly state (not prop) so ChatRoom can transition from completed to active without page reload"
  - "Used inline button element (not Button component) for Reopen in footer to avoid full-width min-height styling"
  - "Pass localReadOnly to useRealtimeChat so subscription activates automatically on reopen"

patterns-established:
  - "localReadOnly pattern: initialize from prop, mutate locally for dynamic state transitions"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-19
---

# Quick Task 7: Reopen Closed Station Summary

**Reopen completed stations with selectable extra time (2/5/10/15 min) via atomic DB function, time-pill dialog, and seamless readOnly-to-active UI transition**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T22:29:49Z
- **Completed:** 2026-02-19T22:32:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Atomic reopen_station Postgres function with FOR UPDATE lock, status validation, and one-active-station-per-group constraint
- reopenStation server action with auth, group membership, and extra-minutes validation
- Mobile-first ReopenDialog with 4 tappable time pills (2, 5, 10, 15 min) using native dialog element
- Seamless client-side transition from readOnly to active via localReadOnly state -- no page reload needed, realtime subscription activates automatically

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reopen_station DB function and server action** - `6fdd8d6` (feat)
2. **Task 2: Create ReopenDialog and integrate into ChatRoom** - `030c2d5` (feat)

## Files Created/Modified
- `supabase/migrations/014_reopen_station.sql` - Atomic reopen_station function (SECURITY DEFINER, FOR UPDATE lock)
- `src/lib/actions/station.ts` - Added reopenStation server action
- `src/components/station/ReopenDialog.tsx` - Time selection dialog with 4 pill buttons
- `src/components/station/ChatRoom.tsx` - Reopen button in footer, localReadOnly state, ReopenDialog integration

## Decisions Made
- Used `localReadOnly` state initialized from `readOnly` prop so the component can transition from completed to active without a page reload. The `useRealtimeChat` hook receives `localReadOnly` so it starts subscription when station is reopened.
- Used a plain `<button>` element for the "Gjenapne" button in the footer rather than the `Button` component, since Button has `w-full` and `min-h-[44px]` baked in, which would be too large for the inline footer layout.
- Pass `localReadOnly ? null : localEndTimestamp` to StationHeader so the timer only shows when active.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Supabase not linked locally (no project ref) -- migration file created but `supabase db push` skipped. User will need to push migration manually or it will be applied on next deploy.

## User Setup Required

Run the migration against the Supabase project:
```bash
supabase db push
```
Or apply `supabase/migrations/014_reopen_station.sql` manually in the Supabase SQL editor.

---
*Quick Task: 7*
*Completed: 2026-02-19*
