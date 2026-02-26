# Phase 6: Schema Migration - Research

**Researched:** 2026-02-25
**Domain:** Postgres schema evolution, data backfill migration, Supabase Realtime RLS
**Confidence:** HIGH

## Summary

Phase 6 transforms a single-meeting database into a multi-meeting schema. The existing v1.0 schema has 9 tables (profiles, invite_codes, parent_youth_links, groups, group_members, stations, station_sessions, messages, meeting_status). The migration introduces a `meetings` table as the new top-level entity, re-parents `stations`, `groups`, `group_members`, and `station_sessions` under meetings via foreign keys, backfills all existing data under a "Fellesmote #1" meeting, rewrites 5 Postgres RPC functions (open_station, view_station, complete_station, reopen_station, check_parent_child_separation), updates all RLS policies for the changed table structure, and ensures Realtime subscriptions continue working.

This is a backend-only phase. No UI changes are needed -- the app must boot and function identically to v1.0 after migration. The critical risk is data loss or broken FK chains during the backfill. The critical constraint is that all existing UUIDs must be preserved so the app code continues working without changes in this phase (app code updates happen alongside the migration where table references change).

**Primary recommendation:** Use a single, carefully ordered SQL migration file that: (1) creates the meetings table, (2) adds meeting_id FK columns to existing tables, (3) backfills meeting_id on all rows, (4) makes FKs NOT NULL, (5) updates unique constraints, (6) rewrites RPC functions, (7) updates RLS policies, and (8) updates Realtime publication. Wrap the entire migration in a transaction.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEET-03 | Only one upcoming meeting exists at a time (enforced by DB constraint) | Partial unique index pattern: `CREATE UNIQUE INDEX ... WHERE status = 'upcoming'` -- well-supported in Postgres, verified via Supabase docs |
| MEET-05 | Existing v1.0 data migrates into new schema as the first previous meeting | Backfill strategy with UUID preservation, INSERT into meetings + UPDATE existing rows to set meeting_id FK |
| SCOPE-03 | Station sessions and messages are scoped to their meeting via FK chain | meetings -> stations -> station_sessions -> messages FK chain, plus meetings -> groups -> group_members chain |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15 (Supabase) | Schema DDL, partial indexes, RPC functions | Already in use, Supabase-managed |
| Supabase Migrations | CLI or Dashboard SQL | Applying schema changes | Project uses numbered SQL files in `supabase/migrations/` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Dashboard SQL Editor | N/A | Manual migration execution | Project runs migrations via Dashboard (no Supabase CLI linked) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single migration file | Multiple sequential migration files | Single file is simpler for this project -- all changes are interdependent and must happen atomically |
| ALTER TABLE ADD COLUMN approach | Create new tables + copy data | ALTER is simpler, preserves UUIDs, avoids double-write risk |

**Installation:**
```bash
# No new dependencies needed -- pure SQL migration
```

## Architecture Patterns

### Current v1.0 Schema (Before Migration)
```
profiles
  ├── parent_youth_links (parent_id, youth_id -> profiles)
  ├── group_members (user_id -> profiles)
  └── temp_access_codes (user_id -> profiles)

invite_codes (standalone)

groups
  └── group_members (group_id -> groups)
      └── station_sessions (group_id -> groups)

stations (standalone, number UNIQUE)
  └── station_sessions (station_id -> stations)
      └── messages (session_id -> station_sessions)

meeting_status (single row, unused in app code)
```

### Target v1.1 Schema (After Migration)
```
meetings (NEW -- top-level entity)
  ├── stations (meeting_id -> meetings)
  │     └── station_sessions (station_id -> stations)
  │           └── messages (session_id -> station_sessions)
  ├── groups (meeting_id -> meetings)
  │     └── group_members (group_id -> groups)
  └── (attendance tracked via separate table in Phase 8)

profiles (unchanged)
  ├── parent_youth_links (unchanged)
  └── temp_access_codes (unchanged)

invite_codes (unchanged)
meeting_status (DROP -- replaced by meetings.status)
```

