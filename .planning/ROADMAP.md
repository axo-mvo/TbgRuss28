# Roadmap: Buss 2028 Fellesmote-appen

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-02-19)
- v1.1 Multi-Meeting Platform - Phases 6-9 (shipped 2026-02-26)

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

</details>

<details>
<summary>v1.1 Multi-Meeting Platform (Phases 6-9) - SHIPPED 2026-02-26</summary>

- [x] **Phase 6: Schema Migration** - Migrate database to meeting-scoped structure, preserving v1.0 data as the first previous meeting (completed 2026-02-26)
- [x] **Phase 7: Admin Meeting Management** - Admin can create meetings with custom stations, manage per-meeting groups, and control meeting lifecycle (completed 2026-02-26)
- [x] **Phase 7.1: Fix Phase 7 Integration Bugs** (INSERTED) - Fix Supabase query builder mutation bugs in meeting-scoped group operations, resolve tech debt (completed 2026-02-26)
- [x] **Phase 8: Contact Directory and Dashboard** - Searchable contact directory as permanent dashboard, meeting-state-aware UI, per-meeting attendance (completed 2026-02-26)
- [x] **Phase 9: Meeting History** - Browse previous meetings with read-only discussions, consolidated admin detail view (completed 2026-02-26)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Authentication | v1.0 | 2/2 | Complete | 2026-02-19 |
| 2. Admin Panel | v1.0 | 3/3 | Complete | 2026-02-19 |
| 3. Station Chat and Timer | v1.0 | 2/2 | Complete | 2026-02-19 |
| 4. Station Flow and Resilience | v1.0 | 2/2 | Complete | 2026-02-19 |
| 5. Export | v1.0 | 1/1 | Complete | 2026-02-19 |
| 6. Schema Migration | v1.1 | 2/2 | Complete | 2026-02-26 |
| 7. Admin Meeting Management | v1.1 | 3/3 | Complete | 2026-02-26 |
| 7.1 Fix Phase 7 Integration Bugs | v1.1 | 1/1 | Complete | 2026-02-26 |
| 8. Contact Directory and Dashboard | v1.1 | 3/3 | Complete | 2026-02-26 |
| 9. Meeting History | v1.1 | 1/1 | Complete | 2026-02-26 |

---
*Roadmap created: 2026-02-19*
*Last updated: 2026-02-26 — v1.1 milestone shipped*
