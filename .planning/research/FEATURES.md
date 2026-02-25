# Feature Research

**Domain:** Multi-meeting platform evolution for in-person structured group discussions
**Researched:** 2026-02-25
**Confidence:** HIGH

## Context

This is a v1.1 feature research for the Buss 2028 Fellesmote app. v1.0 is fully built and working: invite-code registration, real-time station chat, countdown timers, groups, export, word cloud, attendance tracking. All features currently assume a single meeting.

v1.1 evolves the app from a single-meeting tool into a **meeting-series platform** where:
- Admin creates meetings over time (one upcoming at a time)
- Each meeting has its own stations, groups, attendance, discussions, export, and word cloud
- Between meetings, the app serves as a **contact directory** for all members
- Previous meetings and their discussions are browsable in **read-only mode**

**Scale remains small:** ~25 youth + ~30-50 parents + 1-3 admins. The complexity is in the data model restructuring and navigation, not in scale.

**Key constraint:** All existing v1.0 features (chat, timer, station lifecycle, group builder, export, word cloud) already work. The challenge is re-scoping them to operate within a meeting container without breaking existing functionality. Existing v1.0 data must migrate into the new structure as the first "previous meeting."

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are non-negotiable for v1.1 to function. Without these, the multi-meeting concept does not work.

| Feature | Why Expected | Complexity | Depends On (v1.0) | Notes |
|---------|--------------|------------|-------------------|-------|
| **Meeting entity (CRUD)** | Admin needs to create meetings with date, time, place. Without a meeting entity, everything remains single-meeting. This is the foundational data model change. | MEDIUM | None (new table) | New `meetings` table with: title (optional, auto-generated from date), date, time, venue, status (draft/upcoming/active/completed). Only one meeting can be `upcoming` at a time. Admin form: date picker, time picker, venue text field. |
| **Admin-configurable stations per meeting** | v1.0 has hardcoded stations. Admin must be able to set discussion topics per meeting because each meeting covers different themes. | MEDIUM | Existing `stations` table (must add `meeting_id` FK) | Station form: title, questions (array of strings), optional tip. Admin creates 3-6 stations per meeting. Stations belong to a meeting. Support reordering (drag or up/down arrows). |
| **Per-meeting groups** | Groups are formed fresh each meeting -- different people attend each time, discussion benefits from new group compositions. | LOW | Existing `groups` + `group_members` tables (must add `meeting_id` FK) | Add `meeting_id` to `groups`. Group builder already works (drag-and-drop). Just scope it to the upcoming meeting. |
| **Per-meeting attendance** | "Kommer du?" must ask about a specific meeting, not a global property. Each meeting has its own attendance tally. | LOW | Existing `attending` column on `profiles` (must move to a junction table) | New `meeting_attendance` table: `meeting_id`, `user_id`, `attending` (nullable boolean). Replace the current `profiles.attending` column. AttendingToggle component needs meeting context. |
| **Per-meeting scoped station sessions and messages** | When a meeting is active, all chat/timer/session data belongs to that meeting. This is implicit through the chain: meeting -> stations -> sessions -> messages. | LOW | Existing `station_sessions` + `messages` tables | No new tables needed. The FK chain `meetings -> stations -> station_sessions -> messages` scopes everything naturally. Sessions already reference `station_id` and `group_id`, both of which will be meeting-scoped. |
| **Per-meeting export** | Export downloads discussions from a specific meeting, not all messages ever. The existing export already structures by station + group -- just add meeting filtering. | LOW | Existing `/api/export` route | Add `meetingId` query parameter. Filter messages through the station -> meeting chain. Add meeting title/date to export header. |
| **Per-meeting word cloud** | Word cloud shows word frequencies from a specific meeting's discussions, not all meetings combined. | LOW | Existing `WordCloud` component | Pass meeting-scoped messages to the existing component. Move word cloud from `/admin/wordcloud` to within each meeting's detail view. |
| **Searchable contact directory** | Between meetings, the app's main value is being a member directory. Users need to find each other by name to coordinate logistics (rides, payments, etc). Search is essential at 50-80 members. | MEDIUM | Existing `profiles` table + `parent_youth_links` | New primary dashboard view. Client-side search filtering on `full_name`. Two views: youth-centered (expand to see parents) and flat everyone list. Show phone + email in expanded entries. |
| **Expandable directory entries** | Youth-centered view: tap a youth name to see their linked parents with contact info. Must be tap-friendly on mobile. | LOW | Existing `RegisteredUsersOverview` component (already uses `<details>` expand pattern) | Extend existing component. Add phone/email to expanded view. The `<details>` accordion pattern already works and is accessible. Add contact action buttons (tel: and mailto: links). |
| **Meeting history browsing** | Users want to revisit what was discussed at previous meetings. Read-only access to past discussions gives the meeting series lasting value beyond the live event. | MEDIUM | Existing station chat UI (must support read-only mode) | List of past meetings sorted by date (newest first). Each meeting expands to show its stations. Each station shows read-only discussion threads by group. Reuse existing `MessageList` component with chat input hidden. |
| **Dashboard state awareness** | The dashboard must reflect the current state: Is there an upcoming meeting? Is a meeting active right now? Are there only past meetings? Each state shows different content. | MEDIUM | Existing dashboard page | Three dashboard states: (1) Upcoming meeting: show meeting card with attendance toggle + directory below. (2) Active meeting: show station selector + group info (current v1.0 behavior). (3) No upcoming meeting: show directory + past meetings list. |
| **Meeting lifecycle management** | Admin controls meeting progression: draft -> upcoming -> active -> completed. Only one upcoming meeting at a time. Completing a meeting archives it to history. | MEDIUM | Existing `meeting_status` table (must evolve to per-meeting) | Replace singleton `meeting_status` with `status` column on `meetings` table. Admin actions: publish draft -> upcoming, start meeting -> active, end meeting -> completed. Status transitions are irreversible (cannot un-complete a meeting). |

