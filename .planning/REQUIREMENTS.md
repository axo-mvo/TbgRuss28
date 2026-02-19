# Requirements: Buss 2028 Fellesmote-appen

**Defined:** 2026-02-19
**Core Value:** Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can register with a shared invite code, providing name, email, and password
- [ ] **AUTH-02**: Invite code determines user role (youth or parent)
- [ ] **AUTH-03**: Parent can select their child(ren) from registered youth during registration
- [ ] **AUTH-04**: User can log in with email/password
- [ ] **AUTH-05**: User is routed to admin dashboard or participant dashboard based on role

### Admin

- [ ] **ADMN-01**: Admin can view all registered users with name, email, role, and registration date
- [ ] **ADMN-02**: Admin can see which youth each parent is linked to
- [ ] **ADMN-03**: Admin can change a user's role or delete a user
- [ ] **ADMN-04**: Admin can create discussion groups and assign members
- [ ] **ADMN-05**: Parents are auto-assigned to same group as their child (admin can override)
- [ ] **ADMN-06**: Admin can lock groups so participants see their assignment

### Station Chat

- [ ] **CHAT-01**: Participant sees 6 station cards with per-group status (available/active/completed)
- [ ] **CHAT-02**: Participant can open an available station to enter real-time group chat
- [ ] **CHAT-03**: Messages appear instantly for all group members via Supabase Broadcast
- [ ] **CHAT-04**: Each message shows sender name, role badge (youth/parent), timestamp, and content
- [ ] **CHAT-05**: Own messages are visually differentiated from others
- [ ] **CHAT-06**: Chat auto-scrolls to newest message unless user has scrolled up
- [ ] **CHAT-07**: Only one station can be active per group at a time

### Timer

- [ ] **TIMR-01**: 15-minute countdown starts when first group member opens a station
- [ ] **TIMR-02**: All group members see the same synchronized countdown (server-timestamp based)
- [ ] **TIMR-03**: Timer changes color: white >5min, yellow 1-5min, red <1min
- [ ] **TIMR-04**: At 0:00 timer shows "Tiden er ute!" — chat remains open (soft deadline)

### Station Flow

- [ ] **FLOW-01**: Any group member can end the station via confirmation dialog
- [ ] **FLOW-02**: Ending a station redirects all group members to station selector
- [ ] **FLOW-03**: Completed stations are viewable in read-only mode
- [ ] **FLOW-04**: Connection status indicator shows reconnecting/offline state

### Export

- [ ] **EXPT-01**: Admin can export all conversations as a Markdown file
- [ ] **EXPT-02**: Export is grouped by station, then by group, with timestamps and author info

### Design

- [ ] **DSGN-01**: Mobile-first responsive layout (primary device is phone)
- [ ] **DSGN-02**: Norwegian (bokmal) UI text throughout
- [ ] **DSGN-03**: Color palette: dark teal primary (#1B4D5C), coral accent (#E8734A), warm white bg (#FBF8F4)

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
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| ADMN-01 | — | Pending |
| ADMN-02 | — | Pending |
| ADMN-03 | — | Pending |
| ADMN-04 | — | Pending |
| ADMN-05 | — | Pending |
| ADMN-06 | — | Pending |
| CHAT-01 | — | Pending |
| CHAT-02 | — | Pending |
| CHAT-03 | — | Pending |
| CHAT-04 | — | Pending |
| CHAT-05 | — | Pending |
| CHAT-06 | — | Pending |
| CHAT-07 | — | Pending |
| TIMR-01 | — | Pending |
| TIMR-02 | — | Pending |
| TIMR-03 | — | Pending |
| TIMR-04 | — | Pending |
| FLOW-01 | — | Pending |
| FLOW-02 | — | Pending |
| FLOW-03 | — | Pending |
| FLOW-04 | — | Pending |
| EXPT-01 | — | Pending |
| EXPT-02 | — | Pending |
| DSGN-01 | — | Pending |
| DSGN-02 | — | Pending |
| DSGN-03 | — | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31 ⚠️

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after initial definition*
