# Architecture Research: v1.1 Multi-Meeting Integration

**Domain:** Multi-meeting platform evolution of existing real-time group discussion app
**Researched:** 2026-02-25
**Confidence:** HIGH (based on direct codebase analysis of existing v1.0 schema and code)

## Executive Summary

The v1.0 app has a flat, single-meeting architecture: one global `meeting_status` row, global `groups`/`group_members`, global `stations`, and `station_sessions`/`messages` that implicitly belong to "the one meeting." The v1.1 evolution introduces a `meetings` table as the central entity, and every meeting-day artifact (stations, groups, sessions, messages) becomes scoped to a specific meeting via foreign keys. The core patterns (Server Component shell + Client Component island, Realtime broadcast channels, atomic Postgres functions) remain unchanged -- the work is schema evolution plus URL restructuring.

---

## Current v1.0 Schema (As-Built)

Based on direct analysis of migration files 001-019:

```
profiles (id, full_name, email, role, phone, attending, parent_invite_code, created_at)
invite_codes (id, code, role, max_uses, uses, active, created_at)
parent_youth_links (id, parent_id, youth_id, created_at)
groups (id, name, locked, created_at)
group_members (id, group_id, user_id, created_at)
stations (id[uuid], number, title, description, questions[jsonb], tip, created_at)
station_sessions (id, station_id, group_id, status, started_at, end_timestamp, completed_at, created_at)
messages (id, session_id, user_id, content, created_at)
meeting_status (id, status, started_at, ended_at)
temp_access_codes (id, user_id, code, expires_at, used, created_at)
```

**Key observations:**
- `stations` uses UUID primary key with a separate `number` column for ordering
- `station_sessions` has UNIQUE(station_id, group_id) -- one session per station per group
- `messages` references `session_id` (not station_id + group_id directly)
- `meeting_status` is a singleton row (no FK to anything)
- `groups` and `group_members` are global -- not scoped to any meeting
- `profiles.attending` is a single boolean -- not per-meeting
- Four SECURITY DEFINER functions: `open_station`, `view_station`, `complete_station`, `reopen_station`
- Realtime: `station_sessions` in supabase_realtime publication; chat uses Broadcast channels (not postgres_changes)

---

## v1.1 Schema Evolution

### New Tables

```sql
-- Central meeting entity
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,              -- e.g. "Fellesmote #1"
  date DATE NOT NULL,
  time TIME,                        -- optional: start time
  location TEXT,                    -- venue name
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-meeting attendance replaces profiles.attending
CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'attending', 'not_attending')),
  responded_at TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);

-- Per-meeting discussion groups (replaces global groups)
CREATE TABLE meeting_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-meeting group membership (replaces global group_members)
CREATE TABLE meeting_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES meeting_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Per-meeting stations (replaces global stations)
CREATE TABLE meeting_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB DEFAULT '[]',
  tip TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, number)
);
```

### Modified Tables

```sql
-- station_sessions: re-point FKs to meeting-scoped tables
-- The UNIQUE constraint changes from (station_id, group_id) to
-- (station_id, group_id) where station_id now references meeting_stations
ALTER TABLE station_sessions
  DROP CONSTRAINT station_sessions_station_id_fkey,
  ADD CONSTRAINT station_sessions_station_id_fkey
    FOREIGN KEY (station_id) REFERENCES meeting_stations(id) ON DELETE CASCADE;

ALTER TABLE station_sessions
  DROP CONSTRAINT station_sessions_group_id_fkey,
  ADD CONSTRAINT station_sessions_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES meeting_groups(id) ON DELETE CASCADE;

-- profiles: drop the global 'attending' column
ALTER TABLE profiles DROP COLUMN attending;
```

### Tables Unchanged

| Table | Why Unchanged |
|-------|---------------|
| `profiles` | User identity is global (name, email, phone, role). Only `attending` column removed. |
| `invite_codes` | Registration is a one-time event, not per-meeting. |
| `parent_youth_links` | Family relationships are permanent, not per-meeting. |
| `messages` | Already references `session_id` which chains to meeting via station_sessions -> meeting_stations -> meetings. No direct changes needed. |
| `temp_access_codes` | Login mechanism is global, not per-meeting. |

### Tables to Drop (After Migration)

| Table | Reason |
|-------|--------|
| `meeting_status` | Replaced by `meetings.status`. The singleton pattern was v1.0-specific. |
| `groups` | Replaced by `meeting_groups`. |
| `group_members` | Replaced by `meeting_group_members`. |
| `stations` | Replaced by `meeting_stations`. |

