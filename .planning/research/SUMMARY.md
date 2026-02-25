# Project Research Summary

**Project:** Buss 2028 Fellesmote v1.1
**Domain:** Multi-meeting platform evolution for in-person structured group discussions
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

The v1.0 app is a fully working single-meeting real-time discussion platform built on Next.js 15, Supabase, and Tailwind CSS. The v1.1 evolution converts it into a meeting-series platform by introducing a `meetings` table as the new central entity, then re-scoping every meeting-day artifact — stations, groups, attendance, sessions, messages — under that container via foreign keys. The central finding from research is that zero new npm packages are required. The work is entirely SQL schema migration, route restructuring, and component composition using patterns already proven in the v1.0 codebase. Every v1.1 feature was evaluated individually and confirmed coverable by the existing stack.

The recommended approach is a strictly phased migration: start with the database schema and data migration (the single most critical and highest-risk step), then build admin meeting management, then redesign the dashboard around a permanent contact directory, and finally add read-only meeting history. The migration must run atomically in a single SQL transaction and must preserve existing row UUIDs so that all existing `station_sessions` and `messages` rows remain valid without data rewriting. Deploying the schema first means every subsequent phase can be developed and tested against real migrated v1.0 data.

The key risks are concentrated in Phase 1: wrong constraint ordering, un-updated Postgres functions, or a buggy Realtime RLS policy can each cause silent data corruption or break real-time chat entirely. All risks are fully mitigable by running the migration on a Supabase branch database first and making groups per-meeting (new UUIDs each time), which naturally scopes all Realtime channel names and eliminates the Supabase `postgres_changes` compound filter limitation without any workaround code.

## Key Findings

### Recommended Stack

No new npm dependencies are required. The existing stack — Next.js 15.5 App Router, React 19, Supabase JS 2.97, @supabase/ssr 0.8, Tailwind CSS 4, @dnd-kit/react 0.3.2, TypeScript 5 — already covers every v1.1 feature. Date formatting uses the native `Intl.DateTimeFormat('nb-NO')` API already working in production. Search uses client-side `Array.filter()`, sufficient for 80 users. Form handling uses plain HTML forms with server actions, the established app pattern throughout v1.0.

**Core technologies:**
- **Next.js 15 App Router:** Server Components + Server Actions for all data fetching and mutations — already in use, no version change
- **Supabase JS v2.97 + @supabase/ssr:** Database CRUD, RLS, Realtime channels — already in use; new tables follow identical query patterns
- **Tailwind CSS 4:** All new UI components styled with existing utility classes — no config changes needed
- **@dnd-kit/react 0.3.2:** Group builder drag-and-drop already installed; reused as-is for per-meeting group management
- **Raw SQL migrations:** Project writes manual `.sql` files in `supabase/migrations/` — continue this pattern for the v1.1 migration

**What NOT to add:** `date-fns`, `react-datepicker`, `Fuse.js`, `react-hook-form`, `zod`, `react-query` — all evaluated and rejected as unnecessary overhead at this scale and usage pattern.

### Expected Features

**Must have (table stakes) — P1:**
- Meeting entity CRUD with title, date, time, venue, and lifecycle status — the foundational data model change that enables everything else
- Schema migration adding `meeting_id` FKs throughout and backfilling v1.0 data as "Fellesmote #1"
- Admin-configurable stations per meeting (title, questions array, optional tip) — replaces v1.0 hardcoded stations
- Per-meeting groups — Group Builder scoped to each meeting (new UUIDs each time)
- Per-meeting attendance — `meeting_attendance` junction table replacing `profiles.attending`
- Meeting lifecycle management — admin controls progressing meetings: upcoming → active → completed
- Searchable contact directory — permanent dashboard anchor, independent of meetings, serves the app between meetings
- Expandable directory entries with phone, email, and tap-to-call / tap-to-email action buttons
- Dashboard state awareness — three states: upcoming meeting, active meeting, no upcoming meeting
- Meeting history browsing — read-only past discussions per station per group
- Per-meeting export and word cloud — query filter additions to existing working features

**Should have (polish) — P2:**
- Attendance summary on meeting card ("18 kommer / 5 kan ikke / 12 ikke svart" stat pills)
- Contact action buttons in directory (tel: and mailto: links styled as tappable buttons)
- Consolidated admin meeting detail view with stations, groups, attendance, word cloud, and export in one page