### Pattern 1: Meetings Table with Partial Unique Index
**What:** The `meetings` table enforces "only one upcoming meeting at a time" via a partial unique index on a constant expression, filtered by `status = 'upcoming'`.
**When to use:** When you need a uniqueness constraint on a subset of rows.
**Example:**
```sql
-- Source: Supabase docs (query-optimization.mdx) + Postgres documentation
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  date DATE,
  time TIME,
  venue TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one upcoming meeting at a time
-- Uses a constant (true) as the indexed expression since we only care about the WHERE filter
CREATE UNIQUE INDEX idx_one_upcoming_meeting
  ON meetings ((true))
  WHERE status = 'upcoming';
```

### Pattern 2: Add FK Column, Backfill, Then Enforce NOT NULL
**What:** Three-step column addition that avoids breaking existing rows.
**When to use:** When adding a foreign key to a table that already has data.
**Example:**
```sql
-- Step 1: Add nullable FK column
ALTER TABLE stations ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;

-- Step 2: Backfill all existing rows
UPDATE stations SET meeting_id = '<backfill-meeting-uuid>';

-- Step 3: Enforce NOT NULL after backfill
ALTER TABLE stations ALTER COLUMN meeting_id SET NOT NULL;
```

### Pattern 3: Drop and Recreate Unique Constraints
**What:** The `stations.number` column currently has a table-wide UNIQUE constraint. In the multi-meeting schema, station numbers must be unique per meeting, not globally.
**When to use:** When uniqueness scope changes due to a new parent entity.
**Example:**
```sql
-- Drop old global uniqueness
ALTER TABLE stations DROP CONSTRAINT stations_number_key;

-- Add new per-meeting uniqueness
CREATE UNIQUE INDEX idx_stations_meeting_number ON stations(meeting_id, number);
```

### Pattern 4: Preserve station_sessions Unique Constraint
**What:** `station_sessions` has `UNIQUE(station_id, group_id)` which is already scoped correctly -- station_id and group_id are both per-meeting after migration, so this constraint remains valid.
**When to use:** When existing constraints are already scoped correctly via their FK references.

### Anti-Patterns to Avoid
- **Renaming tables:** Do NOT rename existing tables (e.g., `stations` to `meeting_stations`). This would break all app code, Supabase PostgREST references, and Realtime subscriptions simultaneously. Instead, add the `meeting_id` column to existing tables.
- **Creating new tables and copying data:** Do NOT create `meeting_stations` as a new table and INSERT/SELECT from old `stations`. This changes UUIDs and breaks every FK reference downstream.
- **Dropping meeting_status before verifying:** The `meeting_status` table is not referenced in app code (grep confirms zero hits in `src/`), but verify this is still true before dropping.
- **Running migration without transaction:** All schema changes must succeed or fail together. A partial migration (e.g., FK columns added but functions not updated) would leave the DB in an inconsistent state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "One upcoming meeting" enforcement | Application-layer check before INSERT | Postgres partial unique index | Race conditions, multiple code paths could create meetings |
| UUID generation for backfill meeting | Hardcoded UUID string | `gen_random_uuid()` with variable capture in PL/pgSQL DO block | Ensures proper UUID format and uniqueness |
| RLS policy for meeting-scoped access | Complex JOIN chains in every policy | Existing pattern: `group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())` already works because groups will be meeting-scoped | FK chain handles scoping implicitly |

**Key insight:** The existing RLS policies on `station_sessions` and `messages` already scope access via `group_id -> group_members -> user_id`. Since groups become meeting-scoped (via `groups.meeting_id`), these policies automatically become meeting-scoped too without any changes. The only RLS policy that needs updating is if we need admin access to meeting-specific data, which the existing `is_admin()` check already handles.

## Common Pitfalls

