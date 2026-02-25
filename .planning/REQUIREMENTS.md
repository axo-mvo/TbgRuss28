# Requirements: Buss 2028 Fellesmote-appen

**Defined:** 2026-02-25
**Core Value:** Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly

## v1.1 Requirements

Requirements for milestone v1.1 — Multi-Meeting Platform. Each maps to roadmap phases.

### Meeting Management

- [x] **MEET-01**: Admin can create a meeting with date, time, and venue
- [x] **MEET-02**: Admin can configure stations per meeting (title, questions, optional tip)
- [x] **MEET-03**: Only one upcoming meeting exists at a time (enforced by DB constraint)
- [ ] **MEET-04**: Admin controls meeting lifecycle: upcoming → active → completed
- [x] **MEET-05**: Existing v1.0 data migrates into new schema as the first previous meeting

### Per-Meeting Scoping

- [ ] **SCOPE-01**: Groups are created fresh per meeting via the existing group builder
- [ ] **SCOPE-02**: Attendance (kommer/kommer ikke) is tracked per meeting, not globally
- [x] **SCOPE-03**: Station sessions and messages are scoped to their meeting via FK chain
- [ ] **SCOPE-04**: Export downloads discussions from a specific meeting with meeting title/date in header
- [ ] **SCOPE-05**: Word cloud shows word frequencies from a specific meeting's discussions

### Contact Directory

- [ ] **DIR-01**: Dashboard shows a searchable contact directory as the main view
- [ ] **DIR-02**: Youth-centered view: expand a youth to see linked parents with contact info
- [ ] **DIR-03**: Flat "everyone" view: all members searchable alphabetically by name
- [ ] **DIR-04**: Contact info shows name, phone, email with tap-to-call and tap-to-email links

### Dashboard & Navigation

- [ ] **DASH-01**: Dashboard reflects current state: upcoming meeting card, active meeting stations, or no-meeting directory view
- [ ] **DASH-02**: Previous meetings are browsable from the dashboard with date, venue, and summary stats
- [ ] **DASH-03**: Past meeting discussions are viewable in read-only mode (reuses existing ChatRoom readOnly)
- [ ] **DASH-04**: Admin meeting detail view consolidates groups, export, word cloud, and station config per meeting

## v1.0 Requirements (Validated)

All 31 requirements from v1.0 are validated and complete. See previous REQUIREMENTS.md version for full list.

Categories: Authentication (5), Admin (6), Station Chat (7), Timer (4), Station Flow (4), Export (2), Design (3).

## Future Requirements

Deferred beyond v1.1. Tracked but not in current roadmap.

### Meeting Enhancements

- **METE-01**: Copy stations from a previous meeting when creating a new one
- **METE-02**: Attendance summary stats on meeting card (X kommer, Y kan ikke, Z har ikke svart)

### Admin Enhancements

- **ADME-01**: Invite code management UI
- **ADME-02**: Live admin dashboard (messages per station, active users per group)

### Chat Enhancements

- **CHTE-01**: Notification sound for new messages
- **CHTE-02**: Emoji reactions on messages
- **CHTE-03**: Slow mode / rate limiting per user
- **CHTE-04**: Anonymous mode toggle per station

## Out of Scope

| Feature | Reason |
|---------|--------|
| Recurring meeting templates | 4-8 meetings over 2 years; manual creation takes 2 min |
| Multiple concurrent upcoming meetings | Enormous complexity for a single bus group |
| Push notifications for new meetings | Admin communicates via Telegram |
| Calendar integration (ical/Google) | Simple enough to add manually |
| Meeting notes separate from discussions | Discussions ARE the notes; export handles this |
| User-to-user messaging | Directory exposes phone/email; Telegram for group chat |
| Station templates library | Copy-from-previous covers the reuse case |
| PDF export | Markdown designed for AI processing with Claude |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEET-01 | Phase 7 | Complete |
| MEET-02 | Phase 7 | Complete |
| MEET-03 | Phase 6 | Complete |
| MEET-04 | Phase 7 | Pending |
| MEET-05 | Phase 6 | Complete |
| SCOPE-01 | Phase 7 | Pending |
| SCOPE-02 | Phase 8 | Pending |
| SCOPE-03 | Phase 6 | Complete |
| SCOPE-04 | Phase 7 | Pending |
| SCOPE-05 | Phase 7 | Pending |
| DIR-01 | Phase 8 | Pending |
| DIR-02 | Phase 8 | Pending |
| DIR-03 | Phase 8 | Pending |
| DIR-04 | Phase 8 | Pending |
| DASH-01 | Phase 8 | Pending |
| DASH-02 | Phase 8 | Pending |
| DASH-03 | Phase 9 | Pending |
| DASH-04 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after roadmap creation*