### Updated Postgres Functions

All four SECURITY DEFINER functions need parameter type changes but retain the same logic:

| Function | Change |
|----------|--------|
| `open_station(p_station_id, p_group_id)` | Parameter types already UUID. Now references `meeting_stations` and `meeting_groups` via `station_sessions` FKs. Logic unchanged -- the UNIQUE constraint and FOR UPDATE locking work identically. |
| `view_station(p_station_id, p_group_id)` | Same FK chain change. Logic unchanged. |
| `complete_station(p_session_id)` | No change needed -- operates on `station_sessions.id` which is unchanged. |
| `reopen_station(p_session_id, p_extra_minutes)` | No change needed -- operates on `station_sessions.id` which is unchanged. |

### New Indexes

```sql
CREATE INDEX idx_meeting_attendance_meeting ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_user ON meeting_attendance(user_id);
CREATE INDEX idx_meeting_groups_meeting ON meeting_groups(meeting_id);
CREATE INDEX idx_meeting_group_members_user ON meeting_group_members(user_id);
CREATE INDEX idx_meeting_stations_meeting ON meeting_stations(meeting_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_date ON meetings(date DESC);
```

---

## RLS Policy Updates

### New Table Policies

```sql
-- meetings: all authenticated can read, admin can write
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "meetings_admin_all" ON meetings FOR ALL TO authenticated USING (is_admin());

-- meeting_attendance: read own + admin read all, users update own
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_select" ON meeting_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_upsert_own" ON meeting_attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "attendance_update_own" ON meeting_attendance FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "attendance_admin_all" ON meeting_attendance FOR ALL TO authenticated USING (is_admin());

-- meeting_groups: all can read, admin can write
ALTER TABLE meeting_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_groups_select" ON meeting_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "meeting_groups_admin_all" ON meeting_groups FOR ALL TO authenticated USING (is_admin());

-- meeting_group_members: all can read, admin can write
ALTER TABLE meeting_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_group_members_select" ON meeting_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "meeting_group_members_admin_all" ON meeting_group_members FOR ALL TO authenticated USING (is_admin());

-- meeting_stations: all can read, admin can write
ALTER TABLE meeting_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_stations_select" ON meeting_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "meeting_stations_admin_all" ON meeting_stations FOR ALL TO authenticated USING (is_admin());
```

### Modified Policies

The existing RLS policies on `station_sessions` and `messages` reference `group_members` for group membership checks. These must be updated to reference `meeting_group_members`:

```sql
-- station_sessions: update group membership check
DROP POLICY "station_sessions_select" ON station_sessions;
CREATE POLICY "station_sessions_select" ON station_sessions FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM meeting_group_members WHERE user_id = auth.uid()));

-- messages: update group membership check (via session -> group)
-- Current policy checks group_members. Since messages reference session_id,
-- and sessions reference group_id from meeting_groups, the check chains through:
-- messages -> station_sessions.group_id -> meeting_group_members.user_id
```

### Realtime Channel Policy

The existing realtime.messages policy for broadcast channels checks `group_members`. This must reference `meeting_group_members`:

```sql
-- Update the realtime channel authorization
DROP POLICY "Group members can use station channels" ON "realtime"."messages";
CREATE POLICY "Group members can use station channels"
ON "realtime"."messages"
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM station_sessions ss
    JOIN meeting_group_members mgm ON mgm.group_id = ss.group_id
    WHERE mgm.user_id = (SELECT auth.uid())
      AND 'station:' || ss.id::text = (SELECT realtime.topic())
      AND realtime.messages.extension IN ('broadcast', 'presence')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM station_sessions ss
    JOIN meeting_group_members mgm ON mgm.group_id = ss.group_id
    WHERE mgm.user_id = (SELECT auth.uid())
      AND 'station:' || ss.id::text = (SELECT realtime.topic())
      AND realtime.messages.extension IN ('broadcast', 'presence')
  )
);
```

---

## Data Migration Strategy: v1.0 to v1.1

The existing v1.0 data (5 stations, groups, station_sessions, messages from the first meeting) must be preserved as the first "previous meeting."

### Migration Script (Single Transaction)