**Defer to v2+ — P3:**
- Station copy from previous meeting (only valuable after 2+ meetings exist)
- Flat "everyone" directory view toggle (alphabetical list regardless of role)
- Meeting summary cards with aggregate stats in history list

**Explicitly excluded (anti-features):** Recurring meeting templates, multiple concurrent upcoming meetings, push notifications, calendar integration (ical/Google), in-app user-to-user messaging, PDF export, attendance reminders — all evaluated and rejected in FEATURES.md with rationale.

### Architecture Approach

The v1.0 app has a flat, single-meeting architecture with global `groups`, `group_members`, `stations`, and a singleton `meeting_status` row. The v1.1 strategy is UUID-preserving table replacement: old tables (`groups`, `group_members`, `stations`, `meeting_status`) are replaced by new meeting-scoped tables (`meeting_groups`, `meeting_group_members`, `meeting_stations`, `meetings` with per-row status). By copying v1.0 rows into the new tables with the same primary key UUIDs, all existing `station_sessions` and `messages` rows remain valid with no data rewriting. The Realtime channel convention (`station:{sessionId}`) is unchanged because sessionId already encodes meeting context via the FK chain.

**Major components:**

1. **SQL Migration (020_multi_meeting.sql)** — Creates new tables, backfills v1.0 data as "Fellesmote #1" with UUID preservation, updates UNIQUE constraints and SECURITY DEFINER Postgres functions, updates all RLS policies including the Realtime channel policy, drops obsolete tables — all in a single transaction
2. **Admin Meeting Management (/admin/meetings + /admin/meetings/[meetingId])** — Create/edit meetings, configure stations per meeting, manage per-meeting groups; replaces current top-level `/admin/groups` and `/admin/wordcloud` routes
3. **Contact Directory (components/directory/ContactDirectory.tsx)** — New client component with `useState` search, reuses existing `SearchInput` component; reads global `profiles` + `parent_youth_links`, not meeting-scoped
4. **Dashboard Redesign (dashboard/page.tsx rewrite)** — Always shows contact directory; conditionally shows upcoming meeting card with station selector when groups are locked; always shows previous meetings list
5. **Meeting History (/meeting/[meetingId])** — New read-only route group; reuses existing `ChatRoom` with `readOnly=true` prop (already implemented in v1.0)
6. **Updated Server Actions** — New `lib/actions/meetings.ts`, `meeting-stations.ts`, `attendance.ts`; modified `station.ts` to derive meeting context from stationId via FK lookup rather than querying global `group_members`

### Critical Pitfalls