### Differentiators (Competitive Advantage)

Features that make the multi-meeting experience feel polished. Not required for launch, but valuable.

| Feature | Value Proposition | Complexity | Depends On (v1.0) | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Attendance summary on meeting card** | Before a meeting, admin and users see at a glance: "18 kommer, 5 kan ikke, 12 har ikke svart." Reduces uncertainty about turnout. | LOW | Per-meeting attendance (table stakes) | Aggregate query on `meeting_attendance`. Display as compact stat pills (existing pattern from `RegisteredUsersOverview`). |
| **Contact action buttons** | Tap phone number to call, tap email to send. Eliminates the copy-paste friction of a static directory. | LOW | Searchable contact directory | Use `tel:` and `mailto:` href links. Style as tappable buttons with icons. Obvious on mobile, still works on desktop. |
| **Station copy from previous meeting** | When creating a new meeting, admin can optionally copy stations from a previous meeting as a starting point, then edit. Saves time for recurring discussion themes. | LOW | Admin-configurable stations | "Kopier fra forrige mote" button on station creation. Deep-copies station titles, questions, and tips into the new meeting. Admin can then edit/delete/add. |
| **Meeting summary card in history** | Each past meeting shows a compact summary: date, venue, number of stations, number of messages, attendance count. Gives a quick overview without opening. | LOW | Meeting history browsing | Aggregate stats computed on meeting completion and cached on the meeting row, or computed live (cheap at this scale). |
| **Flat "everyone" directory view** | In addition to youth-centered view, show all members alphabetically regardless of role. Useful when a parent wants to find another parent directly without knowing which youth they are linked to. | LOW | Searchable contact directory | Toggle between "Ungdom + foreldre" and "Alle" views. Same search, different grouping. |
| **Admin meeting detail view** | Consolidated admin view per meeting showing: stations config, groups, attendance list, word cloud, export button. One-stop management. | MEDIUM | All per-meeting admin features | New `/admin/meetings/[id]` page with tabs or sections for each concern. Replaces the current flat admin panel structure. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly NOT build for v1.1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Recurring meeting templates** | "Admin should schedule recurring meetings automatically" | This is a 4-8 meeting series over 2 years. Manual creation takes 2 minutes per meeting. Template/recurrence logic adds scheduling complexity (conflicts, exceptions, timezone edge cases) for negligible time savings. | Admin creates each meeting manually. Station copy from previous meeting handles the most tedious part. |
| **Multiple concurrent upcoming meetings** | "What if we need two meetings in the same week?" | Adds enormous complexity to attendance, group assignment, and the dashboard state machine. Users would need to pick which meeting they are RSVPing to. The app is for one bus group with one meeting at a time. | One upcoming meeting at a time. Create the next one after the current one completes. |
| **Push notifications for new meetings** | "Notify users when admin creates a meeting" | Requires service worker, notification permission prompts (users decline), and platform-specific handling. Admin already communicates via Telegram/SMS. The app is a supplement, not the primary communication channel. | Admin shares meeting link via existing Telegram group. Users see the meeting when they open the app. |
| **Calendar integration (ical/Google Calendar)** | "Users should add meetings to their calendar" | Small scope (4-8 meetings over 2 years). Implementation requires generating ICS files or OAuth for Google Calendar API. Meeting details are simple enough to add manually. | Show date/time/venue clearly on the meeting card. Users screenshot or add manually. |
| **Meeting notes or minutes (separate from discussions)** | "Admin should be able to write meeting notes" | The discussions ARE the meeting notes. Adding a separate notes editor duplicates functionality and creates confusion about where the "real" notes live. | Use the Markdown export as meeting minutes. Admin can add context in the export prompt or edit the exported file. |
| **User-to-user messaging** | "Parents should message each other through the app" | Contact directory already exposes phone and email. Adding in-app messaging creates a parallel communication channel that competes with the Telegram group. Moderation burden. Youth safety concerns. | Contact directory with tap-to-call and tap-to-email. Telegram group for group chat. |
| **Station templates library** | "Build a library of reusable discussion templates" | With 4-8 meetings over 2 years, a template library is over-engineering. "Copy from previous meeting" covers the reuse case with zero additional UI complexity. | Station copy from previous meeting. |
| **PDF export** | "Some people prefer PDF over Markdown" | The Markdown export is specifically designed for downstream processing with Claude (AI-generated PowerPoint). PDF would need a rendering library (puppeteer/react-pdf), adds deployment complexity, and the output is less useful for AI processing. | Markdown export. Users can paste into any Markdown viewer for formatted reading. |
| **Attendance reminders** | "Send reminders to people who haven't responded" | Requires notification infrastructure (email, SMS, or push). Admin already pings people via Telegram. The app is not the primary communication channel. | Admin checks "Har ikke svart" count and follows up via Telegram. |