```sql
BEGIN;

-- Step 1: Create the v1.0 meeting in the new meetings table
INSERT INTO meetings (id, title, date, location, status, started_at, ended_at)
SELECT
  gen_random_uuid(),
  'Fellesmote #1',
  COALESCE(ms.started_at::date, '2026-02-26'),  -- use meeting start date or fallback
  'Bjerke VGS',                                   -- known venue
  'completed',
  ms.started_at,
  ms.ended_at
FROM meeting_status ms
LIMIT 1;

-- Capture the new meeting ID
-- (In practice, use a DO block with a variable or a CTE chain)

-- Step 2: Copy stations -> meeting_stations
INSERT INTO meeting_stations (id, meeting_id, number, title, description, questions, tip)
SELECT s.id, m.id, s.number, s.title, s.description, s.questions, s.tip
FROM stations s, meetings m
WHERE m.title = 'Fellesmote #1';

-- Step 3: Copy groups -> meeting_groups
INSERT INTO meeting_groups (id, meeting_id, name, locked)
SELECT g.id, m.id, g.name, g.locked
FROM groups g, meetings m
WHERE m.title = 'Fellesmote #1';

-- Step 4: Copy group_members -> meeting_group_members
INSERT INTO meeting_group_members (id, group_id, user_id)
SELECT gm.id, gm.group_id, gm.user_id
FROM group_members gm;

-- Step 5: Copy attendance from profiles.attending -> meeting_attendance
INSERT INTO meeting_attendance (meeting_id, user_id, status)
SELECT m.id, p.id,
  CASE
    WHEN p.attending = true THEN 'attending'
    WHEN p.attending = false THEN 'not_attending'
    ELSE 'pending'
  END
FROM profiles p, meetings m
WHERE m.title = 'Fellesmote #1'
  AND p.role IN ('youth', 'parent', 'admin');

-- Step 6: Re-point station_sessions FKs
-- Since we preserved the same UUIDs for meeting_stations and meeting_groups,
-- the existing station_sessions rows already point to valid IDs in the new tables.
-- We just need to change the FK constraints (done in DDL migration, not data migration).

-- Step 7: Drop old tables and columns
DROP TABLE meeting_status;
DROP TABLE group_members;
DROP TABLE groups;
DROP TABLE stations;
ALTER TABLE profiles DROP COLUMN attending;

COMMIT;
```

### Migration Safety Strategy

**Approach: Preserve UUIDs.** By copying v1.0 rows into v1.1 tables with the same primary key UUIDs, all existing FK references in `station_sessions` and `messages` remain valid. This avoids rewriting every `station_sessions.station_id` and `station_sessions.group_id` -- they still point to the same UUIDs, just in renamed tables.

**Risk mitigation:**
1. Run migration on a Supabase branch database first (Supabase Branching or a staging project)
2. Verify message count before and after: `SELECT COUNT(*) FROM messages`
3. Verify station_sessions integrity: `SELECT COUNT(*) FROM station_sessions ss JOIN meeting_stations ms ON ss.station_id = ms.id`
4. Test the read-only meeting history view against migrated data

---

## URL Structure Evolution

### Current v1.0 Routes

```
/                           Landing page
/login                      Login
/register                   Register with invite code
/dashboard                  Station selector (when groups locked)
/dashboard/station/[sessionId]  Chat room
/admin                      Admin hub
/admin/users                User management
/admin/groups               Group builder
/admin/wordcloud            Word cloud
/api/export                 Markdown export
```

### v1.1 Routes

```
/                           Landing page (redirect to /dashboard)
/login                      Login (unchanged)
/register                   Register (unchanged)

-- Dashboard: Contact directory + meeting awareness
/dashboard                  Contact directory + next meeting card + previous meetings list

-- Active meeting: station flow (scoped to the upcoming meeting)
/dashboard/station/[sessionId]  Chat room (unchanged -- sessionId is already meeting-scoped via FKs)

-- Meeting history: read-only browsing
/meeting/[meetingId]        Meeting overview (stations, groups, attendance summary)
/meeting/[meetingId]/station/[sessionId]  Read-only chat view for past meeting

-- Admin: meeting management
/admin                      Admin hub (updated with meeting management link)
/admin/meetings             Meeting list + create new meeting
/admin/meetings/[meetingId] Meeting detail: stations editor, groups, attendance, wordcloud, export
/admin/meetings/[meetingId]/groups    Group builder for this meeting
/admin/meetings/[meetingId]/stations  Station editor for this meeting
/admin/users                User management (unchanged)
```

### Route Design Rationale