1. **Migration constraint ordering causes mid-execution failure** — Add `meeting_id` as NULLABLE first, backfill all rows, set NOT NULL, then update UNIQUE constraints. Drop old `UNIQUE(number)` on stations and replace with `UNIQUE(meeting_id, number)`. All 12 migration steps must run in a single SQL transaction. Test on a Supabase branch before production. (PITFALLS #1, #5)

2. **Realtime RLS policy update is the single highest-risk change** — The `realtime.messages` policy must be updated to reference `meeting_group_members` instead of `group_members`. A bug here silently breaks all real-time chat for all users with no visible error. Thoroughly test on staging before deploying. (PITFALL #3)

3. **Postgres SECURITY DEFINER functions must update atomically with schema** — `open_station()` and `view_station()` use `ON CONFLICT (station_id, group_id)` which references the old unique constraint. After adding `meeting_id` to the composite unique constraint, both functions must be updated in the same migration or ON CONFLICT silently stops matching and creates duplicate sessions. (PITFALL #4)

4. **Groups must be per-meeting (new UUIDs each time)** — This single architectural decision eliminates the Supabase `postgres_changes` single-filter limitation (PITFALL #11) and naturally scopes all Realtime `dashboard:{groupId}` channels. If groups were reused across meetings, `postgres_changes` subscriptions would receive events from all meetings for that group, requiring complex client-side filtering.

5. **UUID preservation is non-negotiable during migration** — The migration MUST use `INSERT INTO meeting_stations (id, ...) SELECT s.id, ...` syntax to copy rows with the same primary keys. If UUIDs change, all `station_sessions` and `messages` rows become orphaned foreign key violations and the v1.0 discussion data is lost.

## Implications for Roadmap

The feature dependency graph from FEATURES.md and the build order from ARCHITECTURE.md are in complete agreement. The research supports a 4-phase structure with a clear dependency chain.

### Phase 1: Schema Migration and Foundation

**Rationale:** Every other feature depends on the new schema. Nothing meeting-scoped can be built until `meetings`, `meeting_stations`, `meeting_groups`, `meeting_group_members`, and `meeting_attendance` tables exist with correct RLS and updated Postgres functions. This is the highest-risk phase — all 5 critical pitfalls live here. Complete and verify this before writing any UI code.

**Delivers:** A migrated database where v1.0 data is preserved as "Fellesmote #1", all new tables exist with correct indexes and RLS policies, all Postgres functions are updated, Realtime RLS policy is updated, and TypeScript types are regenerated. The app should continue functioning as v1.0 after this phase.

**Features addressed:** Meeting entity foundation, schema migration, per-meeting attendance table, `meeting_status` removal, `profiles.attending` migration

**Pitfalls to avoid:** #1 (constraint ordering), #3 (Realtime RLS), #4 (Postgres function atomicity), #5 (stations UNIQUE constraint), #6 (meeting_status obsolescence), #10 (attending column migration), #11 (groups per-meeting decision), #12 (REPLICA IDENTITY FULL on new tables), #15 (sensible defaults for backfill meeting)

**Research flag:** No additional research needed. The full migration script with exact SQL is specified in ARCHITECTURE.md. Standard Supabase migration workflow.

### Phase 2: Admin Meeting Management

**Rationale:** Admin must be able to create meetings and configure stations before the dashboard has anything meeting-related to show. The group builder and attendance features also need a meeting to scope to. This phase unblocks all user-facing meeting features.

**Delivers:** `/admin/meetings` list with create form, `/admin/meetings/[meetingId]` detail page with station editor (add/edit/remove/reorder), adapted Group Builder for per-meeting groups, meeting lifecycle controls (start/end), updated export route with `meetingId` parameter.

**Features addressed:** Admin meeting CRUD, admin-configurable stations per meeting, per-meeting groups (Group Builder), meeting lifecycle management, per-meeting export

**Pitfalls to avoid:** #7 (deploy URL changes between meetings, never during one), #9 (export route must filter by meetingId), #13 (all admin server actions need meetingId parameter)

**Research flag:** No additional research needed. All patterns (Server Components, Server Actions, Supabase CRUD) are well-documented and established in the v1.0 codebase.

### Phase 3: Dashboard Redesign and Contact Directory

**Rationale:** The contact directory is independent of meetings (reads from global `profiles`) so its component can be built in parallel with Phase 2. However, the full dashboard integration — combining meeting card, station selector, directory, and history list — requires Phase 1 schema to exist. Grouping directory and dashboard together keeps the user-facing surface consistent at launch.

**Delivers:** Permanent contact directory with search and expandable youth-parent entries with contact action buttons, redesigned dashboard with meeting-state awareness (upcoming meeting card, station selector when groups locked, previous meetings list), updated `AttendingToggle` writing to `meeting_attendance`, attendance summary stat pills on meeting card.

**Features addressed:** Searchable contact directory, expandable entries with contact info, dashboard state awareness, per-meeting attendance toggle, attendance summary on meeting card

**Pitfalls to avoid:** #2 (RLS on groups/sessions must be meeting-scoped, completed in Phase 1), #8 (profile data exposure — query only needed columns at application layer; acceptable risk for this closed group)

**Research flag:** No additional research needed. Contact directory is client-side `Array.filter()` on 80 rows. Dashboard state machine has three well-defined states documented in FEATURES.md and ARCHITECTURE.md.

### Phase 4: Meeting History and Cleanup

**Rationale:** Meeting history requires migrated v1.0 data (Phase 1) and the dashboard meeting list (Phase 3) to navigate from. The read-only chat view already exists in v1.0 (`ChatRoom` has `readOnly=true` mode). This is the lowest-risk phase and can be deprioritized without blocking the core multi-meeting functionality.

**Delivers:** `/meeting/[meetingId]` overview page with station list and group discussion counts, read-only station chat views reusing existing `ChatRoom` component, per-meeting word cloud scoped to meeting's stations, redirect handlers for deprecated routes (`/admin/groups` → `/admin/meetings/[id]/groups`, `/admin/wordcloud` → `/admin/meetings/[id]`).

**Features addressed:** Meeting history browsing, per-meeting word cloud, consolidated admin meeting detail view, route cleanup

**Pitfalls to avoid:** #7 (add redirects in `next.config.ts` for old admin routes), #14 (word cloud must filter messages by meetingId's stations)

**Research flag:** No additional research needed. Read-only `ChatRoom` is already implemented. New routes follow established Next.js App Router dynamic route patterns.

### Phase Ordering Rationale

- Schema-first is mandatory: the FK chain `meetings → stations → sessions → messages` underpins every query in the app. Building UI against the old schema would require complete rewrites after migration.
- Admin before dashboard: admin must create a meeting with stations and groups before the dashboard has meeting-scoped content to display. The contact directory is the only dashboard feature buildable in parallel.
- History last: meeting history provides the most value after multiple meetings have been run and is the lowest technical risk (read-only + existing components), making it safe to deprioritize if time is constrained.
- Groups per-meeting is a Phase 1 architectural commitment that eliminates a class of Realtime bugs in Phase 3 at no additional implementation cost.

### Research Flags

**Phases with standard, well-documented patterns — skip `/gsd:research-phase`:**
- **Phase 1:** Migration SQL is fully specified in ARCHITECTURE.md with exact DDL. Standard Supabase SQL migration workflow.
- **Phase 2:** Admin CRUD follows patterns already in `src/lib/actions/admin.ts`. Server Components + Server Actions are well-documented.
- **Phase 3:** Contact directory is straightforward client-side filtering. Dashboard state machine has three defined states.
- **Phase 4:** Read-only chat is already implemented in v1.0. Route cleanup is mechanical.

No phase requires additional domain research before implementation begins.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies validated in production v1.0. Zero new packages confirmed by evaluating each v1.1 feature individually against the existing stack. |
| Features | HIGH | Based on direct codebase analysis of all v1.0 files and PROJECT.md requirements. Dependency tree is explicit and verified against the migration structure. |
| Architecture | HIGH | Migration strategy directly analyzed all 19 migration files, 4 Postgres functions, 5 server actions, and the complete route structure. UUID preservation strategy is technically sound. |
| Pitfalls | HIGH | Each pitfall is traced to specific code locations in the codebase. Prevention strategies are concrete with exact SQL. Verified against official Supabase and PostgreSQL documentation. |

**Overall confidence: HIGH**

### Gaps to Address

- **Migration staging environment:** The migration must be tested on a Supabase branch or staging project before production. Confirm a branch database is available before starting Phase 1. This is a process requirement, not a technical uncertainty.
- **"One upcoming meeting" enforcement in UI:** ARCHITECTURE.md specifies a partial unique index (`WHERE status = 'upcoming'`) to enforce only one upcoming meeting at the database level. The admin UI must also handle this gracefully — either disabling the "create meeting" button when one exists, or auto-transitioning the previous upcoming meeting. The exact UX is unspecified; Phase 2 should decide this explicitly.
- **Station ordering UI decision:** STACK.md notes drag-and-drop for stations is optional since admin can assign numbers manually, and `@dnd-kit/react` is already installed if needed. Phase 2 should decide upfront whether to use drag-and-drop or simple up/down arrow buttons for station reordering. Either approach is technically trivial; the decision just needs to be made.

## Sources

### Primary (HIGH confidence)
- Existing codebase: all 19 migration files, 4 Postgres functions, 5 server actions, complete route structure — direct analysis
- PROJECT.md — primary requirements document
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns
- [Supabase Realtime Authorization docs](https://supabase.com/docs/guides/realtime/authorization) — Realtime RLS
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) — single-filter limitation confirmed
- [Supabase Database Migrations docs](https://supabase.com/docs/guides/deployment/database-migrations) — migration workflow patterns
- [Next.js Dynamic Routes docs](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) — `[meetingId]` route patterns
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.97.0 confirmed latest as of 2026-02-25
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) — nb-NO locale support

### Secondary (MEDIUM confidence)
- [Supabase Realtime channel discussion #31267](https://github.com/orgs/supabase/discussions/31267) — channel behavior across meetings
- [Zero-downtime Postgres migrations (GoCardless)](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) — migration safety patterns
- [formatjs/formatjs#3066](https://github.com/formatjs/formatjs/issues/3066) — Chrome nb-NO issue was formatjs-specific, not Intl API (resolved July 2024)
- [PostgreSQL ALTER TABLE ADD COLUMN done right (Cybertec)](https://www.cybertec-postgresql.com/en/postgresql-alter-table-add-column-done-right/) — nullable-first column addition
- [Next.js Redirecting docs](https://nextjs.org/docs/app/building-your-application/routing/redirecting) — redirect patterns for deprecated routes

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
