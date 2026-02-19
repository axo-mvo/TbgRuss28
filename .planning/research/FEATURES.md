# Feature Research

**Domain:** Real-time structured group discussion webapp for in-person meetings
**Researched:** 2026-02-19
**Confidence:** HIGH

## Context

This app ("Buss 2028 Fellesmote-appen") facilitates a single in-person meeting event where ~25 youth + parents (~80 users total) rotate between 6 discussion stations with real-time chat and countdown timers. It follows a "World Cafe" facilitation pattern: small groups rotate between themed stations, each with a fixed set of discussion questions and a time limit.

Key constraints that shape feature decisions:
- **Single-event, single-use** -- not a SaaS platform, not recurring
- **~80 users** -- no need for scale-oriented features
- **In-person** -- all users are physically co-located
- **Mixed demographics** -- youth (16-18) and their parents (40-60)
- **Norwegian UI** -- all text in Norwegian (Bokmal)
- **Mobile-first** -- most users will be on phones during the event

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken during the live event.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Invite-code registration** | Users need a frictionless way to join without creating accounts. Typing a short code on mobile is the standard pattern (Slido, Mentimeter, Kahoot all use this). | LOW | Single invite code per role (youth vs parent). No email/password. Store display name + role. |
| **Role assignment (youth/parent/admin)** | Different users need different permissions. Parents should not have admin controls. Admins need full control. | LOW | Three roles: admin (full control), youth (chat + view), parent (chat + view). Code determines role at join. |
| **Real-time chat per station per group** | The core interaction. Each group at each station needs its own chat channel. Without real-time delivery, users will just talk out loud and the app becomes pointless. | HIGH | This is the hardest table-stakes feature. Requires WebSocket infrastructure, channel routing (group x station matrix), and message persistence. |
| **Visible countdown timer** | Users must know how much time remains at their current station. Every facilitation tool (Stagetimer, GroupMap, Slido) includes timers as core. Without it, the facilitator has to shout "2 minutes left!" | LOW | Single global timer controlled by admin. All clients display the same countdown. Timer state synced via the same real-time channel. |
| **Discussion questions panel** | Each station has specific discussion prompts. Users need to see them without asking the facilitator. Collapsible so it does not eat screen space during active chat. | LOW | Static content per station. Collapsible/expandable panel. Pre-loaded by admin. |
| **Station/group awareness** | Users must know which station they are at and which group they belong to. Without this, the rotating format creates confusion. | LOW | Display current station name + group name prominently. Update when admin advances rotation. |
| **Admin: start/stop/advance meeting** | The facilitator must control meeting flow: start timer, advance all groups to next station, pause if needed, end meeting. This is the orchestration backbone. | MEDIUM | State machine: lobby -> station 1 -> station 2 -> ... -> station 6 -> completed. Admin triggers transitions. All clients react in real-time. |
| **Admin: user management** | Admin needs to see who joined, assign them to groups, and handle latecomers. | MEDIUM | View all registered users, assign to groups (drag-drop or dropdown), see online/offline status. |
| **Admin: group management** | Admin must create groups and assign users before the meeting starts. Groups define the rotation schedule. | MEDIUM | CRUD for groups. Assign users to groups. Each group gets a rotation order through the 6 stations. |
| **Mobile-responsive layout** | 90%+ of users will be on phones. If the chat is unusable on a 375px screen, the app fails. | MEDIUM | Chat input anchored to bottom. Messages scroll up. Timer visible without scrolling. Touch-friendly tap targets (min 44x44px per WCAG). |
| **Auto-scroll chat** | New messages must scroll into view automatically unless the user has scrolled up to read history. Standard chat UX pattern -- breaking this frustrates users. | LOW | Scroll to bottom on new message unless user has scrolled up. Show "new messages" indicator when not at bottom. |
| **Message persistence** | Chat messages must survive page refreshes. If a user accidentally closes their browser, they should see previous messages when they rejoin. | LOW | Store all messages server-side. Load history on reconnect. This also enables the export feature. |
| **Connection resilience** | Mobile connections drop. The app must reconnect automatically and show connection status. Users should not lose context when their phone briefly loses signal. | MEDIUM | Auto-reconnect with exponential backoff. Visual indicator for connection state (connected/reconnecting/offline). Queue outgoing messages during disconnection. |

### Differentiators (Competitive Advantage)

