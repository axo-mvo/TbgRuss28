# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Multi-Meeting Platform

**Shipped:** 2026-02-26
**Phases:** 5 | **Plans:** 10 | **Quick tasks:** 9

### What Was Built
- Meeting-scoped database schema with zero-downtime migration from v1.0
- Full admin meeting management (CRUD, stations, groups, lifecycle)
- Searchable contact directory with youth-centered and everyone views
- Per-meeting attendance tracking with dashboard stats
- Participant-facing meeting history with read-only discussions
- Meeting-scoped export and word cloud
- Profile pages, audience targeting, is_admin flag (quick tasks)

### What Worked
- Schema migration first approach — all subsequent phases built cleanly on meeting-scoped tables
- UUID preservation during migration eliminated FK reference issues
- Reusing existing patterns (GroupBuilder, ChatRoom readOnly, Badge variants) accelerated development
- Milestone audit caught real bugs (query builder mutation, orphaned routes) before shipping
- Quick tasks alongside phased work allowed rapid polish iteration

### What Was Inefficient
- Phase 7.1 hotfix needed because query builder mutation bugs weren't caught in Phase 7 testing
- ROADMAP.md progress table had stale data (phases 7.1, 8, 9 showed "Not started" even after completion)
- Some decisions accumulated in STATE.md that should have been in PROJECT.md from the start

### Patterns Established
- Meeting-scoped FK chain pattern: meetings → stations → station_sessions → messages
- Admin client for operations that need to bypass RLS (attendance upsert, cross-group queries)
- URL-driven state for picker components (searchParams for station/group selection)
- Inline MessageList pattern for embedded chat history (avoids h-dvh layout conflict)
- .then()/.catch() for void-typed DnD callbacks that invoke async server actions

### Key Lessons
1. Test Supabase query builder chains with multiple meetings present — single-record testing misses scoping bugs
2. Milestone audits are valuable and should be run before declaring completion, not after
3. Quick tasks are effective for polish but need careful scoping — some (audience targeting) were large enough to be phased work

### Cost Observations
- Model mix: Primarily sonnet for execution, opus for planning/auditing
- Sessions: ~15 sessions across v1.1
- Notable: Average plan execution was 2-3 minutes — extremely fast iteration

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Quick Tasks | Key Change |
|-----------|--------|-------|-------------|------------|
| v1.0 | 5 | 10 | 0 | Initial build, established patterns |
| v1.1 | 5 | 10 | 9 | Schema evolution, quick task workflow added |

### Top Lessons (Verified Across Milestones)

1. Mobile-first design constraint forces good UX decisions — validated across both milestones
2. Supabase single-platform approach (auth + DB + realtime) continues to work well at this scale
3. Phase-based development with explicit success criteria catches scope creep early
