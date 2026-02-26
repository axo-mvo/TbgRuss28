# Roadmap: Buss 2028 Fellesmote-appen

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-02-19)
- v1.1 Multi-Meeting Platform - Phases 6-9 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-02-19</summary>

- [x] **Phase 1: Foundation and Authentication** - Project setup, Supabase schema, invite-code registration, login, role-based routing, and base UI with design system (completed 2026-02-19)
- [x] **Phase 2: Admin Panel** - User management, parent-child linking view, group creation/assignment, and meeting-day group locking (completed 2026-02-19)
- [x] **Phase 3: Station Chat and Timer** - Station selector dashboard, real-time group chat via Supabase Broadcast, synchronized 15-minute countdown timer, and message display (completed 2026-02-19)
- [x] **Phase 4: Station Flow and Resilience** - End-station confirmation, group-wide redirect, completed station read-only mode, and connection status indicator (completed 2026-02-19)
- [x] **Phase 5: Export** - Admin Markdown export of all conversations grouped by station and group (completed 2026-02-19)

### Phase 1: Foundation and Authentication
**Goal**: Users can register with an invite code, log in, and be routed to the correct dashboard based on their role, all within a mobile-optimized Norwegian UI
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DSGN-01, DSGN-02, DSGN-03
**Success Criteria** (what must be TRUE):
  1. User can register by entering a valid invite code, name, email, and password -- and the invite code determines whether they are youth or parent
  2. Parent registering can select their child(ren) from a dropdown of already-registered youth
  3. User can log in with email/password and is automatically routed to admin dashboard (if admin) or participant dashboard (if youth/parent)
  4. All UI text is in Norwegian (bokmal), the color palette matches the spec (dark teal, coral, warm white), and the layout works on mobile phones
  5. Supabase project is configured with database schema, RLS policies, three-client pattern (browser/server/admin), and auth middleware using getUser()
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Project setup, Supabase infrastructure, Tailwind v4 design system, and database migrations
- [x] 01-02-PLAN.md -- Registration flow, login flow, and role-based routing with layout guards

### Phase 2: Admin Panel
**Goal**: Admin can manage users, view parent-child links, create groups with parent-child separation logic, and lock groups so participants see their assignment
**Depends on**: Phase 1
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06
**Success Criteria** (what must be TRUE):
  1. Admin can view a list of all registered users showing name, email, role, and registration date
  2. Admin can see which youth each parent is linked to, and can change a user's role or delete a user
  3. Admin can create discussion groups, assign members, and parents are NEVER placed in the same group as their linked child (admin gets a warning on conflict)
  4. Admin can lock groups, after which participants see their group assignment on their dashboard
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Backend foundation: DB migrations, server actions, UI primitives, admin hub
- [x] 02-02-PLAN.md -- User management page: user table, search, role editing, deletion, parent-link editing
- [x] 02-03-PLAN.md -- Group builder: drag-and-drop/tap-to-assign, parent-child separation, lock/publish, dashboard update

### Phase 3: Station Chat and Timer
**Goal**: Participants can open a station, see real-time messages from their group, and track a synchronized 15-minute countdown timer
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, TIMR-01, TIMR-02, TIMR-03, TIMR-04
**Success Criteria** (what must be TRUE):
  1. Participant sees 6 station cards on their dashboard with per-group status (available, active, completed), and only one station can be active per group at a time
  2. Participant can open an available station and send/receive messages in real-time -- messages appear instantly for all group members with sender name, role badge, timestamp, and visual differentiation for own messages
  3. Chat auto-scrolls to newest message unless the user has scrolled up to read history
  4. A 15-minute countdown starts when the first group member opens a station, all group members see the same synchronized time, and the timer changes color (white above 5 min, yellow 1-5 min, red below 1 min)
  5. At 0:00 the timer displays "Tiden er ute!" and chat remains open (soft deadline)
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- Station backend: DB migration (Realtime RLS, open_station function), server actions, React hooks (chat, timer, auto-scroll)
- [x] 03-02-PLAN.md -- Station UI: station selector on dashboard, chat page with messages, input, timer display, and full wiring