Features that make this app feel polished and purpose-built rather than a generic chat bolted onto a timer. Not required for launch, but high-value for the event experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Admin: export chat logs** | After the meeting, organizers want to review what was discussed. Export all chat messages per station per group as CSV or PDF. This is the lasting output of the entire event. | LOW | Query messages by station+group, format as CSV/PDF. Run after meeting ends. Does not need to be real-time. |
| **Visual rotation indicator** | Show a map or progress bar of which stations the group has visited and which remain. Gives participants a sense of progress and anticipation. | LOW | Simple progress dots or numbered list. Highlight current station. Grey out completed ones. |
| **Slow mode / rate limiting** | Prevent chat spam from excited teenagers. Limit to 1 message per N seconds per user. Keeps discussions focused and readable. Used by Twitch, Discord, and livestream chat platforms. | LOW | Server-side throttle per user per channel. Return error if sending too fast. Configure interval in admin. |
| **Timer warnings** | Audio/visual alert at 5 min, 2 min, and 30 sec remaining. Users get absorbed in chat and lose time awareness. Stagetimer and CueTimer both use color-coded warnings. | LOW | Change timer color (green -> yellow -> red). Optional vibration/sound on mobile. Thresholds configurable by admin. |
| **Pinned messages** | Admin or facilitator can pin an important message to the top of a chat channel. Useful for mid-discussion clarifications or reminders. | LOW | Pin/unpin action on messages (admin only). Pinned message displayed above chat scroll area. |
| **Anonymous mode toggle** | Allow participants to post anonymously within a station's chat. Youth may be more honest about sensitive topics (like bus trip concerns) if their name is not attached. Slido's anonymous Q&A is their most-used feature. | MEDIUM | Toggle per station (admin configures). Messages show "Anonym" instead of display name. Server still tracks sender for moderation. |
| **Admin: live dashboard** | Real-time overview showing: messages per station, active users per group, timer status, connection health. Gives the facilitator situational awareness during a fast-moving event. | MEDIUM | Aggregate stats from real-time data. Display on admin screen (likely a laptop/tablet at the front of the room). |
| **Emoji reactions on messages** | Quick non-verbal agreement/disagreement without cluttering the chat with "+1" messages. Lightweight engagement that youth demographics expect from modern chat. | LOW | Predefined emoji set (thumbs up, heart, checkmark, question mark). Increment counter on message. |
| **Notification sound for new messages** | Audio cue when a new message arrives while the phone screen is off or the user is looking away. Keeps engagement high during the discussion. | LOW | Short notification sound on new message. Respect device mute settings. User can toggle on/off. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **User accounts with email/password** | "We need proper authentication" | Massive friction for a single-event app. Parents will not remember passwords. Youth will abandon onboarding. The event has a fixed 2-hour window -- every second of onboarding friction is lost discussion time. | Invite code + display name. No passwords. Session persists via cookie/token. Admin can kick bad actors manually. |
| **Video/audio calling** | "People could video chat between stations" | Everyone is in the same room. Adding WebRTC is enormous complexity for zero value. Network bandwidth for 80 simultaneous video streams on event WiFi would collapse. | They are literally standing next to each other. Chat is for structured written input that can be exported later. |
| **Direct messages between users** | "Users should be able to DM each other" | Enables bullying, off-topic side-conversations, and moderation nightmares. Youth safety concern. Parents would object. | All communication happens in station channels where it is visible to admins. If someone needs to talk privately, they are in the same room. |
| **Message editing/deletion by users** | "Users should fix typos" | Creates moderation problems. Users could post something inappropriate, others see it, then delete it. With 80 users and fast-moving chat, this is a harassment vector. | Messages are permanent. Admin can delete inappropriate messages. Users learn to type carefully. |
| **File/image upload** | "Users should share photos" | Moderation nightmare with youth. Inappropriate image risk. Storage/bandwidth cost. Slows down the focused text discussion. Not needed for structured Q&A-style discussion. | Text-only chat. If organizers want to share images, they can be included in the station question panel as pre-approved content. |
| **Threaded conversations** | "Replies should thread like Slack" | Over-engineered for short 15-minute discussion windows. Threads fragment the conversation and confuse less-technical parents. The discussion is meant to be a flowing conversation. | Flat chat with @mentions if someone wants to reference another user. Simple, familiar, works for all ages. |
| **Push notifications** | "Users should get notified on their phone" | Requires service worker registration, notification permissions (users often deny), and platform-specific handling. The app is open and active during the entire event. No one is "away" -- they are all in the room. | In-app notification sounds and visual indicators are sufficient. The timer itself creates urgency. |
| **Multi-language support / i18n framework** | "We should internationalize for future use" | This is a single-event app for a Norwegian audience. Adding i18n infrastructure is wasted complexity. All 80 users speak Norwegian. | Hardcode Norwegian (Bokmal) strings directly. If reused later, extract strings then. YAGNI. |
| **Offline mode with sync** | "What if WiFi drops?" | Full offline-first architecture (IndexedDB, conflict resolution, sync queues) is enormous complexity for an edge case. The event venue should have working WiFi. | Auto-reconnect with message queuing for brief disconnections. If WiFi is truly down for extended periods, the facilitator pauses the meeting. Verify WiFi before the event. |
| **Persistent user profiles** | "Users should have avatars and bios" | Single-use app. No one will customize a profile for a 2-hour event. Development time better spent on core chat experience. | Display name + role badge (youth/parent). That is all the identity needed. |

