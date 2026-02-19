---
phase: 05-export
plan: 01
subsystem: api
tags: [markdown, export, route-handler, file-download, supabase-joins]

# Dependency graph
requires:
  - phase: 03-realtime-station
    provides: messages table with station_sessions/stations/groups/profiles joins
  - phase: 01-auth-scaffold
    provides: admin auth pattern (verifyAdmin, createClient, createAdminClient)
provides:
  - GET Route Handler at /api/export returning Markdown file download
  - buildExportMarkdown pure function for message-to-Markdown conversion
  - Export card on admin hub page
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route Handler file download with Content-Disposition header"
    - "Pure Markdown builder function separated from Route Handler"
    - "Defensive PostgREST nested join handling (array-or-object pattern)"

key-files:
  created:
    - src/lib/export/build-markdown.ts
    - src/app/api/export/route.ts
  modified:
    - src/app/admin/page.tsx

key-decisions:
  - "Used <a> tag with download attribute instead of Link component for file download"
  - "Admin auth in Route Handler mirrors verifyAdmin() but returns HTTP responses"
  - "Markdown builder as pure function for testability and separation of concerns"

patterns-established:
  - "Route Handler file download: Content-Type + Content-Disposition headers"
  - "Norwegian role mapping: parent->forelder, youth->ungdom, admin->admin"

requirements-completed: [EXPT-01, EXPT-02]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 5 Plan 1: Export Summary

**Admin Markdown export of meeting conversations organized by station then group, with Norwegian role labels and timestamps, served as file download from GET Route Handler**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T19:01:07Z
- **Completed:** 2026-02-19T19:03:29Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Pure Markdown builder function grouping messages by station (sorted by number) then by group (sorted alphabetically) with Norwegian role labels and timestamps
- GET Route Handler at /api/export with admin auth verification, Supabase admin client query with nested joins, and Content-Disposition file download header
- Export card on admin hub page matching existing card design pattern with download icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Markdown builder and export Route Handler** - `b53a2de` (feat)
2. **Task 2: Add export button to admin page** - `81188ef` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `src/lib/export/build-markdown.ts` - Pure function converting ExportMessage[] to structured Markdown string
- `src/app/api/export/route.ts` - GET Route Handler with admin auth, Supabase query, and file download response
- `src/app/admin/page.tsx` - Added "Eksporter samtaler" card with download link to /api/export

## Decisions Made
- Used `<a>` tag with `download` attribute instead of Next.js `<Link>` component because this is a file download, not a client navigation
- Admin auth in Route Handler returns HTTP 401/403 responses instead of objects (unlike server action verifyAdmin pattern)
- Markdown builder extracted as pure function for testability and separation of concerns
- Norwegian role labels mapped inline: parent -> forelder, youth -> ungdom, admin -> admin

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- This is the final phase (Phase 5 of 5). All core features are complete.
- The export feature is ready for use once the meeting has messages in the database.

## Self-Check: PASSED

All files and commits verified:
- src/lib/export/build-markdown.ts: FOUND
- src/app/api/export/route.ts: FOUND
- src/app/admin/page.tsx: FOUND
- b53a2de (Task 1): FOUND
- 81188ef (Task 2): FOUND

---
*Phase: 05-export*
*Completed: 2026-02-19*
