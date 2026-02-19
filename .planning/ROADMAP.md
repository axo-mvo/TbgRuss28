# Roadmap: Buss 2028 Fellesmote-appen

## Overview

This roadmap delivers a real-time group discussion webapp for ~80 users (youth, parents, admins) rotating through 6 discussion stations during a single in-person meeting. The build progresses from authentication and project foundation, through admin tools for group management, to the core meeting-day experience (real-time chat + timer), station lifecycle flow, and finally post-meeting data export. Every phase delivers a coherent, testable capability. The app is mobile-first, Norwegian-language, and deployed on Vercel + Supabase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Authentication** - Project setup, Supabase schema, invite-code registration, login, role-based routing, and base UI with design system (completed 2026-02-19)
- [x] **Phase 2: Admin Panel** - User management, parent-child linking view, group creation/assignment, and meeting-day group locking (completed 2026-02-19)
- [ ] **Phase 3: Station Chat and Timer** - Station selector dashboard, real-time group chat via Supabase Broadcast, synchronized 15-minute countdown timer, and message display
- [ ] **Phase 4: Station Flow and Resilience** - End-station confirmation, group-wide redirect, completed station read-only mode, and connection status indicator
- [ ] **Phase 5: Export** - Admin Markdown export of all conversations grouped by station and group

## Phase Details

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
- [ ] 01-01-PLAN.md — Project setup, Supabase infrastructure, Tailwind v4 design system, and database migrations
- [ ] 01-02-PLAN.md — Registration flow, login flow, and role-based routing with layout guards

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
- [ ] 02-01-PLAN.md -- Backend foundation: DB migrations, server actions, UI primitives, admin hub
- [ ] 02-02-PLAN.md -- User management page: user table, search, role editing, deletion, parent-link editing
- [ ] 02-03-PLAN.md -- Group builder: drag-and-drop/tap-to-assign, parent-child separation, lock/publish, dashboard update

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
- [ ] 03-02-PLAN.md -- Station UI: station selector on dashboard, chat page with messages, input, timer display, and full wiring

### Phase 4: Station Flow and Resilience
**Goal**: Groups can complete stations and move through the rotation, with completed stations viewable in read-only mode and connection issues visible to users
**Depends on**: Phase 3
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. Any group member can end the current station via a confirmation dialog, which redirects all group members back to the station selector
  2. Completed stations appear as completed on the station selector and can be opened in read-only mode to review the discussion
  3. A connection status indicator shows reconnecting/offline state so users know when real-time updates may be delayed
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Export
**Goal**: Admin can export all meeting discussions as a structured Markdown file for downstream processing
**Depends on**: Phase 3
**Requirements**: EXPT-01, EXPT-02
**Success Criteria** (what must be TRUE):
  1. Admin can trigger an export that generates a Markdown file containing all conversations
  2. The export is organized by station, then by group within each station, with timestamps and author information preserved
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Authentication | 0/2 | Complete    | 2026-02-19 |
| 2. Admin Panel | 0/2 | Complete    | 2026-02-19 |
| 3. Station Chat and Timer | 1/2 | In Progress | - |
| 4. Station Flow and Resilience | 0/1 | Not started | - |
| 5. Export | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-19*
*Last updated: 2026-02-19*
