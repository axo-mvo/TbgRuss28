# Domain Pitfalls: Multi-Meeting Migration

**Domain:** Adding multi-meeting support to existing single-meeting Supabase + Next.js real-time discussion app
**Researched:** 2026-02-25
**Confidence:** HIGH (verified against existing codebase, official Supabase docs, and PostgreSQL documentation)

---

## Critical Pitfalls

Mistakes that cause data loss, broken real-time features, or require significant rework.

### Pitfall 1: UNIQUE Constraint Collision on station_sessions During Migration

**What goes wrong:**
The current `station_sessions` table has `UNIQUE(station_id, group_id)`. When adding `meeting_id`, this constraint must become `UNIQUE(station_id, group_id, meeting_id)`. If the migration adds `meeting_id` and updates the constraint in the wrong order, or if the column is added as `NOT NULL` before backfilling existing rows, the migration fails partway through, leaving the database in an inconsistent state.

**Why it happens:**
The existing constraint enforces "one session per station per group." In multi-meeting mode, the same group can visit the same station at different meetings, so the constraint must include `meeting_id`. Three things can go wrong:
1. Adding `meeting_id NOT NULL` fails because existing rows have no value.
2. Dropping the old unique constraint and adding the new one in separate migrations risks a window where duplicates can be inserted.
3. The `ON CONFLICT (station_id, group_id)` clause in `open_station()` and `view_station()` functions references the old unique constraint. If the constraint changes but the functions are not updated atomically, upserts silently fail or match the wrong rows.

**Consequences:**
- Migration fails mid-execution, requiring manual rollback on production Supabase.
- If the function is not updated: `open_station()` could match a session from a previous meeting and reactivate it instead of creating a new one for the current meeting.
- Data corruption: messages from the current meeting could end up attached to a previous meeting's session.

**Prevention:**
1. Run the entire migration in a single transaction:
   - Add `meeting_id UUID REFERENCES meetings(id)` as NULLABLE first.
   - Create the `meetings` table and insert a "Meeting 1" row for existing data.
   - Backfill: `UPDATE station_sessions SET meeting_id = (SELECT id FROM meetings LIMIT 1)`.
   - Set `NOT NULL`: `ALTER TABLE station_sessions ALTER COLUMN meeting_id SET NOT NULL`.
   - Drop old constraint: `ALTER TABLE station_sessions DROP CONSTRAINT station_sessions_station_id_group_id_key`.
   - Add new constraint: `ALTER TABLE station_sessions ADD CONSTRAINT station_sessions_station_group_meeting_key UNIQUE(station_id, group_id, meeting_id)`.
   - Update `open_station()` and `view_station()` functions in the same migration.
2. Test the full migration on a Supabase branch or local instance before running on production.
3. Take a database backup before running the migration (Supabase dashboard > Database > Backups).

**Detection:**
- `open_station()` returns sessions from wrong meetings.
- Station selector shows completed stations from previous meetings as if they belong to the current meeting.
- `ON CONFLICT` errors in the console after the migration.

**Phase to address:** Phase 1 (Schema Migration) -- this is the very first thing that must work correctly.

---

### Pitfall 2: Orphaned RLS Policies After Adding meeting_id to Groups/Sessions

**What goes wrong:**
The current RLS policies on `groups`, `group_members`, and `station_sessions` have no meeting scope. After adding `meeting_id` to these tables, the policies still allow access to groups/sessions from ALL meetings. A user browsing a previous meeting's read-only view can see (and potentially interact with) groups and sessions from the current meeting because RLS does not filter by meeting.

**Why it happens:**
The existing RLS policies use broad access patterns that were correct for single-meeting mode:
- `groups` SELECT: `USING (true)` -- all authenticated users can see all groups.
- `group_members` SELECT: `USING (true)` -- all authenticated users can see all memberships.
- `station_sessions` INSERT: `WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))` -- membership check, but no meeting scope.

When groups become per-meeting, these policies are technically correct (you can see groups you are in) but semantically wrong (you should only interact with groups for the current meeting, and view-only for past meetings).

The risk is subtle: a user who was in Group A for Meeting 1 might not be in any group for Meeting 2. But if the frontend fetches "my group" without a meeting filter, it returns the Meeting 1 group, and the user navigates to stations for the wrong meeting.