1. **`/dashboard` becomes the permanent home:** No longer conditional on meeting status. Always shows the contact directory. When an upcoming meeting exists with locked groups, the station selector appears above the directory.

2. **`/dashboard/station/[sessionId]` stays unchanged:** The sessionId already encodes which meeting, station, and group via FK chain. No need to add meetingId to the URL -- it would be redundant.

3. **`/meeting/[meetingId]` for history:** New route group for browsing past meetings. Read-only by design. The station chat view is reused but with `readOnly=true` (this pattern already exists in v1.0).

4. **`/admin/meetings/[meetingId]` nests meeting admin:** Groups, stations, wordcloud, and export all live under a specific meeting. This replaces the current top-level `/admin/groups`, `/admin/wordcloud`, and `/api/export` which assumed a single meeting.

5. **`/admin/users` remains top-level:** User management is not meeting-scoped. Users exist across all meetings.

---

## Component Architecture Changes

### Dashboard Page (`/dashboard`)

**v1.0:** Conditional rendering based on group lock status. Shows either station selector or user overview.
**v1.1:** Always shows contact directory. Conditionally shows upcoming meeting card with station selector.

```
v1.1 Dashboard Layout:
┌─────────────────────────────────┐
│  Velkommen, [Name]! [Role]      │
│                                 │
│  ┌─ Neste mote ──────────────┐  │  ← Only shown when upcoming meeting exists
│  │ [Title] - [Date] [Time]   │  │    with locked groups for this user
│  │ [Location]                │  │
│  │                           │  │
│  │ Din gruppe: [Group Name]  │  │
│  │ [Member chips]            │  │
│  │                           │  │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐  │  │  ← Station selector grid
│  │ │ 1 │ │ 2 │ │ 3 │ │ 4 │  │  │
│  │ └───┘ └───┘ └───┘ └───┘  │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌─ Kontaktliste ────────────┐  │  ← Always shown
│  │ [Search bar]              │  │
│  │ [Toggle: Youth / All]     │  │
│  │                           │  │
│  │ [Youth 1] ▶ [Parents]    │  │
│  │ [Youth 2] ▶ [Parents]    │  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌─ Tidligere moter ─────────┐  │  ← Always shown (empty state if none)
│  │ ▶ Fellesmote #1 - 26 feb  │  │
│  │ ▶ Fellesmote #2 - 15 mar  │  │
│  └───────────────────────────┘  │
│                                 │
│  [Logg ut]                      │
└─────────────────────────────────┘
```

### Contact Directory Component (New)

**Purpose:** Searchable list of all registered members with phone and email.
**Data source:** `profiles` + `parent_youth_links` (global, not meeting-scoped).
**Views:**
- Youth-centered (default): Youth names expandable to show their parents
- Full list: All members alphabetically

```typescript
// components/directory/ContactDirectory.tsx (new)
// 'use client' - for search filtering and view toggle
interface ContactDirectoryProps {
  youth: Array<{
    id: string
    fullName: string
    phone: string | null
    email: string
    parents: Array<{ id: string; fullName: string; phone: string | null; email: string }>
  }>
  allMembers: Array<{
    id: string
    fullName: string
    role: string
    phone: string | null
    email: string
  }>
}
```

### Meeting History Page (New)

**Purpose:** Read-only overview of a past meeting's discussions.
**Data:** `meeting_stations` + `meeting_groups` + `station_sessions` + `messages` for that meeting.

```
/meeting/[meetingId]:
┌─────────────────────────────────┐
│  ← Tilbake til dashbord         │
│                                 │
│  Fellesmote #1                  │
│  26. februar 2026 - Bjerke VGS  │
│                                 │
│  Stasjoner:                     │
│  ┌───────────────────────────┐  │
│  │ 1. Fellesskap og inkl.    │  │  ← Click opens station with
│  │    5 grupper diskuterte   │  │    read-only group discussions
│  ├───────────────────────────┤  │
│  │ 2. Rus og narkotika       │  │
│  │    5 grupper diskuterte   │  │
│  ├───────────────────────────┤  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
│                                 │
│  Grupper:                       │
│  [Group 1] [Group 2] ...       │
│                                 │
│  Deltakere: 42 av 55           │
└─────────────────────────────────┘
```

### Admin Meeting Management (New)

**Purpose:** Create meetings, configure stations, manage per-meeting groups.
**Location:** `/admin/meetings` and `/admin/meetings/[meetingId]`

The admin meeting detail page replaces the current top-level admin sections:

| v1.0 Route | v1.1 Equivalent |
|------------|-----------------|
| `/admin/groups` | `/admin/meetings/[meetingId]/groups` |
| `/admin/wordcloud` | `/admin/meetings/[meetingId]` (wordcloud tab/section) |
| `/api/export` | `/admin/meetings/[meetingId]` (export button) |

### Components Requiring Modification

| Component | Change Required |
|-----------|----------------|
| `StationSelector` | Accept `meetingId` prop; query `meeting_stations` instead of `stations` |
| `StationCard` | No change (already receives station data as props) |
| `ChatRoom` | No change (already receives sessionId, station data as props) |
| `useRealtimeChat` | No change (already scoped to sessionId) |
| `CountdownTimer` | No change |
| `GroupBuilder` (admin) | Accept `meetingId`; query `meeting_groups`/`meeting_group_members` |
| `WordCloud` (admin) | Accept `meetingId`; filter messages by meeting's stations |
| `AttendingToggle` | Accept `meetingId`; write to `meeting_attendance` instead of `profiles.attending` |
| `RegisteredUsersOverview` | Remove (replaced by ContactDirectory + meeting-specific attendance) |
| Export route (`/api/export`) | Accept `meetingId` query param; filter by meeting's stations |

### New Components

| Component | Purpose |
|-----------|---------|
| `ContactDirectory` | Searchable member list with phone/email |
| `MeetingCard` | Summary card for upcoming/past meeting |
| `MeetingList` | List of past meetings on dashboard |
| `MeetingForm` | Admin form to create/edit meeting (title, date, time, location) |
| `StationEditor` | Admin form to add/edit/reorder stations for a meeting |
| `AttendanceList` | Per-meeting attendance status with RSVP toggle |

---

## Server Action Changes

### Modified Actions

```typescript
// lib/actions/station.ts
// viewStation, openStation: add meetingId awareness
// Current: gets group from group_members, calls open_station RPC
// v1.1: gets group from meeting_group_members for the active meeting
// The RPC functions don't need meetingId -- they work on station_sessions
// which are already scoped via meeting_stations/meeting_groups FKs

export async function viewStation(stationId: string): Promise<...> {
  // Change: query meeting_group_members instead of group_members
  const { data: membership } = await supabase
    .from('meeting_group_members')
    .select('group_id')
    .eq('user_id', user.id)
    // Need to find the group for the ACTIVE meeting's station
    // Filter by groups belonging to the station's meeting
    // This requires a join or subquery
}
```

**Key challenge:** The current `viewStation` action gets the user's group from `group_members` (global). In v1.1, the user could have groups in multiple meetings. The action needs to know WHICH meeting to use.

**Solution:** Derive meeting context from the stationId. Since `meeting_stations` belongs to a specific meeting, and the station_session references a meeting_station, the meeting is implicit:

```typescript
// Better approach: the station already belongs to a meeting.
// Get the meeting from the station, then get the user's group for THAT meeting.
export async function viewStation(stationId: string) {
  // 1. Get the station's meeting
  const { data: station } = await supabase
    .from('meeting_stations')
    .select('meeting_id')
    .eq('id', stationId)
    .single()

  // 2. Get user's group for this meeting
  const { data: membership } = await supabase
    .from('meeting_group_members')
    .select('group_id, group:meeting_groups!inner(meeting_id)')
    .eq('user_id', user.id)
    .eq('meeting_groups.meeting_id', station.meeting_id)
    .maybeSingle()

  // 3. Call RPC as before
}
```

### New Actions

```typescript
// lib/actions/meetings.ts (new)
export async function createMeeting(data: {
  title: string; date: string; time?: string; location?: string
}): Promise<{ meetingId?: string; error?: string }>

export async function updateMeeting(meetingId: string, data: Partial<{
  title: string; date: string; time: string; location: string; status: string
}>): Promise<{ error?: string }>

export async function startMeeting(meetingId: string): Promise<{ error?: string }>
export async function endMeeting(meetingId: string): Promise<{ error?: string }>

// lib/actions/meeting-stations.ts (new)
export async function addStation(meetingId: string, data: {
  number: int; title: string; description?: string; questions: string[]; tip?: string
}): Promise<{ stationId?: string; error?: string }>

export async function updateStation(stationId: string, data: Partial<{
  number: int; title: string; description: string; questions: string[]; tip: string
}>): Promise<{ error?: string }>

export async function deleteStation(stationId: string): Promise<{ error?: string }>

// lib/actions/attendance.ts (new)
export async function updateAttendance(meetingId: string, status: 'attending' | 'not_attending'): Promise<{ error?: string }>
```