---

## Feature Dependencies

```
[Meeting entity CRUD] (new foundation)
    |
    +--enables--> [Admin-configurable stations per meeting]
    |                 |
    |                 +--enables--> [Per-meeting station sessions + messages]
    |                 |                 |
    |                 |                 +--enables--> [Per-meeting export]
    |                 |                 +--enables--> [Per-meeting word cloud]
    |                 |
    |                 +--enables--> [Station copy from previous meeting]
    |
    +--enables--> [Per-meeting groups]
    |                 |
    |                 +--combined with stations--> [Per-meeting station sessions + messages]
    |
    +--enables--> [Per-meeting attendance]
    |                 |
    |                 +--enables--> [Attendance summary on meeting card]
    |
    +--enables--> [Meeting lifecycle management]
    |                 |
    |                 +--enables--> [Dashboard state awareness]
    |                 +--enables--> [Meeting history browsing]
    |                                   |
    |                                   +--enables--> [Meeting summary card in history]
    |
    +--enables--> [Admin meeting detail view]

[Searchable contact directory] (independent of meetings)
    |
    +--enables--> [Expandable directory entries]
    |                 |
    |                 +--enables--> [Contact action buttons]
    |
    +--enables--> [Flat "everyone" directory view]

[Dashboard state awareness]
    +--requires--> [Meeting lifecycle management]
    +--requires--> [Searchable contact directory]
    +--requires--> [Meeting history browsing]
```