**Consequences:**
- Users see station cards from previous meetings on the current meeting dashboard.
- Users open stations from Meeting 1 during Meeting 2.
- Admin's group builder shows groups from all meetings mixed together.
- Export includes conversations from all meetings instead of the selected one.

**Prevention:**
1. Add `meeting_id` to both `groups` and `station_sessions` tables (groups are per-meeting, not global).
2. Update every RLS policy that touches `groups`, `group_members`, `station_sessions`, and `messages` to include a meeting scope check.
3. Critical: the `station_sessions` INSERT policy must verify the session being created belongs to the current (upcoming/active) meeting.
4. For read-only access to past meetings, create explicit SELECT policies that allow viewing past meeting data without write access.
5. Create a helper function `public.current_meeting_id()` that returns the upcoming/active meeting, and use it in policies to avoid hardcoding meeting IDs:
   ```sql
   CREATE FUNCTION public.current_meeting_id() RETURNS UUID AS $$
     SELECT id FROM meetings WHERE status IN ('upcoming', 'active') ORDER BY date DESC LIMIT 1;
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```

**Detection:**
- Dashboard shows stations from multiple meetings simultaneously.
- Admin export combines conversations from different meetings.
- Users can create station sessions on past meetings.

**Phase to address:** Phase 1 (Schema Migration) -- RLS policies must be updated in the same migration as the schema changes.

---

### Pitfall 3: Realtime Channel Name Collision Across Meetings

**What goes wrong:**
The current Realtime channel names are `station:{sessionId}` for chat and `dashboard:{groupId}` for station status updates. Session IDs and group IDs are UUIDs, so they are globally unique. However, the Realtime RLS policies on `realtime.messages` reference `station_sessions` and `group_members` tables without meeting scope. After adding meetings, a user who was in a group for Meeting 1 could receive Realtime events from Meeting 2 if the channel name patterns overlap.

More critically: the `dashboard:{groupId}` channel subscribes to `postgres_changes` on `station_sessions` filtered by `group_id`. If groups are recreated per meeting (same group name, new UUID), this is fine. But if the migration reuses existing group rows for Meeting 1 and the same groups are also used for Meeting 2 (groups NOT per-meeting), then the `dashboard:{groupId}` channel would receive station_session changes from both meetings.

**Why it happens:**
The existing Realtime RLS policy in `007_station_chat.sql` does:
```sql
EXISTS (
  SELECT 1 FROM station_sessions ss
  JOIN group_members gm ON gm.group_id = ss.group_id
  WHERE gm.user_id = auth.uid()
    AND 'station:' || ss.id::text = realtime.topic()
)
```
This checks group membership regardless of meeting. If `station_sessions` now span multiple meetings, the policy remains correct (session IDs are unique), but the `dashboard:{groupId}` policy does not filter by meeting:
```sql
EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.user_id = auth.uid()
    AND 'dashboard:' || gm.group_id::text = realtime.topic()
)
```
If groups persist across meetings, this channel receives all events for that group across all meetings.

**Consequences:**
- Station selector shows status changes from a different meeting.
- "Station completed" events from a past meeting flash on the current meeting dashboard.
- If groups ARE per-meeting (new UUIDs each time), this pitfall is avoided for channels, but the Realtime policy on `realtime.messages` must still be updated to handle new group membership rows.

**Prevention:**
1. Make groups per-meeting. Each meeting creates fresh groups with new UUIDs. This naturally scopes all channel names.
2. If groups must persist across meetings, change channel names to include meeting scope: `dashboard:{meetingId}:{groupId}`.
3. Update the `postgres_changes` filter in `StationSelector.tsx` to include `meeting_id`:
   ```typescript
   .on('postgres_changes', {
     event: '*',
     schema: 'public',
     table: 'station_sessions',
     filter: `group_id=eq.${groupId}&meeting_id=eq.${meetingId}`,
   })
   ```
   Note: Supabase postgres_changes supports only ONE filter per subscription as of current docs. Compound filters may require a different approach (subscribing with `group_id` filter and client-side filtering for `meeting_id`).
4. Update the Realtime RLS policy for dashboard channels to verify meeting scope.

**Detection:**
- Station selector shows phantom status changes.
- Console logs show unexpected `postgres_changes` events with wrong meeting data.
- Users report stations changing status when they should not be.