### Phase 4: Station Flow and Resilience
**Goal**: Groups can complete stations and move through the rotation, with completed stations viewable in read-only mode and connection issues visible to users
**Depends on**: Phase 3
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. Any group member can end the current station via a confirmation dialog, which redirects all group members back to the station selector
  2. Completed stations appear as completed on the station selector and can be opened in read-only mode to review the discussion
  3. A connection status indicator shows reconnecting/offline state so users know when real-time updates may be delayed
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- End station flow: complete_station Postgres function, endStation server action, broadcast redirect, readOnly ChatRoom mode
- [x] 04-02-PLAN.md -- Read-only navigation: tappable completed stations, page readOnly detection, connection status hook and indicator

### Phase 5: Export
**Goal**: Admin can export all meeting discussions as a structured Markdown file for downstream processing
**Depends on**: Phase 3
**Requirements**: EXPT-01, EXPT-02
**Success Criteria** (what must be TRUE):
  1. Admin can trigger an export that generates a Markdown file containing all conversations
  2. The export is organized by station, then by group within each station, with timestamps and author information preserved
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md -- Markdown export: Route Handler, builder function, admin page export button

</details>

### v1.1 Multi-Meeting Platform (In Progress)

**Milestone Goal:** Evolve from a single-meeting app to a meeting-series platform with admin-configurable meetings, a contact directory, and browsable meeting history.

- [x] **Phase 6: Schema Migration** - Migrate database to meeting-scoped structure, preserving v1.0 data as the first previous meeting (completed 2026-02-26)
- [x] **Phase 7: Admin Meeting Management** - Admin can create meetings with custom stations, manage per-meeting groups, and control meeting lifecycle (completed 2026-02-26)
- [ ] **Phase 7.1: Fix Phase 7 Integration Bugs** - INSERTED: Fix Supabase query builder mutation bugs in meeting-scoped group operations, resolve tech debt
- [ ] **Phase 8: Contact Directory and Dashboard** - Searchable contact directory as permanent dashboard, meeting-state-aware UI, per-meeting attendance
- [ ] **Phase 9: Meeting History** - Browse previous meetings with read-only discussions, per-meeting word cloud, consolidated admin detail view

## Phase Details

### Phase 6: Schema Migration
**Goal**: The database supports multiple meetings with all existing v1.0 data preserved and accessible
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: MEET-03, MEET-05, SCOPE-03
**Success Criteria** (what must be TRUE):
  1. A `meetings` table exists with status, date, time, and venue columns, and a partial unique index enforces only one upcoming meeting at a time
  2. All v1.0 stations, groups, group members, sessions, and messages exist under a backfilled "Fellesmote #1" meeting with their original UUIDs intact
  3. All four Postgres RPC functions (open_station, view_station, end_station, get_word_frequencies) operate correctly against the new meeting-scoped tables
  4. Real-time chat continues to work identically to v1.0 (Realtime RLS policy updated for new table names)
  5. The app boots and functions as before with no user-visible regressions
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md -- Migration SQL file: meetings table, FK columns, backfill, constraints, RLS policies
- [x] 06-02-PLAN.md -- Apply migration to Supabase and verify zero regressions

### Phase 7: Admin Meeting Management
**Goal**: Admin can create and fully configure meetings with custom stations, per-meeting groups, and lifecycle control
**Depends on**: Phase 6
**Requirements**: MEET-01, MEET-02, MEET-04, SCOPE-01, SCOPE-04, SCOPE-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a new meeting by entering a date, time, and venue, and the meeting appears as the upcoming meeting
  2. Admin can add, edit, reorder, and remove stations on a meeting, each with a title, questions, and optional tip
  3. Admin can build groups for a specific meeting using the existing drag-and-drop group builder, and those groups are scoped to that meeting only
  4. Admin can progress a meeting through its lifecycle (upcoming to active to completed) and the app responds accordingly
  5. Export downloads a markdown file scoped to a specific meeting, and word cloud displays frequencies from that meeting's discussions only
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md -- Meeting CRUD server actions, meetings overview/creation/detail routes, admin hub restructure
- [x] 07-02-PLAN.md -- Meeting detail tabs, station CRUD with drag-and-drop reorder, inline station editor
- [x] 07-03-PLAN.md -- Meeting-scoped groups, lifecycle controls, meeting-scoped export and word cloud

