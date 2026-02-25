# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly
**Current focus:** Milestone v1.1 — Multi-Meeting Platform

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-25 — Milestone v1.1 started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions from v1.0 affecting v1.1:

- [Roadmap]: Use Next.js 15 (not 14) per research -- v14 reached EOL Oct 2025
- [Roadmap]: Supabase Broadcast for real-time chat delivery, direct DB inserts for persistence (two-path approach)
- [Roadmap]: Server-timestamp timer sync (store end_timestamp, clients compute remaining)
- [Roadmap]: Auth middleware must use getUser() not getSession()
- [01-01]: Pinned Next.js to v15.5 (create-next-app defaults to v16)
- [02-ctx]: Parents and their linked youth must NEVER be in same group
- [02-ctx]: Group names from predefined list of famous russ group names, randomly assigned
- [02-03]: dnd-kit/react for drag-and-drop; BottomSheet tap-to-assign on mobile
- [03-01]: open_station uses SECURITY DEFINER Postgres function with FOR UPDATE row lock
- [03-01]: useRealtimeChat exposes setMessages for merging initial history
- [04-01]: channelRef exposed from useRealtimeChat for broadcast
- [05-01]: Markdown builder as pure function for testability
- [quick-5]: createAdminClient to bypass RLS for cross-user profile visibility
- [quick-12]: CSS flexbox word cloud -- zero dependencies, mobile-friendly
- [quick-14]: Nullable boolean for attendance (null = unanswered, true = yes, false = no)
- [quick-15]: isParentLike() helper function for DRY role checks
- [quick-17]: Native sms: URI for SMS -- zero server-side dependency

### Pending Todos

None yet.

### Blockers/Concerns

- Supabase free tier Realtime limit is 200 concurrent connections; ~80 users with 2-3 subscriptions each could hit ~240. Consider Pro tier ($25/mo) as insurance before events.

## v1.0 Summary

All 5 phases complete (10 plans, 0.65 hours total execution). 31/31 requirements delivered. 18 quick tasks completed. See MILESTONES.md for archive.

## Session Continuity

Last session: 2026-02-25
Stopped at: Starting milestone v1.1 — defining requirements
