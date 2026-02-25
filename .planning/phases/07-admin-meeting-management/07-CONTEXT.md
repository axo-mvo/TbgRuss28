# Phase 7: Admin Meeting Management - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can create and fully configure meetings with custom stations, per-meeting groups, and lifecycle control. Includes meeting-scoped export and word cloud. The "Grupper" admin tab is absorbed into per-meeting management. Participant-facing dashboard changes and meeting history browsing belong to Phases 8 and 9.

</domain>

<decisions>
## Implementation Decisions

### Meeting Creation Flow
- Dedicated page at /admin/meetings/new with date, time, and venue fields
- After creation, redirect to the new meeting's detail page for immediate station/group configuration
- Block creation when an upcoming meeting already exists — show "Det finnes allerede et kommende mote" message
- "Moter" tab replaces the standalone "Grupper" tab in admin nav — group management moves into each meeting's detail page

### Station Configuration
- Stations displayed as a vertical list on the meeting detail page with inline expand-to-edit
- Drag handle for reorder, tap to expand and edit title/questions/tip
- Station questions entered as a single textarea (free text, line breaks separate questions)
- Flexible station count — admin decides how many stations per meeting (minimum 1)
- "Legg til stasjon" button at bottom of list to add new stations
- Stations locked (read-only) once meeting becomes active — no mid-discussion edits

### Meeting Lifecycle Controls
- Manual activation: "Start mote" button with confirmation dialog on meeting detail page
- Prerequisites: activation blocked until at least 1 station and 1 group exist
- Manual completion: "Avslutt mote" button with confirmation dialog
- Before completing: warn admin if groups are still active ("X grupper er fortsatt aktive. Avslutt likevel?"), then force-close all active sessions
- Participants redirected to dashboard with "Motet er avsluttet" on force-close

### Admin Meeting Hub
- Meetings overview page: prominent upcoming meeting card at top with quick actions (Rediger, Start), previous meetings listed chronologically below
- "Nytt mote" button visible when no upcoming meeting exists
- Meeting detail page uses tabbed layout: Stasjoner | Grupper | Resultat
- "Resultat" tab combines export download button and word cloud display
- Completed meetings open in the same tabbed detail page but in read-only mode — admin can view stations, groups, export, and word cloud for any past meeting

### Claude's Discretion
- Exact form field types for date/time/venue inputs
- Tab styling and mobile tab bar implementation
- Drag-and-drop library choice for station reorder
- Loading states and error handling patterns
- How the existing group builder integrates into the meeting detail Grupper tab
- Exact confirmation dialog styling and animation

</decisions>

<specifics>
## Specific Ideas

- Meeting overview layout: upcoming meeting as a large prominent card (double-bordered), previous meetings as compact list items
- Admin nav simplification: "Moter" replaces "Grupper" since groups are now always per-meeting — cleaner navigation
- Tab labels kept short for mobile: "Stasjoner", "Grupper", "Resultat"
- Station inline edit pattern: collapsed shows number + title + drag handle, expanded shows full edit form with save/delete

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-admin-meeting-management*
*Context gathered: 2026-02-26*
