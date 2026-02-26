---
phase: quick-27
plan: 01
subsystem: meetings
tags: [audience-targeting, role-filtering, multi-meeting]
dependency_graph:
  requires: [meetings-table, meeting-attendance-table, profiles-role]
  provides: [audience-column, audience-rls, audience-admin-ui, audience-dashboard-ui]
  affects: [admin-meetings, dashboard, attendance]
tech_stack:
  added: []
  patterns: [audience-toggle-group, batch-attendance-fetch, role-based-filtering]
key_files:
  created:
    - supabase/migrations/027_meeting_audience.sql
  modified:
    - src/lib/actions/meeting.ts
    - src/lib/actions/attendance.ts
    - src/app/admin/meetings/new/page.tsx
    - src/app/admin/meetings/new/NewMeetingForm.tsx
    - src/app/admin/meetings/page.tsx
    - src/app/admin/meetings/[id]/page.tsx
    - src/components/admin/MeetingCard.tsx
    - src/components/admin/MeetingDetailsCard.tsx
    - src/app/dashboard/page.tsx
    - src/components/dashboard/UpcomingMeetingCard.tsx
    - src/components/dashboard/PreviousMeetingsList.tsx
decisions:
  - "audience column on meetings with CHECK constraint (everyone/youth/parent)"
  - "Dropped single-upcoming-meeting unique index to allow multiple upcoming meetings"
  - "RLS on meeting_attendance updated for audience-aware INSERT/UPDATE (defense-in-depth)"
  - "Admin audience options filtered by role: youth-admin sees Alle+Kun ungdom, parent-admin sees Alle+Kun foreldre"
  - "Dashboard batch-fetches attendance for all upcoming meetings to avoid N+1"
  - "Non-targeted meetings rendered with opacity-50 and italic audience label"
metrics:
  duration: "6min"
  completed: "2026-02-26"
---

# Quick Task 27: Add Audience Targeting to Meetings Summary

Audience targeting on meetings with role-based filtering: admins create meetings for everyone/youth/parents, dashboard shows targeted meetings as interactive and non-targeted as greyed-out.

## What Was Done

### Task 1: Database migration and server action updates (f2aea98)

**Migration (`027_meeting_audience.sql`):**
- Added `audience TEXT NOT NULL DEFAULT 'everyone'` with CHECK constraint
- Dropped `idx_one_upcoming_meeting` partial unique index (multiple upcoming meetings now allowed)
- Added `idx_meetings_audience` performance index
- Replaced INSERT/UPDATE RLS policies on `meeting_attendance` with audience-aware versions that validate meeting audience matches user role

**Server actions:**
- `verifyAdmin()` now returns `{ userId, role }` instead of just `{ userId }`
- `createMeeting()` extracts `audience` from formData, validates against admin's role, removed single-upcoming check
- `updateMeeting()` accepts and saves `audience` from formData with role-based validation
- `updateMeetingAttendance()` rejects RSVPs when meeting audience does not match user role

### Task 2: Admin panel audience UI (7ab0e31)

- `NewMeetingForm` shows a 3-button audience toggle (Alle/Kun ungdom/Kun foreldre) filtered by admin's role
- `MeetingsPage` fetches admin role, filters meetings by `.in('audience', ['everyone', adminRole])`, supports multiple upcoming meetings
- "Nytt mote" button always visible (no longer hidden when upcoming exists)
- `MeetingCard` shows audience badge (Ungdom in teal, Foreldre in coral) for non-everyone meetings
- `MeetingDetailsCard` shows audience badge in view mode and audience toggle in edit mode
- Meeting detail page (`[id]/page.tsx`) fetches admin role, blocks access to wrong-audience meetings via `notFound()`

### Task 3: Dashboard audience-aware meeting display (8001d4d)

- Dashboard now fetches ALL upcoming meetings (not just one) with audience field
- Batch attendance fetch for all upcoming meeting IDs at once (avoids N+1)
- Targeted meetings: full interactive UpcomingMeetingCard + AttendingToggle
- Non-targeted meetings: greyed-out card (opacity-50) with audience label, no RSVP toggle
- Active meeting: full interactive for targeted users, greyed-out for non-targeted
- `UpcomingMeetingCard` shows audience label when audience is youth or parent
- `PreviousMeetingsList` accepts `userRole`, renders non-targeted past meetings as plain divs (no link, no "Se diskusjoner")

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | f2aea98 | Migration + server action updates |
| 2 | 7ab0e31 | Admin panel audience UI |
| 3 | 8001d4d | Dashboard audience-aware display |

## Verification

- TypeScript compiles with no errors (`npx tsc --noEmit`)
- Production build succeeds (`npx next build`)
- Migration SQL syntactically valid

## Self-Check: PASSED

All 9 files verified present. All 3 commits verified in git log.
