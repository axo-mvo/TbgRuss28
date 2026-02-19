# Requirements: Buss 2028 Fellesmote-appen

**Defined:** 2026-02-19
**Core Value:** Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can register with a shared invite code, providing name, email, and password
- [x] **AUTH-02**: Invite code determines user role (youth or parent)
- [x] **AUTH-03**: Parent can select their child(ren) from registered youth during registration
- [x] **AUTH-04**: User can log in with email/password
- [x] **AUTH-05**: User is routed to admin dashboard or participant dashboard based on role

### Admin

- [x] **ADMN-01**: Admin can view all registered users with name, email, role, and registration date
- [x] **ADMN-02**: Admin can see which youth each parent is linked to
- [x] **ADMN-03**: Admin can change a user's role or delete a user
- [x] **ADMN-04**: Admin can create discussion groups and assign members
- [x] **ADMN-05**: Parents are auto-assigned to same group as their child (admin can override)
- [x] **ADMN-06**: Admin can lock groups so participants see their assignment

### Station Chat

- [x] **CHAT-01**: Participant sees 6 station cards with per-group status (available/active/completed)
- [x] **CHAT-02**: Participant can open an available station to enter real-time group chat
- [x] **CHAT-03**: Messages appear instantly for all group members via Supabase Broadcast
- [x] **CHAT-04**: Each message shows sender name, role badge (youth/parent), timestamp, and content
- [x] **CHAT-05**: Own messages are visually differentiated from others
- [x] **CHAT-06**: Chat auto-scrolls to newest message unless user has scrolled up
- [x] **CHAT-07**: Only one station can be active per group at a time

### Timer

- [x] **TIMR-01**: 15-minute countdown starts when first group member opens a station
- [x] **TIMR-02**: All group members see the same synchronized countdown (server-timestamp based)
- [x] **TIMR-03**: Timer changes color: white >5min, yellow 1-5min, red <1min
- [x] **TIMR-04**: At 0:00 timer shows "Tiden er ute!" — chat remains open (soft deadline)

### Station Flow

- [ ] **FLOW-01**: Any group member can end the station via confirmation dialog
- [ ] **FLOW-02**: Ending a station redirects all group members to station selector
- [ ] **FLOW-03**: Completed stations are viewable in read-only mode
- [ ] **FLOW-04**: Connection status indicator shows reconnecting/offline state

### Export

- [ ] **EXPT-01**: Admin can export all conversations as a Markdown file
- [ ] **EXPT-02**: Export is grouped by station, then by group, with timestamps and author info

### Design

- [x] **DSGN-01**: Mobile-first responsive layout (primary device is phone)
- [x] **DSGN-02**: Norwegian (bokmal) UI text throughout
- [x] **DSGN-03**: Color palette: dark teal primary (#1B4D5C), coral accent (#E8734A), warm white bg (#FBF8F4)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Station Content

- **SCNT-01**: Collapsible question panel with 4 discussion questions per station
- **SCNT-02**: Tips box displayed below questions per station

### Admin Enhancements

- **ADME-01**: Invite code management UI (create, activate/deactivate, usage tracking)
- **ADME-02**: Meeting start/stop control (state machine: not_started/active/ended)
- **ADME-03**: Live admin dashboard (messages per station, active users per group)

### Chat Enhancements

- **CHTE-01**: Notification sound for new messages
- **CHTE-02**: Emoji reactions on messages
- **CHTE-03**: Slow mode / rate limiting per user
- **CHTE-04**: Pinned messages (admin only)
- **CHTE-05**: Anonymous mode toggle per station

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email verification | Invite code is sufficient barrier for closed group |
| OAuth/social login | Email/password via Supabase Auth sufficient |
| Push notifications | All participants in same room |
| Image/file uploads | Text-only discussion notes, moderation risk |
| Message editing/deletion | Preserve full discussion history |
| Video/audio calling | Everyone is in the same room |
| Direct messages | Youth safety concern, not needed in-person |
| Threaded conversations | Over-engineered for 15-min discussion windows |
| Offline mode | Mobile coverage assumed, auto-reconnect sufficient |
| Multi-language / i18n | Single-event Norwegian audience |
| User profiles/avatars | Single-use app, display name + role sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| ADMN-01 | Phase 2 | Complete |
| ADMN-02 | Phase 2 | Complete |
| ADMN-03 | Phase 2 | Complete |
| ADMN-04 | Phase 2 | Complete |
| ADMN-05 | Phase 2 | Complete |
| ADMN-06 | Phase 2 | Complete |
| CHAT-01 | Phase 3 | Complete |
| CHAT-02 | Phase 3 | Complete |
| CHAT-03 | Phase 3 | Complete |
| CHAT-04 | Phase 3 | Complete |
| CHAT-05 | Phase 3 | Complete |
| CHAT-06 | Phase 3 | Complete |
| CHAT-07 | Phase 3 | Complete |
| TIMR-01 | Phase 3 | Complete |
| TIMR-02 | Phase 3 | Complete |
| TIMR-03 | Phase 3 | Complete |
| TIMR-04 | Phase 3 | Complete |
| FLOW-01 | Phase 4 | Pending |
| FLOW-02 | Phase 4 | Pending |
| FLOW-03 | Phase 4 | Pending |
| FLOW-04 | Phase 4 | Pending |
| EXPT-01 | Phase 5 | Pending |
| EXPT-02 | Phase 5 | Pending |
| DSGN-01 | Phase 1 | Complete |
| DSGN-02 | Phase 1 | Complete |
| DSGN-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation*