### Dependency Notes

- **Meeting entity is the foundation:** Every per-meeting feature depends on the `meetings` table existing first. This must be built in the first phase.
- **Contact directory is independent:** It does not depend on meetings at all. It reads from `profiles` + `parent_youth_links` + contact fields. Can be built in parallel with meeting CRUD.
- **Stations must exist before sessions:** The FK chain `meeting -> stations -> sessions -> messages` means stations must be configurable before the real-time chat features can be scoped to a meeting.
- **Dashboard state awareness is the integration point:** It ties together meetings, directory, and history into a coherent user experience. Build this after the individual pieces work.
- **Export and word cloud are low-hanging fruit:** They already work. Scoping them to a meeting is a query filter change + moving them into the meeting detail view.
- **Migration of v1.0 data must happen alongside the meeting entity creation:** The existing stations, groups, sessions, and messages need to be wrapped in a "Meeting 1" container during the schema migration.

---

## MVP Definition

### Phase 1: Schema + Meeting CRUD + Directory

The foundational changes that enable everything else.

- [ ] **Meeting entity with CRUD** -- Without this, nothing else can be meeting-scoped
- [ ] **Schema migration** -- Add `meeting_id` FKs, create `meeting_attendance` table, migrate v1.0 data into Meeting 1
- [ ] **Admin meeting creation form** -- Date, time, venue, status management
- [ ] **Searchable contact directory** -- Independent of meetings, becomes the permanent dashboard anchor
- [ ] **Expandable entries with contact info** -- Phone + email visible on expand, with action buttons
- [ ] **Dashboard state awareness** -- Show correct content based on meeting state

### Phase 2: Per-Meeting Features

Scope existing features to work within a meeting container.

- [ ] **Admin-configurable stations per meeting** -- Station form with title, questions, tip
- [ ] **Per-meeting groups** -- Group builder scoped to the upcoming meeting
- [ ] **Per-meeting attendance** -- Replace `profiles.attending` with `meeting_attendance` table
- [ ] **Meeting lifecycle management** -- Admin controls: publish, start, end

### Phase 3: History + Polish

Make past meetings browsable and polish the experience.

- [ ] **Meeting history browsing** -- Read-only past discussions
- [ ] **Per-meeting export** -- Scoped Markdown download
- [ ] **Per-meeting word cloud** -- Scoped word frequencies within meeting detail
- [ ] **Admin meeting detail view** -- Consolidated admin view per meeting

### Future Consideration

- [ ] **Station copy from previous meeting** -- Only valuable after 2+ meetings exist
- [ ] **Flat "everyone" directory view** -- Nice toggle, not essential for launch
- [ ] **Meeting summary cards in history** -- Polish feature for history browsing

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Meeting entity CRUD | HIGH | MEDIUM | P1 |
| Schema migration (add meeting_id FKs) | HIGH | MEDIUM | P1 |
| Admin-configurable stations | HIGH | MEDIUM | P1 |
| Per-meeting groups | HIGH | LOW | P1 |
| Per-meeting attendance | HIGH | LOW | P1 |
| Searchable contact directory | HIGH | MEDIUM | P1 |
| Expandable entries + contact info | HIGH | LOW | P1 |
| Dashboard state awareness | HIGH | MEDIUM | P1 |
| Meeting lifecycle management | HIGH | MEDIUM | P1 |
| Meeting history browsing | MEDIUM | MEDIUM | P1 |
| Per-meeting export | MEDIUM | LOW | P1 |
| Per-meeting word cloud | MEDIUM | LOW | P1 |
| Admin meeting detail view | MEDIUM | MEDIUM | P2 |
| Attendance summary on meeting card | MEDIUM | LOW | P2 |
| Contact action buttons (tel:/mailto:) | MEDIUM | LOW | P2 |
| Station copy from previous meeting | LOW | LOW | P3 |
| Flat "everyone" directory view | LOW | LOW | P3 |
| Meeting summary cards in history | LOW | LOW | P3 |

