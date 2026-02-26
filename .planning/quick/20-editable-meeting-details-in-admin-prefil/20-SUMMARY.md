---
phase: quick-20
plan: 01
subsystem: admin-meetings, dashboard
tags: [meetings, edit, word-cloud, prefill]
dependency_graph:
  requires: [meeting-actions, admin-meeting-detail, dashboard-meeting-history, word-cloud-component]
  provides: [editable-meeting-details, prefilled-meeting-title, participant-word-cloud]
  affects: [admin-meetings, dashboard-meeting-history, new-meeting-form]
tech_stack:
  added: []
  patterns: [useActionState-with-bound-params, server-component-wrapper-for-data-fetching]
key_files:
  created:
    - src/components/admin/MeetingDetailsCard.tsx
    - src/app/admin/meetings/new/NewMeetingForm.tsx
  modified:
    - src/lib/actions/meeting.ts
    - src/app/admin/meetings/[id]/page.tsx
    - src/app/admin/meetings/new/page.tsx
    - src/app/dashboard/meeting/[id]/page.tsx
decisions:
  - Used useActionState with .bind(null, meetingId) for updateMeeting form state management
  - Converted new meeting page to server component wrapper that fetches title, delegates to client form
  - Reused admin WordCloud component directly on dashboard (no admin-specific logic in it)
  - Word cloud message transformation uses same pattern as admin meeting detail page
metrics:
  duration: 3min
  completed: "2026-02-26T14:26:11Z"
  tasks: 2
  files: 6
---

# Quick Task 20: Editable Meeting Details, Prefilled Title, Participant Word Cloud Summary

Editable meeting details card with view/edit toggle, prefilled sequential title on new meeting form, and word cloud on participant meeting history page.

## Tasks Completed

### Task 1: Add updateMeeting action, editable details card, and prefilled title on create
**Commit:** 577c72c

**Server actions (meeting.ts):**
- Added `getNextMeetingTitle()` helper that returns `Fellesmote #N` based on total meeting count
- Added `updateMeeting(meetingId, prevState, formData)` action with admin verification, upcoming-only guard, and full field validation
- Updated `createMeeting` to accept optional title from formData, falling back to auto-generated title

**MeetingDetailsCard component:**
- Created `src/components/admin/MeetingDetailsCard.tsx` with view/edit toggle
- View mode: displays title, badge, date/time/venue info card with edit pencil button (upcoming only)
- Edit mode: form with Input fields for title/date/time/venue, Lagre/Avbryt buttons
- Uses `useActionState` with bound meetingId parameter
- Auto-switches back to view mode on successful save

**Admin meeting detail page:**
- Replaced inline title heading + info card with `<MeetingDetailsCard>` component
- Removed unused `formatDate`, `formatTime`, `statusLabels`, `badgeVariant` from page (moved into component)

**New meeting form restructure:**
- Converted `new/page.tsx` to server component that calls `getNextMeetingTitle()`
- Created `NewMeetingForm.tsx` client component with title field prefilled with default value
- Title field is first in the form, editable by admin before submission

### Task 2: Add word cloud to participant meeting history page
**Commit:** ee6b9ca

- Added messages query to parallel Promise.all fetch (joined through station_sessions with stations and groups)
- Transformed messages into `WordCloudMessage[]` format, filtered to current meeting scope
- Built `wordcloudGroups` and `wordcloudStations` arrays for filter pills
- Rendered `<WordCloud>` component below the discussion area, only when `meetingMessages.length > 0`
- Same WordCloud component reused from admin for consistent UX

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx next build` completes without errors (verified after both tasks)
- All routes compile and render correctly
- No type errors or unused import warnings in modified files

## Self-Check: PASSED