### Pitfall 1: Breaking the Realtime RLS Policy on realtime.messages
**What goes wrong:** The existing Realtime policy on `realtime.messages` joins `station_sessions` with `group_members` using topic pattern `'station:' || ss.id::text`. If the station_sessions table structure changes (e.g., different column names), this policy could silently fail, causing Realtime subscriptions to be denied.
**Why it happens:** Realtime RLS policies evaluate on every channel subscribe/message. A broken policy means silent denial, not an error.
**How to avoid:** The policy references `station_sessions.id` and `station_sessions.group_id` -- both columns remain unchanged. The policy also references `group_members.group_id` and `group_members.user_id` -- also unchanged. So this policy should NOT need changes. However, verify after migration that Realtime still works by testing a chat subscription.
**Warning signs:** Realtime subscriptions fail with TIMED_OUT or permission denied after migration.

### Pitfall 2: Forgetting to Update the Postgres RPC Functions
**What goes wrong:** The `open_station` function hardcodes `interval '15 minutes'` and operates on `station_sessions` directly. It doesn't need meeting_id awareness since it works with station_id + group_id pairs that are already meeting-scoped. But `check_parent_child_separation` queries `group_members` which now has a meeting_id scope -- this function checks if a user is already in a target group, which is correct regardless of meeting scope.
**Why it happens:** Assuming all functions need rewriting when most are already scoped correctly via their parameters.
**How to avoid:** Audit each function's SQL queries against the new schema. Most functions operate on `station_sessions` + `group_members` via UUID parameters and don't need meeting_id awareness.
**Warning signs:** Function calls return unexpected errors after migration.

### Pitfall 3: The `stations.number` UNIQUE Constraint
**What goes wrong:** Currently `stations.number` is globally unique (INT UNIQUE NOT NULL). After migration, each meeting has its own set of stations, so station number 1 can exist in multiple meetings. If you forget to change the UNIQUE constraint, creating stations for a second meeting will fail with a unique violation.
**Why it happens:** The constraint is defined in the original schema and easy to overlook.
**How to avoid:** Drop the global UNIQUE and replace with a compound UNIQUE on `(meeting_id, number)`.
**Warning signs:** Inserting stations for new meetings fails with duplicate key errors.

### Pitfall 4: Forgetting REPLICA IDENTITY FULL on New/Changed Tables
**What goes wrong:** The `station_sessions` table has `REPLICA IDENTITY FULL` (set in migration 010). If any new tables are added to the Realtime publication, they also need REPLICA IDENTITY FULL for filtered subscriptions to work.
**Why it happens:** Realtime postgres_changes relies on WAL records containing all column values for filter evaluation. Default REPLICA IDENTITY only includes PK columns.
**How to avoid:** For this phase, `station_sessions` already has REPLICA IDENTITY FULL. No new tables are being added to the Realtime publication. The `meetings` table may be added in Phase 7 for dashboard state tracking.
**Warning signs:** Realtime subscription filters silently miss UPDATE events.

### Pitfall 5: The `attending` Column on Profiles
**What goes wrong:** Currently `profiles.attending` tracks attendance for "the meeting" (singular). In v1.1, attendance is per-meeting (SCOPE-02, Phase 8). However, Phase 6 should NOT move this column -- that's Phase 8's concern. But the backfill meeting should be marked as `completed` so the attending column's current values make sense as historical data.
**Why it happens:** Temptation to "fix everything" in the migration phase.
**How to avoid:** Phase 6 only adds the meetings table and re-parents stations/groups/sessions. The `attending` column stays on profiles for now and gets migrated to a per-meeting attendance table in Phase 8.
**Warning signs:** Scope creep into Phase 8 territory.

### Pitfall 6: Transaction Boundary for Multi-Statement Migration
**What goes wrong:** If the migration is not wrapped in a transaction and fails midway, the database is left in an inconsistent state (e.g., meetings table exists but stations.meeting_id is not yet added).
**Why it happens:** Individual ALTER TABLE statements auto-commit by default outside a transaction.
**How to avoid:** Wrap the entire migration in `BEGIN; ... COMMIT;`. Supabase Dashboard SQL Editor supports transactions.
**Warning signs:** Partial schema state after a failed migration attempt.

## Code Examples

Verified patterns from the existing codebase and Supabase documentation:

### Complete Migration SQL Structure
```sql
-- 020_meetings_migration.sql
-- Multi-meeting schema migration: creates meetings table, re-parents
-- stations/groups under meetings, backfills v1.0 data, updates functions + RLS

BEGIN;

-- ============================================================
-- STEP 1: Create meetings table
-- ============================================================
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  date DATE,
  time TIME,
  venue TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Only one upcoming meeting at a time (MEET-03)
CREATE UNIQUE INDEX idx_one_upcoming_meeting
  ON meetings ((true))
  WHERE status = 'upcoming';

-- ============================================================
-- STEP 2: Add meeting_id FK to stations and groups
-- ============================================================
ALTER TABLE stations ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 3: Backfill -- create "Fellesmote #1" and link all data
-- ============================================================
DO $$
DECLARE
  v_meeting_id UUID;
BEGIN
  INSERT INTO meetings (title, status, date)
  VALUES ('Fellesmote #1', 'completed', '2026-02-19')
  RETURNING id INTO v_meeting_id;

  UPDATE stations SET meeting_id = v_meeting_id;
  UPDATE groups SET meeting_id = v_meeting_id;
END $$;

-- ============================================================
-- STEP 4: Enforce NOT NULL after backfill
-- ============================================================
ALTER TABLE stations ALTER COLUMN meeting_id SET NOT NULL;
ALTER TABLE groups ALTER COLUMN meeting_id SET NOT NULL;

-- ============================================================
-- STEP 5: Update unique constraints
-- ============================================================
-- stations.number must be unique per meeting, not globally
ALTER TABLE stations DROP CONSTRAINT stations_number_key;
CREATE UNIQUE INDEX idx_stations_meeting_number ON stations(meeting_id, number);

-- ============================================================
-- STEP 6: RLS policies for meetings table
-- ============================================================
CREATE POLICY "Authenticated users can view all meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage meetings"
  ON meetings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- STEP 7: Add meetings to Realtime publication (for Phase 7+)
-- ============================================================
-- Optional: only needed when dashboard subscribes to meeting changes

-- ============================================================
-- STEP 8: Drop obsolete meeting_status table
-- ============================================================
DROP TABLE IF EXISTS meeting_status;

-- ============================================================
-- STEP 9: Performance indexes
-- ============================================================
CREATE INDEX idx_stations_meeting_id ON stations(meeting_id);
CREATE INDEX idx_groups_meeting_id ON groups(meeting_id);

COMMIT;
```

### Backfill Pattern with UUID Preservation
```sql
-- Source: Existing project pattern from 011_parent_invite_codes.sql
-- The DO $$ block with DECLARE/BEGIN/END captures the generated
-- meeting UUID and uses it to UPDATE all existing rows.
DO $$
DECLARE
  v_meeting_id UUID;
BEGIN
  INSERT INTO meetings (title, status, date)
  VALUES ('Fellesmote #1', 'completed', '2026-02-19')
  RETURNING id INTO v_meeting_id;

  -- All existing stations belong to the first meeting
  UPDATE stations SET meeting_id = v_meeting_id;

  -- All existing groups belong to the first meeting
  UPDATE groups SET meeting_id = v_meeting_id;
END $$;
```