### Phase 7.1: Fix Phase 7 Integration Bugs (INSERTED)
**Goal**: Fix Supabase query builder mutation bugs that cause meeting-scoped group operations to leak across meetings, and resolve tech debt from Phase 7
**Depends on**: Phase 7
**Requirements**: SCOPE-01
**Gap Closure**: Closes gaps from v1.1 milestone audit
**Success Criteria** (what must be TRUE):
  1. `createGroup` name-availability check is scoped to the current meeting only — group names from other meetings do not block reuse
  2. `toggleGroupsLock` only affects groups belonging to the specified meeting — other meetings' groups are untouched
  3. `reorderStations` is properly awaited in the drag-end handler so server errors are caught and surfaced
  4. Orphaned `/admin/groups` and `/admin/wordcloud` routes are removed or redirected
**Plans**: TBD

Plans:
- [ ] 07.1-01-PLAN.md -- Fix Supabase query builder bugs and resolve Phase 7 tech debt

### Phase 8: Contact Directory and Dashboard
**Goal**: Users see a permanent searchable contact directory on the dashboard with meeting-state-aware content and per-meeting attendance
**Depends on**: Phase 7
**Requirements**: DIR-01, DIR-02, DIR-03, DIR-04, SCOPE-02, DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. Dashboard always shows a searchable contact directory where users can find any member by name
  2. Youth-centered directory view lets users expand a youth entry to see linked parents with their name, phone, and email
  3. Flat "everyone" view shows all members alphabetically with tap-to-call and tap-to-email action links
  4. Dashboard adapts to meeting state: shows upcoming meeting card when one exists, shows active meeting stations when meeting is active, shows only directory and previous meetings when no upcoming meeting exists
  5. Users can mark attendance (kommer/kommer ikke) on the upcoming meeting, and the attendance count is visible on the meeting card
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md -- Per-meeting attendance schema (meeting_attendance table, migration, server action, AttendingToggle update)
- [ ] 08-02-PLAN.md -- Contact directory components (ContactDirectory, YouthDirectoryView, EveryoneDirectoryView, ContactActions)
- [ ] 08-03-PLAN.md -- Meeting-state-aware dashboard restructuring (UpcomingMeetingCard, PreviousMeetingsList, dashboard page rewrite)

### Phase 9: Meeting History
**Goal**: Users can browse previous meetings and read past discussions, and admin has a consolidated per-meeting detail view
**Depends on**: Phase 8
**Requirements**: DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Previous meetings are listed on the dashboard with date, venue, and summary info, and users can tap into any past meeting
  2. Past meeting discussions are viewable in read-only mode per station per group, reusing the existing ChatRoom component
  3. Admin meeting detail view consolidates stations config, groups, word cloud, and export for each meeting in one place
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md -- Participant meeting history page with station/group picker, inline read-only discussions, and tappable PreviousMeetingsList links

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Authentication | v1.0 | 2/2 | Complete | 2026-02-19 |
| 2. Admin Panel | v1.0 | 3/3 | Complete | 2026-02-19 |
| 3. Station Chat and Timer | v1.0 | 2/2 | Complete | 2026-02-19 |
| 4. Station Flow and Resilience | v1.0 | 2/2 | Complete | 2026-02-19 |
| 5. Export | v1.0 | 1/1 | Complete | 2026-02-19 |
| 6. Schema Migration | v1.1 | 2/2 | Complete | 2026-02-26 |
| 7. Admin Meeting Management | v1.1 | 3/3 | Complete | 2026-02-26 |
| 7.1 Fix Phase 7 Integration Bugs | v1.1 | 0/? | Not started | - |
| 8. Contact Directory and Dashboard | v1.1 | 0/? | Not started | - |
| 9. Meeting History | v1.1 | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-19*
*Last updated: 2026-02-26 -- phase 9 planned (1 plan)*