**Priority key:**
- P1: Must have -- the multi-meeting platform does not work without these
- P2: Should have -- adds polish, build within the v1.1 milestone
- P3: Nice to have -- only if time permits

---

## Existing v1.0 Component Reuse Analysis

Understanding which existing components can be reused, extended, or must be rewritten.

| v1.0 Component | v1.1 Status | Change Required |
|----------------|-------------|-----------------|
| `RegisteredUsersOverview` | **Extend** | Add search, phone/email fields, contact action buttons. Already uses `<details>` accordion pattern. |
| `SearchInput` | **Reuse as-is** | Already built as a generic search component. Wire it into the directory. |
| `AttendingToggle` | **Extend** | Must accept `meetingId` prop and write to `meeting_attendance` table instead of `profiles.attending`. |
| `StationSelector` | **Reuse as-is** | Already receives stations and sessions as props. Just pass meeting-scoped data. |
| `ChatRoom` / `MessageList` / `ChatInput` | **Extend** | Add read-only mode (hide ChatInput) for history browsing. Chat itself already works. |
| `WordCloud` | **Reuse as-is** | Already receives messages as props. Just pass meeting-scoped messages. |
| `GroupBuilder` / `GroupBucket` / `UnassignedPool` | **Extend** | Must scope to a specific meeting's groups. Add `meetingId` to queries. |
| `CountdownTimer` | **Reuse as-is** | Already driven by session data. No meeting-level changes needed. |
| `/api/export` route | **Extend** | Add `meetingId` query parameter to filter messages. Add meeting title/date to export header. |
| `build-markdown.ts` | **Extend** | Add meeting title and date to the export header. Otherwise unchanged. |
| Admin page (`/admin`) | **Restructure** | Current flat list of admin tools (users, groups, wordcloud, export) must become meeting-scoped. New structure: `/admin/meetings` list + `/admin/meetings/[id]` detail. User management stays global. |

---

## Sources

- Existing codebase analysis: `supabase/migrations/001_schema.sql` (current data model)
- Existing codebase analysis: `src/app/dashboard/page.tsx` (current dashboard structure)
- Existing codebase analysis: `src/components/dashboard/RegisteredUsersOverview.tsx` (expandable list pattern)
- Existing codebase analysis: `src/components/dashboard/AttendingToggle.tsx` (attendance UX)
- Existing codebase analysis: `src/components/admin/WordCloud.tsx` (word cloud component)
- Existing codebase analysis: `src/app/api/export/route.ts` (export route)
- Existing codebase analysis: `src/lib/export/build-markdown.ts` (export builder)
- PROJECT.md requirements (active requirements for v1.1)
- [List UI design patterns](https://www.eleken.co/blog-posts/list-ui-design) -- expandable list UX
- [Mobile-first design patterns](https://www.browserstack.com/guide/how-to-implement-mobile-first-design) -- touch-friendly design
- [Chronological activity feeds](https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds) -- meeting history feed patterns
- [RSVP best practices](https://rsvpify.com/event-registration-software/event-attendance-tracking/) -- per-event attendance tracking
- [GroupCal RSVP patterns](https://www.groupcal.app/guide/events-rsvp-attendance-status/) -- per-event attendance status

---
*Feature research for: Buss 2028 Fellesmote v1.1 (multi-meeting platform evolution)*
*Researched: 2026-02-25*