---

## Data Flow: How Meeting Context Propagates

### Dashboard -> Station Chat (Active Meeting)

```
Dashboard Page (Server Component)
    |
    ├── 1. Query upcoming meeting:
    │   SELECT * FROM meetings WHERE status = 'upcoming' ORDER BY date LIMIT 1
    |
    ├── 2. If meeting exists, get user's group for this meeting:
    │   SELECT mg.* FROM meeting_groups mg
    │   JOIN meeting_group_members mgm ON mgm.group_id = mg.id
    │   WHERE mg.meeting_id = [meetingId] AND mgm.user_id = [userId]
    |
    ├── 3. Get meeting's stations:
    │   SELECT * FROM meeting_stations WHERE meeting_id = [meetingId] ORDER BY number
    |
    ├── 4. Get station sessions for user's group:
    │   SELECT * FROM station_sessions WHERE group_id = [groupId]
    |
    └── 5. Render StationSelector with stations + sessions
            |
            └── User clicks station -> viewStation(stationId)
                    |
                    └── Returns sessionId -> navigate to /dashboard/station/[sessionId]
                            |
                            └── Station page loads (identical to v1.0)
```

### Meeting History Browse

```
Dashboard -> Click "Fellesmote #1"
    |
    └── Navigate to /meeting/[meetingId]
            |
            ├── Query meeting details (title, date, location)
            ├── Query meeting_stations for this meeting
            ├── Query meeting_groups for this meeting
            ├── Query station_sessions with completion status
            └── Render read-only meeting overview
                    |
                    └── Click station -> shows group discussions
                            |
                            ├── For each group: load messages via session_id
                            └── Render read-only ChatRoom (existing component)
```

---

## Meeting Lifecycle State Machine

```
                  createMeeting()
                       │
                       ▼
                 ┌──────────┐
                 │ upcoming  │  ← Admin creates meeting, configures stations
                 └─────┬────┘    Admin creates groups, assigns members
                       │         Users RSVP attendance
                 startMeeting()
                       │
                       ▼
                 ┌──────────┐
                 │  active   │  ← Meeting day: stations open for discussion
                 └─────┬────┘    Groups rotate through stations
                       │         Real-time chat active
                  endMeeting()
                       │
                       ▼
                 ┌──────────┐
                 │ completed │  ← Read-only history, export available
                 └──────────┘    Becomes a "previous meeting"
```

**Constraint:** Only ONE meeting can have status `upcoming` at a time (PROJECT.md requirement: "One upcoming meeting at a time"). Enforce via:

```sql
-- Partial unique index: only one upcoming meeting allowed
CREATE UNIQUE INDEX idx_meetings_one_upcoming
  ON meetings ((true))
  WHERE status = 'upcoming';
```

---

## File Structure Evolution