---

## Feature Dependencies

```
[Invite-code registration]
    |
    +--requires--> [Role assignment]
    |                  |
    |                  +--enables--> [Admin: user management]
    |                                    |
    |                                    +--enables--> [Admin: group management]
    |                                                      |
    +------------------------------------------------------+
    |
    v
[Station/group awareness]
    |
    +--requires--> [Admin: group management]
    |
    +--enables--> [Real-time chat per station per group]
    |                 |
    |                 +--enables--> [Auto-scroll chat]
    |                 +--enables--> [Message persistence]
    |                 +--enables--> [Pinned messages]
    |                 +--enables--> [Emoji reactions]
    |                 +--enables--> [Anonymous mode toggle]
    |                 +--enables--> [Slow mode / rate limiting]
    |                 +--enables--> [Admin: export chat logs]
    |
    +--enables--> [Visual rotation indicator]

[Visible countdown timer]
    |
    +--enables--> [Timer warnings]
    +--requires--> [Admin: start/stop/advance meeting]

[Connection resilience]
    +--enhances--> [Real-time chat per station per group]
    +--enhances--> [Visible countdown timer]

[Admin: start/stop/advance meeting]
    +--requires--> [Admin: group management]
    +--requires--> [Visible countdown timer]
    +--enables--> [Station/group awareness] (triggers rotation)

[Admin: live dashboard]
    +--requires--> [Real-time chat per station per group]
    +--requires--> [Admin: start/stop/advance meeting]
```

### Dependency Notes

- **Registration must come first:** Everything depends on knowing who the user is and what role they have. This is the foundation.
- **Group management gates the meeting:** You cannot start rotating between stations until groups exist and users are assigned.
- **Real-time chat is the critical path:** It is the highest-complexity table-stakes feature and the one most other features depend on. Get this working and stable before building anything on top.
- **Timer and meeting control are tightly coupled:** The timer is meaningless without admin control to start/stop it. The meeting state machine drives the timer.
- **Export depends on persistence:** You can only export what you have stored. Message persistence must be solid before export makes sense.

---

## MVP Definition

### Launch With (v1) -- Before the event

The absolute minimum to run the meeting successfully.

- [x] **Invite-code registration with roles** -- Users must be able to join
- [x] **Admin: group management** -- Groups must be created and users assigned
- [x] **Admin: start/stop/advance meeting** -- Facilitator must control the flow
- [x] **Visible countdown timer** -- Users must know time remaining
- [x] **Discussion questions panel** -- Users must see what to discuss
- [x] **Station/group awareness** -- Users must know where they are
- [x] **Real-time chat per station per group** -- The core interaction
- [x] **Auto-scroll chat** -- Basic chat UX
- [x] **Message persistence** -- Messages survive refresh
- [x] **Connection resilience** -- Auto-reconnect on mobile
- [x] **Mobile-responsive layout** -- Usable on phones

### Add After Core Works (v1.x) -- Polish before event day

Features to add once the core is stable, before the actual event.

- [ ] **Timer warnings (color changes)** -- Low effort, high impact for time awareness
- [ ] **Admin: export chat logs** -- Needed after the event, not during
- [ ] **Visual rotation indicator** -- Nice orientation aid
- [ ] **Slow mode / rate limiting** -- Insurance against spam
- [ ] **Notification sound** -- Keeps attention during discussion
- [ ] **Admin: user management view** -- See who is online, handle latecomers

### Future Consideration (v2+) -- Only if time permits

Features to add only if development time remains and testing reveals a need.