**Phase to address:** Phase 1 (Schema Migration + Realtime restructuring) -- must be decided before implementing any meeting-scoped features.

---

### Pitfall 4: Breaking open_station() / view_station() / complete_station() / reopen_station() Functions

**What goes wrong:**
All four SECURITY DEFINER functions operate on `station_sessions` using `station_id + group_id` as the lookup key. After adding `meeting_id`, these functions must also accept and use `meeting_id`. If even one function is missed, it operates across meeting boundaries: `open_station()` could reactivate a session from a previous meeting, or `complete_station()` could mark a session from the wrong meeting as completed.

**Why it happens:**
There are four RPC functions, each with slightly different parameter signatures and logic:
- `open_station(p_station_id, p_group_id)` -- creates/activates sessions
- `view_station(p_station_id, p_group_id)` -- creates/reads sessions without starting timer
- `complete_station(p_session_id)` -- marks session as completed (uses session_id, so safer)
- `reopen_station(p_session_id, p_extra_minutes)` -- reopens completed session (uses session_id, so safer)

The first two functions search by `station_id + group_id`. Without `meeting_id`, they would find sessions from any meeting. The ON CONFLICT clause in `open_station()` references `UNIQUE(station_id, group_id)`, which after the constraint change becomes `UNIQUE(station_id, group_id, meeting_id)`. If the function is not updated to include `meeting_id` in the INSERT, the ON CONFLICT will never trigger (the new column creates a different conflict target), and duplicate sessions are created.

`complete_station()` and `reopen_station()` use `session_id` (a UUID), so they are inherently meeting-scoped and safer. But their callers in `station.ts` server actions look up `group_id` from `group_members` without meeting scope -- if groups persist across meetings, the wrong group_id could be used.

**Consequences:**
- Duplicate station_sessions created (one per meeting for the same station+group).
- `open_station()` creates new sessions every time instead of reusing existing ones.
- Active station constraint check (`one active station per group`) fails because it queries across meetings.
- Timer reopening could affect a different meeting's session.

**Prevention:**
1. Update `open_station()` and `view_station()` to accept `p_meeting_id UUID` parameter.
2. Update the ON CONFLICT clause to match the new composite unique constraint.
3. Update the active-station check to scope by meeting: `WHERE group_id = p_group_id AND meeting_id = p_meeting_id AND status = 'active'`.
4. Update all four functions in the same migration as the schema change.
5. Update the TypeScript server actions in `station.ts` to pass `meeting_id` to the RPC calls.
6. Add meeting_id validation: if the meeting is not active, reject station operations.