### Partial Unique Index for "One Upcoming Meeting"
```sql
-- Source: Postgres partial index documentation + Supabase query optimization guide
-- This index ensures only ONE row can have status='upcoming' at any time.
-- Attempting to INSERT a second upcoming meeting raises a unique violation.
CREATE UNIQUE INDEX idx_one_upcoming_meeting
  ON meetings ((true))
  WHERE status = 'upcoming';

-- Test: This succeeds
INSERT INTO meetings (title, status) VALUES ('Meeting 1', 'upcoming');

-- Test: This fails with unique violation
INSERT INTO meetings (title, status) VALUES ('Meeting 2', 'upcoming');

-- Test: After changing Meeting 1 to active, this succeeds
UPDATE meetings SET status = 'active' WHERE title = 'Meeting 1';
INSERT INTO meetings (title, status) VALUES ('Meeting 2', 'upcoming');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `meeting_status` single-row table | `meetings` table with status column | This migration | meeting_status was a v1.0 simplification; meetings table is the proper multi-meeting model |
| Global `stations.number` UNIQUE | Per-meeting `UNIQUE(meeting_id, number)` | This migration | Allows each meeting to have its own station numbering |
| Stations are standalone seed data | Stations belong to a meeting | This migration | Each meeting can have different stations (Phase 7 admin feature) |
| Groups are meeting-agnostic | Groups belong to a meeting | This migration | Groups created fresh per meeting, previous groups preserved |

**Deprecated/outdated:**
- `meeting_status` table: Replaced by `meetings.status`. No app code references `meeting_status` (verified by grep).

## Detailed Function Audit

Each Postgres RPC function was audited against the new schema:

### open_station(p_station_id, p_group_id)
**Queries:** `station_sessions WHERE station_id = p_station_id AND group_id = p_group_id`
**Verdict:** No changes needed. Both parameters are UUIDs that are already meeting-scoped via their parent tables. The function operates on `station_sessions` which references meeting-scoped `stations` and `groups`.

### view_station(p_station_id, p_group_id)
**Queries:** `INSERT INTO station_sessions (station_id, group_id, ...)` then `SELECT FROM station_sessions WHERE station_id AND group_id`
**Verdict:** No changes needed. Same reasoning as open_station.

### complete_station(p_session_id)
**Queries:** `station_sessions WHERE id = p_session_id`
**Verdict:** No changes needed. Operates on a single session row by UUID.

### reopen_station(p_session_id, p_extra_minutes)
**Queries:** `station_sessions WHERE id = p_session_id`, then checks `station_sessions WHERE group_id = v_session.group_id AND status = 'active'`
**Verdict:** No changes needed. Group_id is already meeting-scoped.

### check_parent_child_separation(p_group_id, p_user_id)
**Queries:** `parent_youth_links JOIN group_members ON group_members.group_id = p_group_id`
**Verdict:** No changes needed. Checks membership within a specific group (which is meeting-scoped). Parent-child links are global (not meeting-scoped), which is correct.

### is_admin()
**Queries:** `profiles WHERE id = auth.uid() AND role = 'admin'`
**Verdict:** No changes needed. Profiles are not meeting-scoped.

### validate_invite_code(p_code)
**Queries:** `invite_codes WHERE code = p_code`
**Verdict:** No changes needed. Invite codes are not meeting-scoped.

### assign_parent_invite_code() (trigger)
**Queries:** `profiles WHERE parent_invite_code IS NOT NULL`
**Verdict:** No changes needed. Not meeting-related.

**Summary:** Zero Postgres functions need rewriting. All functions operate on UUIDs that become implicitly meeting-scoped through their parent FK chains.

## Detailed RLS Policy Audit

### Policies that need NO changes (FK chain handles scoping):
- All `profiles` policies -- not meeting-scoped
- All `invite_codes` policies -- not meeting-scoped
- All `parent_youth_links` policies -- not meeting-scoped
- All `group_members` policies -- scoped via `group_id` which is now meeting-scoped
- All `station_sessions` policies -- scoped via `group_id` which is meeting-scoped
- All `messages` policies -- scoped via `session_id -> station_sessions -> group_id`
- `stations` SELECT policy -- `USING (true)` for all authenticated users

### Policies that need adding:
- `meetings` SELECT -- all authenticated users can view meetings
- `meetings` ALL (admin) -- admins can manage meetings

### Realtime policies that need NO changes:
- `"Group members can use station channels"` on `realtime.messages` -- joins `station_sessions` and `group_members`, both unchanged in structure
- `"Group members can subscribe to dashboard channels"` on `realtime.messages` -- joins `group_members`, unchanged

### Realtime publication:
- `station_sessions` is already in `supabase_realtime` publication (migration 009)
- No changes needed for Phase 6
- `meetings` table can be added to publication in Phase 7 when the dashboard subscribes to meeting state changes

## App Code Impact Assessment

Files that query DB tables and their migration impact:

| File | Tables Used | Changes Needed |
|------|-------------|----------------|
| `src/lib/actions/station.ts` | group_members, station_sessions, messages | None -- queries use UUIDs |
| `src/lib/actions/admin.ts` | profiles, parent_youth_links, groups, group_members, temp_access_codes | Groups queries may need meeting_id filter in Phase 7, not Phase 6 |
| `src/app/dashboard/page.tsx` | profiles, group_members, groups, stations, station_sessions | Stations query currently fetches ALL stations -- needs meeting scope in Phase 7 |
| `src/app/api/export/route.ts` | messages with joins to station_sessions, stations, groups | Needs meeting filter in Phase 7 |
| `src/app/admin/wordcloud/page.tsx` | messages with joins, groups, stations | Needs meeting filter in Phase 7 |
| `src/app/dashboard/station/[sessionId]/page.tsx` | profiles, station_sessions, stations, group_members | None -- queries use session UUID |
| `src/lib/hooks/useRealtimeChat.ts` | realtime broadcast on `station:{sessionId}` | None -- uses session UUID |
| `src/components/station/StationSelector.tsx` | realtime postgres_changes on station_sessions | None -- filters by group_id UUID |

**Key finding for Phase 6:** Most app code operates on UUIDs and does not need changes in the schema migration phase. However, any page that fetches ALL records from `stations` or `groups` without filtering will now return records from all meetings. For Phase 6 (where only one backfilled meeting exists), this is not a problem. Phase 7 must add meeting_id filters when creating new meetings.

The dashboard page fetches `stations` with `.order('number')` -- this returns all stations across all meetings. With only one meeting, this works fine. Phase 7 must scope this.

## Open Questions

1. **Backfill meeting date accuracy**
   - What we know: v1.0 was shipped 2026-02-19 per the roadmap
   - What's unclear: Was the actual meeting on 2026-02-19 or a different date?
   - Recommendation: Use '2026-02-19' as the date. Admin can edit it later via Phase 7 UI.

2. **Should `groups.locked` stay on the groups table?**
   - What we know: Currently `groups.locked` controls whether participants see their group assignment. In v1.1, groups are per-meeting, so locking is implicitly per-meeting.
   - What's unclear: Whether locking should be a meeting-level property (`meetings.groups_locked`) or stay per-group.
   - Recommendation: Keep `locked` on `groups` table for Phase 6 (no change). Phase 7 can decide whether to promote it to meeting-level.

3. **Should the migration be tested on a Supabase branch database first?**
   - What we know: STATE.md lists "Migration must be tested on Supabase branch database before production" as a concern. Supabase branching is a paid feature.
   - What's unclear: Whether the project has access to branching or uses a local Supabase instance for testing.
   - Recommendation: Test the migration SQL in the Dashboard SQL Editor on the production database. The migration is wrapped in a transaction, so it rolls back on failure. Alternatively, test on a local Supabase instance if available.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/001_schema.sql` through `019_update_stations_5.sql` -- complete v1.0 schema
- Existing codebase: `src/lib/actions/station.ts`, `src/lib/actions/admin.ts` -- all DB query patterns
- Existing codebase: `src/app/dashboard/page.tsx`, `src/app/api/export/route.ts`, `src/app/admin/wordcloud/page.tsx` -- all table references
- Context7 `/supabase/supabase` -- partial index syntax, RLS patterns, Realtime publication
- Context7 `/websites/supabase` -- Realtime RLS policy patterns with `realtime.topic()`

### Secondary (MEDIUM confidence)
- Postgres documentation on partial unique indexes -- well-established feature since Postgres 9.0+

### Tertiary (LOW confidence)
- None -- all findings are verified against the codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pure SQL migration, no new dependencies, well-understood Postgres features
- Architecture: HIGH - exhaustive audit of all 19 existing migrations, all RPC functions, all RLS policies, and all app code DB references
- Pitfalls: HIGH - each pitfall identified from concrete analysis of the existing codebase, not hypothetical

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable -- Postgres and Supabase migration patterns don't change)
