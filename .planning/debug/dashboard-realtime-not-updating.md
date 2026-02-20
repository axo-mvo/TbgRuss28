---
status: resolved
trigger: "Dashboard station cards don't update in realtime when another group member starts/ends a station"
created: 2026-02-19T00:00:00Z
resolved: 2026-02-19T22:10:00Z
---

## Resolution

root_cause: TWO issues combined:

1. **Private channels only** — The Supabase project is configured to only allow private channels. `StationSelector.tsx` was creating a public channel (no `private: true` config), which Supabase rejected with `CHANNEL_ERROR: PrivateOnly`. The chat subscription in `useRealtimeChat.ts` worked because it already set `private: true`.

2. **Missing RLS policy for dashboard channels** — The only RLS policy on `realtime.messages` (from migration 007) authorized `station:{sessionId}` channels with `broadcast`/`presence` extensions. The dashboard subscription uses a `dashboard:{groupId}` channel with `postgres_changes`, which had no matching policy. This caused `CHANNEL_ERROR: Unauthorized`.

fix:
- Code: Added `{ config: { private: true } }` to `StationSelector.tsx` channel creation
- Database: New RLS policy on `realtime.messages` authorizing `dashboard:{groupId}` channels for group members (migration 013)

note: The `realtime.messages.extension` value for postgres_changes is NOT the string `'postgres_changes'` — filtering on extension broke the policy. Topic-only scoping is sufficient and correct.

files_changed:
  - src/components/station/StationSelector.tsx (added private: true)
  - supabase/migrations/013_dashboard_realtime_policy.sql (new)

## Eliminated (from earlier investigation)

- REPLICA IDENTITY FULL — was already applied; verified via pg_class.relreplident = 'f'
- Publication membership — station_sessions IS in supabase_realtime
- RLS policies on station_sessions — 5 policies exist, SELECT policy is correct
- WAL level — confirmed logical
- setAuth() usage — correct pattern for @supabase/ssr
- groupId availability — always populated from server component props