```
src/
├── app/
│   ├── layout.tsx                               # Unchanged
│   ├── page.tsx                                 # Unchanged (landing)
│   ├── login/page.tsx                           # Unchanged
│   ├── register/page.tsx                        # Unchanged
│   ├── dashboard/
│   │   ├── layout.tsx                           # Unchanged (auth guard)
│   │   ├── page.tsx                             # REWRITTEN: directory + meeting card
│   │   └── station/
│   │       └── [sessionId]/page.tsx             # MODIFIED: meeting-aware group lookup
│   ├── meeting/                                 # NEW: meeting history
│   │   └── [meetingId]/
│   │       ├── page.tsx                         # Meeting overview (read-only)
│   │       └── station/
│   │           └── [sessionId]/page.tsx         # Read-only chat view
│   ├── admin/
│   │   ├── layout.tsx                           # Unchanged
│   │   ├── page.tsx                             # MODIFIED: add meetings link
│   │   ├── meetings/                            # NEW
│   │   │   ├── page.tsx                         # Meeting list + create
│   │   │   └── [meetingId]/
│   │   │       ├── page.tsx                     # Meeting detail (stations, export, wordcloud)
│   │   │       ├── groups/page.tsx              # Group builder for this meeting
│   │   │       └── stations/page.tsx            # Station editor for this meeting
│   │   ├── users/page.tsx                       # Unchanged
│   │   ├── groups/page.tsx                      # DEPRECATED -> redirect to /admin/meetings
│   │   └── wordcloud/page.tsx                   # DEPRECATED -> redirect to /admin/meetings
│   └── api/
│       └── export/route.ts                      # MODIFIED: accept meetingId query param
├── components/
│   ├── ui/                                      # Unchanged
│   ├── auth/                                    # Unchanged
│   ├── directory/                               # NEW
│   │   └── ContactDirectory.tsx
│   ├── dashboard/
│   │   ├── MeetingCard.tsx                      # NEW: upcoming meeting summary
│   │   ├── MeetingList.tsx                      # NEW: previous meetings list
│   │   ├── AttendingToggle.tsx                  # MODIFIED: per-meeting attendance
│   │   ├── RegisteredUsersOverview.tsx          # DEPRECATED
│   │   └── ParentInviteBanner.tsx               # Unchanged
│   ├── meeting/                                 # NEW
│   │   ├── MeetingOverview.tsx                  # Meeting detail for history view
│   │   └── StationSummary.tsx                   # Station discussion summary
│   ├── station/                                 # Mostly unchanged
│   │   ├── ChatRoom.tsx                         # Unchanged
│   │   ├── StationSelector.tsx                  # Unchanged (already receives data as props)
│   │   └── ...                                  # All other station components unchanged
│   └── admin/
│       ├── MeetingForm.tsx                      # NEW
│       ├── StationEditor.tsx                    # NEW
│       ├── AttendanceList.tsx                    # NEW
│       ├── GroupBuilder.tsx                      # MODIFIED: per-meeting groups
│       ├── WordCloud.tsx                         # MODIFIED: per-meeting filter
│       └── ...
├── lib/
│   ├── supabase/                                # Unchanged
│   ├── actions/
│   │   ├── auth.ts                              # Unchanged
│   │   ├── station.ts                           # MODIFIED: meeting-aware group lookup
│   │   ├── admin.ts                             # MODIFIED: meeting-scoped group CRUD
│   │   ├── meetings.ts                          # NEW
│   │   ├── meeting-stations.ts                  # NEW
│   │   └── attendance.ts                        # NEW
│   ├── hooks/                                   # Unchanged
│   ├── export/
│   │   └── build-markdown.ts                    # MODIFIED: accept meeting title in output
│   └── ...
└── supabase/
    └── migrations/
        ├── 001-019 (existing)
        └── 020_multi_meeting.sql                # The big migration
```

---

## Build Order (Dependency-Driven)

The migration is the foundation -- everything depends on the new schema existing.

```
Phase 1: Schema + Migration (blocks everything else)
├── Write migration 020: new tables, FK changes, data migration
├── Update RLS policies for new tables
├── Update realtime channel authorization policy
├── Test migration on staging/branch database
├── Verify v1.0 data preserved as "Fellesmote #1"
└── Update TypeScript types (supabase gen types)

Phase 2: Meeting CRUD + Admin (blocks meeting-day features)
├── Meeting list page (/admin/meetings)
├── Create meeting form (title, date, time, location)
├── Meeting detail page (/admin/meetings/[meetingId])
├── Station editor (add/edit/remove/reorder stations for a meeting)
├── Adapt group builder for per-meeting groups
├── Meeting lifecycle controls (start/end meeting)
└── Update export route with meetingId parameter

Phase 3: Dashboard Redesign (can overlap with Phase 2)
├── Contact directory component (searchable, two views)
├── Upcoming meeting card with attendance toggle
├── Previous meetings list
├── Update dashboard page to compose these sections
└── Update station page for meeting-aware group lookup

Phase 4: Meeting History (depends on Phase 1 data migration)
├── Meeting overview page (/meeting/[meetingId])
├── Read-only station discussions per group
├── Reuse existing ChatRoom component with readOnly=true
└── Navigation between meetings

Phase 5: Polish + Cleanup (after core works)
├── Remove deprecated routes (/admin/groups, /admin/wordcloud)
├── Update admin hub links
├── Per-meeting word cloud
├── Per-meeting attendance summary
├── Mobile polish on new pages
└── Drop old tables if not done in migration
```

**Phase ordering rationale:**
- Phase 1 must be first: every query, RLS policy, and component change depends on the new schema
- Phase 2 before Phase 3: admin must be able to create meetings before the dashboard can show them
- Phase 3 can overlap with Phase 2 for the directory (which is independent of meetings)
- Phase 4 after Phase 1: needs migrated v1.0 data to test against
- Phase 5 last: cleanup only after all features work

