---
phase: 06-schema-migration
plan: 01
subsystem: database
tags: [postgres, supabase, migration, rls, meetings, multi-tenant]

# Dependency graph
requires:
  - phase: 01-05 (v1.0)
    provides: existing schema with stations, groups, station_sessions, messages, meeting_status tables
provides:
  - meetings table with status lifecycle (upcoming/active/completed)
  - meeting_id FK on stations and groups tables
  - partial unique index enforcing single upcoming meeting
  - per-meeting station numbering via compound unique index
  - RLS policies for meetings table
  - backfilled "Fellesmote #1" as completed meeting for existing v1.0 data
affects: [07-meeting-management, 08-multi-meeting-ui, 09-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [partial-unique-index-for-status-enforcement, nullable-then-backfill-then-not-null-migration-pattern]

key-files:
  created: [supabase/migrations/020_meetings_migration.sql]
  modified: [supabase/migrations/ALL_MIGRATIONS.sql]

key-decisions:
  - "Used partial unique index ON meetings ((true)) WHERE status = 'upcoming' to enforce single upcoming meeting at DB level"
  - "Nullable-then-backfill-then-NOT-NULL pattern for safe meeting_id FK addition without downtime"
  - "Kept meeting_status DROP as IF EXISTS for safety even though table confirmed to exist"

patterns-established:
  - "Partial unique index: use CREATE UNIQUE INDEX ... ON table ((true)) WHERE condition to enforce single-row-with-status constraints"
  - "Safe FK migration: ADD COLUMN nullable -> backfill -> ALTER SET NOT NULL to avoid constraint violations during migration"

requirements-completed: [MEET-03, MEET-05, SCOPE-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 6 Plan 01: Schema Migration Summary

**Postgres migration creating meetings table with partial unique index, meeting_id FKs on stations/groups, backfill of existing v1.0 data, per-meeting station uniqueness, and RLS policies**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T22:36:11Z
- **Completed:** 2026-02-25T22:38:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created complete 9-step transactional migration for multi-meeting schema
- Backfill links all existing v1.0 stations and groups to "Fellesmote #1" (completed meeting)
- Partial unique index enforces "only one upcoming meeting" rule at the database level
- Per-meeting compound unique index replaces global station number uniqueness

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the multi-meeting schema migration SQL** - `5fac430` (feat)
2. **Task 2: Update ALL_MIGRATIONS.sql reference file** - `e33fd8c` (chore)

## Files Created/Modified
- `supabase/migrations/020_meetings_migration.sql` - Complete 9-step transactional migration: creates meetings table, adds meeting_id FKs, backfills data, updates constraints, adds RLS, drops meeting_status
- `supabase/migrations/ALL_MIGRATIONS.sql` - Appended 020 migration content following existing comment header pattern

## Decisions Made
- Used partial unique index `ON meetings ((true)) WHERE status = 'upcoming'` to enforce single upcoming meeting at the DB level rather than application-level checks
- Applied nullable-then-backfill-then-NOT-NULL pattern for safe FK column addition
- Used `DROP TABLE IF EXISTS` for meeting_status even though the table is confirmed to exist, for defensive safety

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
**This migration must be applied manually to the Supabase database.**
To apply: copy the contents of `supabase/migrations/020_meetings_migration.sql` into the Supabase Dashboard SQL Editor and execute.

## Next Phase Readiness
- Schema foundation complete for all v1.1 multi-meeting features
- Phase 07 (meeting management) can build CRUD UI on top of the meetings table
- Phase 08 (multi-meeting UI) can use meeting_id scoping for stations/groups
- Migration must be applied to Supabase before Phase 07 can be tested

## Self-Check: PASSED

- FOUND: supabase/migrations/020_meetings_migration.sql
- FOUND: supabase/migrations/ALL_MIGRATIONS.sql
- FOUND: .planning/phases/06-schema-migration/06-01-SUMMARY.md
- FOUND commit: 5fac430
- FOUND commit: e33fd8c

---
*Phase: 06-schema-migration*
*Completed: 2026-02-25*
