# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly
**Current focus:** Phase 3 complete, ready for Phase 4

## Current Position

Phase: 3 of 5 (Station Chat and Timer) -- COMPLETE
Plan: 2 of 2 in current phase (2 complete)
Status: Phase 03 complete, ready for Phase 04
Last activity: 2026-02-19 -- Plan 03-02 executed

Progress: [#######...] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 5min
- Total execution time: 0.54 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2 | 11min | 5.5min |
| 02 | 3 | 14min | 4.7min |
| 03 | 2 | 7min | 3.5min |

**Recent Trend:**
- Last 5 plans: 02-01 (3min), 02-02 (4min), 02-03 (7min), 03-01 (3min), 03-02 (4min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Use Next.js 15 (not 14) per research -- v14 reached EOL Oct 2025
- [Roadmap]: Supabase Broadcast for real-time chat delivery, direct DB inserts for persistence (two-path approach)
- [Roadmap]: Server-timestamp timer sync (store end_timestamp, clients compute remaining)
- [Roadmap]: Auth middleware must use getUser() not getSession()
- [01-01]: Pinned Next.js to v15.5 (create-next-app defaults to v16)
- [01-01]: getClaims() with getUser() fallback in middleware (runtime version check)
- [01-01]: Rewrote ESLint config for Next.js 15 compatibility
- [01-02]: validateInviteCode is read-only; atomic increment happens during register() only
- [01-02]: redirect() outside try/catch per Next.js pattern (throws internally)
- [01-02]: Parent-youth linking is non-fatal during registration
- [01-02]: Admin guard in layout queries profiles table (defense-in-depth)
- [02-ctx]: Parents and their linked youth must NEVER be in same group (overrides roadmap "parent-follows-child" wording)
- [02-ctx]: Group names from predefined list of famous russ group names, randomly assigned
- [02-01]: Extracted verifyAdmin() helper to DRY admin auth checks across all 7 server actions
- [02-01]: toggleGroupsLock uses .neq() filter to match all rows (Supabase requires a WHERE clause)
- [02-01]: saveGroupMembers clears all members per group before re-inserting, with per-member separation check
- [02-02]: Custom role-change dialog using native <dialog> (Dialog component lacks children/body slot for radio selection)
- [02-02]: ParentYouthLink.youth typed as union to handle Supabase PostgREST inference variability
- [02-03]: Used useDroppable for containers and useSortable for items (dnd-kit/react multi-container pattern)
- [02-03]: Mobile uses BottomSheet tap-to-assign instead of drag-and-drop for cleaner phone UX
- [02-03]: Conflict check on drag-end reverts user to unassigned pool if parent-child violation detected
- [03-01]: open_station uses SECURITY DEFINER Postgres function with FOR UPDATE row lock for atomicity
- [03-01]: COALESCE on started_at/end_timestamp preserves first opener's timestamp in concurrent upserts
- [03-01]: useRealtimeChat exposes setMessages for merging initial history from loadMessages
- [03-01]: ChatMessage includes status field (sent/pending/error) for optimistic UI tracking
- [03-02]: CountdownTimer calls useCountdownTimer independently (self-contained, not prop-drilled from ChatRoom)
- [03-02]: Station context card (questions/tip) at top of message area for discussion guidance
- [03-02]: MessageBubble uses existing Badge component for role display with Norwegian labels

### Pending Todos

None yet.

### Blockers/Concerns

- Supabase free tier Realtime limit is 200 concurrent connections; ~80 users with 2-3 subscriptions each could hit ~240. Consider Pro tier ($25/mo) as insurance before the event.
- Broadcast authorization is channel-level, not row-level. Group isolation enforced via `station:{sessionId}` naming + RLS on realtime.messages (resolved in 03-01).

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 03-02-PLAN.md (Phase 03 complete)
Resume file: .planning/phases/03-station-chat-and-timer/03-02-SUMMARY.md