- [ ] **Pinned messages** -- Useful but not critical for 15-min windows
- [ ] **Anonymous mode** -- Valuable for sensitive topics but adds moderation complexity
- [ ] **Emoji reactions** -- Fun but not essential
- [ ] **Admin: live dashboard** -- Nice for facilitator situational awareness

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Invite-code registration | HIGH | LOW | P1 |
| Role assignment | HIGH | LOW | P1 |
| Real-time chat per station/group | HIGH | HIGH | P1 |
| Visible countdown timer | HIGH | LOW | P1 |
| Discussion questions panel | HIGH | LOW | P1 |
| Station/group awareness | HIGH | LOW | P1 |
| Admin: start/stop/advance | HIGH | MEDIUM | P1 |
| Admin: group management | HIGH | MEDIUM | P1 |
| Mobile-responsive layout | HIGH | MEDIUM | P1 |
| Auto-scroll chat | MEDIUM | LOW | P1 |
| Message persistence | MEDIUM | LOW | P1 |
| Connection resilience | MEDIUM | MEDIUM | P1 |
| Admin: user management | MEDIUM | LOW | P1 |
| Timer warnings | MEDIUM | LOW | P2 |
| Admin: export chat logs | MEDIUM | LOW | P2 |
| Visual rotation indicator | LOW | LOW | P2 |
| Slow mode / rate limiting | MEDIUM | LOW | P2 |
| Notification sound | LOW | LOW | P2 |
| Pinned messages | LOW | LOW | P3 |
| Anonymous mode | MEDIUM | MEDIUM | P3 |
| Emoji reactions | LOW | LOW | P3 |
| Admin: live dashboard | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- the event cannot run without these
- P2: Should have -- adds polish and resilience, build before event day
- P3: Nice to have -- only if time permits after P1 and P2 are solid

---

## Competitor Feature Analysis

| Feature | Slido | Mentimeter | GroupMap | Stagetimer | Our Approach |
|---------|-------|------------|---------|------------|--------------|
| Join via code | Yes (event code) | Yes (voting code) | Yes (access code) | Yes (room link) | Yes -- invite code per role |
| Real-time chat | Q&A only (not free chat) | No (responses only) | Brainstorm mode | No | Full chat per station per group |
| Countdown timer | No | No (presenter controls) | Yes (activity timer) | Yes (core feature) | Yes -- global synced timer |
| Discussion prompts | No | Slide-based questions | Template-based | Agenda display | Collapsible question panel per station |
| Group rotation | No | No | Manual | No | Automated -- admin advances all groups |
| Data export | Yes (CSV) | Yes (Excel/PDF) | Yes (CSV/PDF) | No | Yes -- CSV export of all chat logs |
| Role-based access | Limited (host/participant) | Limited (presenter/audience) | Yes (facilitator/participant) | Yes (controller/viewer) | Yes -- admin/youth/parent |
| Anonymous input | Yes | Yes (default) | Yes | N/A | Optional per station (P3) |
| Mobile-first | Responsive | Responsive | Responsive | Responsive | Mobile-first (primary target) |

**Key insight from competitor analysis:** No existing tool combines station-based group rotation with real-time free-form chat and countdown timers in a single integrated experience. Slido is closest for audience interaction but lacks chat. Stagetimer handles timers but not discussion. GroupMap handles facilitated brainstorming but not real-time chat. This app fills a specific gap for in-person World Cafe-style structured discussions.

---

## Sources

- [Slido features](https://www.slido.com/product) -- Audience interaction platform feature set
- [Mentimeter](https://www.mentimeter.com/) -- Interactive presentation tool comparison
- [Stagetimer](https://stagetimer.io/) -- Remote-controlled countdown timer for events
- [GroupMap facilitation tools](https://www.groupmap.com/online-workshop-facilitation-tools/) -- Online workshop facilitation features
- [Howspace](https://howspace.com/) -- Digital facilitation platform
- [GetStream chat UX best practices](https://getstream.io/blog/chat-ux/) -- Chat UX patterns and moderation
- [GetStream livestream chat UX](https://getstream.io/blog/7-ux-best-practices-for-livestream-chat/) -- Livestream chat patterns
- [GetStream content moderation](https://getstream.io/blog/live-content-moderation/) -- Real-time chat moderation approaches
- [World Cafe method](https://www.facilitator.school/glossary/world-cafe) -- World Cafe facilitation pattern
- [WCAG mobile guidance](https://www.w3.org/TR/wcag2mobile-22/) -- Accessibility standards for mobile apps
- [Norway youth participation](https://national-policies.eacea.ec.europa.eu/youthwiki/chapters/norway/54-young-peoples-participation-in-policy-making) -- Norwegian youth council framework

---
*Feature research for: Buss 2028 Fellesmote-appen (real-time structured group discussion)*
*Researched: 2026-02-19*