**Detection:**
- Multiple station sessions per station per group appear in the database.
- "Gruppen har allerede en aktiv stasjon" error fires incorrectly (detecting an active station from a different meeting).
- Station shows as "available" when it should show as "completed" (different meeting's session was found).

**Phase to address:** Phase 1 (Schema Migration) -- must be updated atomically with the schema.

---

### Pitfall 5: stations Table UNIQUE(number) Constraint Blocks Per-Meeting Stations

**What goes wrong:**
The current `stations` table has `UNIQUE(number)` -- station numbers are globally unique. When stations become per-meeting (admin configures different stations for each meeting), two meetings cannot both have a "Station 1" because the number column has a global uniqueness constraint. The admin tries to create stations for Meeting 2 and gets a constraint violation.

**Why it happens:**
The v1.0 design assumed fixed, global stations seeded once (6 stations, later reduced to 5). The `number` column with a `UNIQUE` constraint was appropriate for a single-meeting model. In multi-meeting mode, stations must be scoped to their meeting. Each meeting can have its own Station 1, Station 2, etc.

The seed data in `004_seed.sql` and the update in `019_update_stations_5.sql` directly INSERT/UPDATE station rows by number. The export logic in `build-markdown.ts` groups by `stationNumber`, and the station page UI displays `station.number`.

**Consequences:**
- Admin cannot create stations for a second meeting if station numbers overlap.
- If the unique constraint is simply dropped, existing queries that use `number` to identify stations become ambiguous.
- The export function groups messages by station number, which now needs meeting context.

**Prevention:**
1. Add `meeting_id UUID REFERENCES meetings(id)` to the `stations` table.
2. Drop the `UNIQUE(number)` constraint and replace with `UNIQUE(meeting_id, number)` -- station numbers are unique within a meeting.
3. Backfill existing stations with the Meeting 1 ID.
4. Update the foreign key from `station_sessions.station_id` -- this already works because `stations.id` is still the PK.
5. Update the export route to filter by meeting and include meeting context in the filename.
6. Update the dashboard query to filter `stations` by meeting_id.

**Detection:**
- "duplicate key value violates unique constraint" on stations when creating a second meeting.
- Export includes stations from all meetings mixed together.
- Dashboard shows stations from previous meetings.

**Phase to address:** Phase 1 (Schema Migration) -- fundamental to the data model change.

---

## Moderate Pitfalls

### Pitfall 6: meeting_status Table Becomes Obsolete But Is Not Removed

**What goes wrong:**
The current `meeting_status` table is a single-row table controlling the global meeting state. The new `meetings` table will have its own `status` column per meeting. If `meeting_status` is not removed or deprecated, the codebase has two sources of truth for "is there an active meeting." Some code reads `meeting_status`, other code reads `meetings.status`, and they disagree.

**Why it happens:**
The `meeting_status` table was seeded with one row (`'pending'`) in `004_seed.sql`. It has RLS policies. It may be referenced in code not immediately visible. Developers add the new `meetings` table but forget to remove the old `meeting_status` table and its references.

**Prevention:**
1. Search the entire codebase for `meeting_status` references before removing it.
2. In the migration: backfill the single row's data into the new `meetings` table, then DROP the `meeting_status` table.
3. If keeping it temporarily for backward compatibility, add a comment and a TODO to remove it.

**Detection:**
- Two different tables controlling meeting state.
- Queries to `meeting_status` return stale data.
- Admin starts a meeting but the dashboard does not reflect the change (or vice versa).

**Phase to address:** Phase 1 (Schema Migration).

---

### Pitfall 7: URL Route Changes Break In-Meeting Navigation

**What goes wrong:**
The current URL structure is:
- `/dashboard` -- main view with station selector
- `/dashboard/station/[sessionId]` -- station chat room
- `/admin` -- admin panel
- `/admin/groups` -- group builder
- `/admin/wordcloud` -- word cloud
- `/api/export` -- markdown export

After multi-meeting, the routes should include a meeting context:
- `/dashboard` -- contact directory + meeting list
- `/meetings/[meetingId]` -- meeting detail with station selector
- `/meetings/[meetingId]/station/[sessionId]` -- station chat
- `/admin/meetings/[meetingId]` -- meeting admin (groups, export, wordcloud)

If the existing `/dashboard/station/[sessionId]` URL is still bookmarked or hardcoded in a shared link, users get a 404. More critically, if someone shares a station URL during an active meeting and the URL structure changes between deployment and the meeting, participants lose access mid-discussion.

**Why it happens:**
URL changes are not backward-compatible by default in Next.js App Router. The existing session IDs in URLs are still valid, but the route no longer exists at the old path.

**Prevention:**
1. Add redirects in `next.config.ts` for the old URL patterns:
   ```typescript
   async redirects() {
     return [{
       source: '/dashboard/station/:sessionId',
       destination: '/meetings/:meetingId/station/:sessionId',
       permanent: false, // temporary redirect until old URLs expire
     }]
   }
   ```
   Note: The redirect needs to know the meetingId from the sessionId. This may require a catch-all route that looks up the meeting from the session.
2. Alternatively, keep the old `/dashboard/station/[sessionId]` route as a server component that looks up the session's meeting_id and redirects to the new URL.
3. Deploy URL changes BETWEEN meetings, never during one.
4. The middleware already redirects unauthenticated users to `/register`. Update it to handle the new route patterns.

**Detection:**
- Users clicking shared links get 404 errors.
- Browser back button navigates to a dead page.
- Bookmarked URLs stop working.

**Phase to address:** Phase 2 (Route restructuring) -- after schema is stable.

---

### Pitfall 8: Contact Directory Profiles Query Exposes Incomplete Data

**What goes wrong:**
The current `profiles` table RLS only allows users to see their own profile (non-admins). For the contact directory, all users need to see all profiles' names, phones, and emails. If the SELECT policy is changed to `USING (true)` (as it is for groups), every field on every profile becomes visible to every user. This over-exposes data -- users should see contact info but not internal fields like `role`, `attending`, or `parent_invite_code`.

**Why it happens:**
The v1.0 RLS on profiles is restrictive: `id = auth.uid()` for regular users, `is_admin()` for admins. The contact directory requires broader read access. The naive fix is to widen the SELECT policy, but this exposes everything.

**Prevention:**
1. Create a database VIEW for the directory that exposes only the fields needed: `full_name`, `phone`, `email`, `role` (for display badge).
2. Apply RLS on the view, or more practically, keep the existing restrictive profile RLS and add a new policy specifically for directory access:
   ```sql
   CREATE POLICY "Authenticated users can view contact directory fields"
     ON profiles FOR SELECT TO authenticated
     USING (true);
   ```
   Then control which fields are returned at the application layer (only select the needed columns).
3. Since Supabase RLS operates at the row level (not column level), the safest approach is to query only the needed columns and trust application-level column selection. If `parent_invite_code` exposure is a concern, consider a separate `contact_info` table.
4. For this app's scale (~80 users, closed group), exposing full profiles with `USING (true)` is acceptable. The invite code system already limits who can register. Document this decision explicitly.

**Detection:**
- Users can query `parent_invite_code` or `attending` for other users via the Supabase client.
- Privacy concerns if contact info is more sensitive than expected.

**Phase to address:** Phase 2 (Contact Directory) -- acceptable risk for this closed group.

---

### Pitfall 9: Export Route Returns All Meetings' Data Without Filtering

**What goes wrong:**
The current `/api/export` route queries ALL messages, joining through `station_sessions` to get station and group names. After multi-meeting, this export includes conversations from every meeting mixed together. The admin wants to export just one meeting's conversations.

**Why it happens:**
The export route uses `createAdminClient()` (bypasses RLS) and queries the entire `messages` table without any filtering. There is no meeting context in the query.

The `build-markdown.ts` function groups by station number and group name. If two meetings have stations with the same number (e.g., both have Station 1), conversations from different meetings are merged under the same heading.

**Prevention:**
1. Add a `meetingId` query parameter to the export route: `/api/export?meetingId=xxx`.
2. Filter the messages query through the meeting-scoped station_sessions.
3. Include the meeting name/date in the export filename and header.
4. The `buildExportMarkdown` function should include meeting metadata in the output.
5. Update the admin page export link to include the current meeting ID.

**Detection:**
- Export file contains conversations from multiple meetings.
- Station headings in the export are duplicated (two "Station 1" sections from different meetings).
- Export file is unexpectedly large after multiple meetings.

**Phase to address:** Phase 3 (Meeting-scoped admin features) -- after meeting CRUD and schema are stable.

---

### Pitfall 10: attending Column Is Global, Not Per-Meeting

**What goes wrong:**
The `profiles.attending` column (boolean) tracks whether someone is coming to "the meeting." In multi-meeting mode, attendance is per-meeting. A user might attend Meeting 1 but not Meeting 2. If `attending` stays on `profiles`, the value from Meeting 1 persists and incorrectly shows for Meeting 2.

**Why it happens:**
The `attending` column was added in `016_attending_column.sql` directly on profiles. The `AttendingToggle` component reads and writes `profiles.attending`. This was appropriate for single-meeting mode.

**Prevention:**
1. Create a `meeting_attendance` table: `(meeting_id UUID, user_id UUID, attending BOOLEAN, PRIMARY KEY (meeting_id, user_id))`.
2. Migrate existing `profiles.attending` data into this table for Meeting 1.
3. Drop the `attending` column from profiles (or leave it as a cache for the "next upcoming meeting" that gets reset when a new meeting is created).
4. Update `AttendingToggle` to write to `meeting_attendance` with the current meeting ID.
5. Update the dashboard to query attendance for the specific meeting.
6. Reset attendance for each new meeting so users must re-confirm.

**Detection:**
- Attendance count carries over between meetings.
- Users see "Kommer" toggle already set for a meeting they have not responded to.
- Admin sees attendance numbers that do not reflect the current meeting.

**Phase to address:** Phase 1 (Schema Migration) -- attendance must be per-meeting from the start.

---

### Pitfall 11: Supabase postgres_changes Single-Filter Limitation

**What goes wrong:**
The `StationSelector` subscribes to `postgres_changes` on `station_sessions` with `filter: group_id=eq.${groupId}`. After adding meetings, the subscription should also filter by `meeting_id`. However, Supabase Realtime's `postgres_changes` supports only ONE filter expression per subscription (as of current documentation). You cannot do `filter: 'group_id=eq.X,meeting_id=eq.Y'` as a compound filter.

**Why it happens:**
The Supabase Realtime postgres_changes API accepts a `filter` parameter that maps to a single PostgreSQL equality check. Compound filters (AND conditions) are not supported in the filter parameter syntax. The workaround is to subscribe with one filter and do client-side filtering for additional conditions, or to restructure the data so one filter is sufficient.

**Consequences:**
- If you subscribe with only `group_id` filter, you receive events for ALL meetings where that group exists.
- If groups are per-meeting (new UUID each time), the `group_id` filter is sufficient because the ID is unique to the meeting.
- If groups persist across meetings, you must client-side filter for `meeting_id`, causing unnecessary event processing.

**Prevention:**
1. Make groups per-meeting. Each meeting creates fresh groups with new UUIDs. The single `group_id` filter on `postgres_changes` is then naturally meeting-scoped. This is the cleanest solution.
2. If groups must persist, subscribe with the `group_id` filter and filter client-side:
   ```typescript
   .on('postgres_changes', {
     filter: `group_id=eq.${groupId}`,
   }, (payload) => {
     if (payload.new.meeting_id !== currentMeetingId) return; // skip other meetings
   })
   ```
3. Document this limitation so future developers do not spend time trying to add compound filters.

**Detection:**
- Station selector receives and processes events from past meetings.
- Unexpected station status flickers on the dashboard.

**Phase to address:** Phase 1 (Architecture decision) -- the "groups per-meeting" decision eliminates this pitfall entirely.

---

## Minor Pitfalls

### Pitfall 12: REPLICA IDENTITY FULL Not Set on New Tables

**What goes wrong:**
Migration `010_realtime_replica_identity.sql` sets `REPLICA IDENTITY FULL` on `station_sessions` to enable Realtime's RLS evaluation on UPDATE events. If the new `meetings` table (or any new table added to `supabase_realtime` publication) does not also have `REPLICA IDENTITY FULL`, Realtime subscriptions on that table silently fail to deliver UPDATE and DELETE events.

**Prevention:**
For every new table added to the `supabase_realtime` publication, also set `REPLICA IDENTITY FULL`:
```sql
ALTER TABLE meetings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
```

**Phase to address:** Phase 1 (Schema Migration).

---

### Pitfall 13: Admin Server Actions Missing meeting_id Context

**What goes wrong:**
All admin server actions in `admin.ts` (createGroup, deleteGroup, saveGroupMembers, toggleGroupsLock) operate without meeting context. After multi-meeting, these actions must know WHICH meeting's groups they are managing. If they operate globally, `createGroup()` creates a group not attached to any meeting, and `toggleGroupsLock()` locks groups across all meetings.

**Prevention:**
1. Add `meetingId: string` as the first parameter to all group-related admin actions.
2. Update `createGroup()` to insert `meeting_id` into the groups row.
3. Update `saveGroupMembers()` to only clear/re-insert members for groups belonging to the specified meeting.
4. Update `toggleGroupsLock()` to only lock groups for the specified meeting.
5. The admin UI must pass the meeting ID from the route params.

**Phase to address:** Phase 2 (Meeting-scoped admin features).

---

### Pitfall 14: Word Cloud Aggregates Across All Meetings

**What goes wrong:**
The word cloud in `/admin/wordcloud` presumably queries all messages to build word frequencies. After multiple meetings, the word cloud shows combined data from all meetings, diluting the relevance of meeting-specific themes.

**Prevention:**
1. Add meeting filtering to the word cloud query.
2. Allow the admin to select which meeting(s) to include in the word cloud.
3. Default to the most recent meeting.

**Phase to address:** Phase 3 (Meeting-scoped admin features).

---

### Pitfall 15: Seed Data Migration Creates Ghost "Meeting 1"

**What goes wrong:**
The migration creates a `meetings` row to backfill existing data. This "Meeting 1" has no date, time, or place set by the admin. If it appears in the meeting list alongside real meetings, it looks broken or confusing. If it is hidden, the admin cannot browse the original meeting's data.

**Prevention:**
1. Give the backfill meeting sensible defaults: title "Fellesmote 1", date from the earliest `station_sessions.started_at`, place "Ikke angitt".
2. Mark it as `status: 'completed'` so it appears in the "previous meetings" list.
3. Make it browsable in read-only mode like any other past meeting.
4. Consider letting the admin edit the backfill meeting's metadata retroactively.

**Phase to address:** Phase 1 (Schema Migration).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema migration | Constraint ordering (#1), function updates (#4), stations unique (#5) | Single-transaction migration, test on branch first |
| RLS policy evolution | Orphaned policies (#2), profiles exposure (#8) | Update every policy that touches groups/sessions/stations |
| Realtime restructuring | Channel collisions (#3), single-filter limitation (#11), replica identity (#12) | Make groups per-meeting to naturally scope channels |
| URL route changes | Broken bookmarks (#7) | Deploy between meetings, add redirects |
| Contact directory | Profile data exposure (#8) | Column-level query restrictions at application layer |
| Attendance tracking | Global attending column (#10) | Per-meeting attendance table |
| Admin features | Unscoped actions (#13), combined exports (#9), combined word cloud (#14) | Pass meetingId to all admin operations |
| Data migration | Ghost Meeting 1 (#15), meeting_status obsolescence (#6) | Sensible defaults for backfill meeting, remove old table |

## Migration Execution Order

The pitfalls reveal a strict dependency chain for the migration:

1. **Create `meetings` table** -- other tables reference it
2. **Insert backfill "Meeting 1" row** -- needed for foreign key references
3. **Add `meeting_id` to `stations`** -- backfill, update unique constraint
4. **Add `meeting_id` to `groups`** -- backfill, groups become per-meeting
5. **Add `meeting_id` to `station_sessions`** -- backfill, update unique constraint
6. **Create `meeting_attendance` table** -- migrate data from `profiles.attending`
7. **Update all RPC functions** -- open_station, view_station, complete_station, reopen_station
8. **Update all RLS policies** -- groups, group_members, station_sessions, messages, stations
9. **Update Realtime RLS policies** -- station channels, dashboard channels
10. **Set REPLICA IDENTITY FULL on new tables**
11. **Drop `meeting_status` table** (or mark deprecated)
12. **Drop `profiles.attending` column** (or leave as cache, mark deprecated)

All 12 steps should be in a single migration file to ensure atomicity.

## Sources

- [Supabase Row Level Security (official docs)](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Supabase Realtime Authorization (official docs)](https://supabase.com/docs/guides/realtime/authorization) -- HIGH confidence
- [Supabase Realtime Postgres Changes (official docs)](https://supabase.com/docs/guides/realtime/postgres-changes) -- HIGH confidence
- [Supabase Realtime Concepts (official docs)](https://supabase.com/docs/guides/realtime/concepts) -- HIGH confidence
- [Supabase RLS Performance Best Practices (official docs)](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- HIGH confidence
- [PostgreSQL ALTER TABLE ADD COLUMN done right (Cybertec)](https://www.cybertec-postgresql.com/en/postgresql-alter-table-add-column-done-right/) -- HIGH confidence
- [Squawk: adding-foreign-key-constraint linter](https://squawkhq.com/docs/adding-foreign-key-constraint) -- HIGH confidence
- [Next.js Redirecting (official docs)](https://nextjs.org/docs/app/building-your-application/routing/redirecting) -- HIGH confidence
- [Supabase Realtime channel discussion (#31267)](https://github.com/orgs/supabase/discussions/31267) -- MEDIUM confidence
- [Zero-downtime Postgres migrations (GoCardless)](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) -- MEDIUM confidence
- Existing codebase analysis: `001_schema.sql`, `002_rls.sql`, `007_station_chat.sql`, `013_dashboard_realtime_policy.sql`, `014_reopen_station.sql`, `station.ts`, `StationSelector.tsx`, `useRealtimeChat.ts`, `export/route.ts`, `build-markdown.ts` -- HIGH confidence

---
*Pitfalls research for: Buss 2028 Fellesmote v1.1 Multi-Meeting Migration*
*Researched: 2026-02-25*
