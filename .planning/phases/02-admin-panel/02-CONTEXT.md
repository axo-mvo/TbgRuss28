# Phase 2: Admin Panel - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin tools to manage users, view/edit parent-child links, create discussion groups with member assignment, and lock groups so participants see their assignment. This phase builds the admin-only interface on top of Phase 1's auth and role system.

</domain>

<decisions>
## Implementation Decisions

### User management interface
- Table layout with columns: name, email, role, registration date
- Search by name (text input, no role filter needed for ~80 users)
- Inline action buttons per row (edit role, delete)
- Confirmation dialog required for both role changes and user deletion
- Parent rows show linked youth name(s) as secondary line or badge inline

### Parent-child link display & editing
- Links shown inline in the user table (parent row shows linked youth)
- Unlinked parents get a warning badge (visual indicator on the row)
- Admin CAN re-link parents to different youth after registration
- Link editing via bottom sheet / modal: tap parent row, sheet slides up with youth dropdown to link/unlink

### Group builder UX
- Drag-and-drop on desktop to assign users to group buckets
- Tap-to-assign fallback on mobile: tap user, pick group from list
- **CRITICAL: Parents and their linked youth must NEVER be in the same group** (this overrides the roadmap's "parent-follows-child" wording — the intent is parent-child separation, not co-assignment)
- Auto-exclude enforcement: admin gets a warning if they try to put a parent and their linked child in the same group
- Group names come from a predefined list of famous russ group names from previous years, randomly assigned when creating a group (admin provides the name list)

### Lock & publish flow
- Claude's Discretion — user did not select this area for discussion
- Must satisfy success criterion: after locking, participants see their group assignment on their dashboard

### Claude's Discretion
- Lock/unlock UI pattern and confirmation flow
- Table responsive behavior on mobile (horizontal scroll vs stacked)
- Empty states for user list and group builder
- Loading and error state design
- Exact drag-and-drop library choice
- How the predefined russ group name list is stored/managed

</decisions>

<specifics>
## Specific Ideas

- Group names are nostalgic/fun — named after legendary russ groups from previous years. The organizers will provide the name list. System randomly picks from available names when a new group is created.
- The parent-child separation rule is central to the meeting concept: parents discuss in separate groups from their own children to encourage open dialogue.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-admin-panel*
*Context gathered: 2026-02-19*