---

## Key Integration Points

### What Stays the Same

| Subsystem | Why Unchanged |
|-----------|---------------|
| Supabase Auth | User authentication is global, not meeting-scoped |
| Middleware (`src/middleware.ts`) | Auth token refresh and public/private route logic unchanged |
| Realtime Broadcast channels | Still scoped to `station:{sessionId}` -- sessionId is already unique per meeting |
| `useRealtimeChat` hook | Operates on sessionId, which is inherently meeting-scoped |
| `CountdownTimer` component | Receives endTimestamp as prop -- source doesn't matter |
| `ChatRoom` component | Receives all data as props from Server Component |
| Message persistence pattern | Messages -> session_id -> station_sessions, chain unchanged |
| Three Supabase client pattern | browser/server/admin clients unchanged |

### What Changes

| Subsystem | What Changes | Impact |
|-----------|-------------|--------|
| Dashboard data fetching | Must query upcoming meeting + meeting-scoped stations/groups | Server Component rewrite |
| Admin group builder | Must accept meetingId, query meeting_groups | Moderate refactor |
| Station server actions | Group lookup changes from `group_members` to `meeting_group_members` | Small change |
| Export route | Must filter by meetingId's stations | Small change |
| Word cloud page | Must filter messages by meetingId's stations | Small change |
| URL routing | New route segments for /meeting/[id] and /admin/meetings/[id] | New pages |
| RLS policies | Group membership checks reference new table | SQL migration |

### Potential Breaking Points

1. **The realtime channel policy is the riskiest change.** If the updated policy on `realtime.messages` has a bug, ALL real-time chat breaks with no fallback. Test this thoroughly before deploying.

2. **The migration preserving UUIDs is critical.** If station or group UUIDs change during migration, all existing station_sessions and messages become orphaned. The migration script MUST use `INSERT INTO meeting_stations (id, ...) SELECT s.id, ...` to preserve IDs.

3. **The "one upcoming meeting" constraint.** The partial unique index prevents admin from accidentally creating two upcoming meetings. But the admin UI must also enforce this (disable "create" when one exists, or auto-set previous upcoming to completed).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding meetingId to Every URL

**What it looks like:** `/dashboard/meeting/[meetingId]/station/[sessionId]`
**Why wrong:** The sessionId already encodes the meeting via FK chain. Adding meetingId to the URL is redundant and creates sync bugs (what if the URL says meeting A but the session belongs to meeting B?).
**Do instead:** Keep `/dashboard/station/[sessionId]`. Derive meeting context from the session when needed.

### Anti-Pattern 2: Keeping Old Tables as "Fallbacks"

**What it looks like:** Keeping `groups` table alongside `meeting_groups` "just in case"
**Why wrong:** Two sources of truth for group membership. Code must check both. Bugs guaranteed.
**Do instead:** Clean migration with UUID preservation. Drop old tables in the same transaction.

### Anti-Pattern 3: Global State for Meeting Context

**What it looks like:** React context or Zustand store holding "current meeting" globally
**Why wrong:** The dashboard shows multiple meetings simultaneously (upcoming + history list). A global "current meeting" creates bugs when navigating between them.
**Do instead:** Pass meetingId as props through Server Components. Each page knows its meeting from the URL params.

### Anti-Pattern 4: Soft-Deleting Stations Instead of Scoping Per-Meeting

**What it looks like:** Adding `meeting_id` to the existing `stations` table and keeping old rows
**Why wrong:** The existing `stations` table has constraints and seed data that assume global stations. Adding a nullable FK creates ambiguity -- which stations are "global templates" vs "meeting-specific"?
**Do instead:** Clean separation: `meeting_stations` is the only stations table. No templates, no inheritance. Admin writes fresh stations for each meeting (per PROJECT.md: "admin writes stations fresh").

---

## Sources

- Direct codebase analysis of all 19 migration files, 4 Postgres functions, 5 server actions, 4 custom hooks, and complete route structure (HIGH confidence)
- PROJECT.md requirements and constraints (HIGH confidence -- primary source of truth)
- Supabase RLS documentation patterns (HIGH confidence -- consistent with existing v1.0 implementation)
- Supabase partial unique index syntax verified against PostgreSQL 15 docs (HIGH confidence)

---
*Architecture research for: v1.1 Multi-Meeting Platform Integration*
*Researched: 2026-02-25*
