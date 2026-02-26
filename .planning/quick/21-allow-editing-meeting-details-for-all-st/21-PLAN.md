---
phase: quick-21
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/admin/MeetingDetailsCard.tsx
  - src/lib/actions/meeting.ts
autonomous: true
requirements: []
---

<objective>
Remove the upcoming-only guard from meeting details editing. Currently only upcoming meetings can be edited. Allow admins to edit meeting title, date, time, and venue for meetings in any status (upcoming, active, completed).

Purpose: Admins need flexibility to correct meeting details after creation, even if the meeting has started or completed.
Output: Updated component and server action with all-status editing enabled.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/admin/MeetingDetailsCard.tsx
@src/lib/actions/meeting.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove editing guard from component and server action</name>
  <files>
    src/components/admin/MeetingDetailsCard.tsx
    src/lib/actions/meeting.ts
  </files>
  <action>
Remove the upcoming-only guard in two places:

1. In MeetingDetailsCard.tsx (line 53):
   - Change: `const canEdit = meeting.status === 'upcoming'`
   - To: `const canEdit = true` (or remove the status check entirely, allow editing for all statuses)

2. In meeting.ts updateMeeting function (lines 122-124):
   - Remove this guard block:
     ```
     if (meeting.status !== 'upcoming') {
       return { error: 'Kan bare redigere kommende møter' }
     }
     ```
   - Keep the rest of the validation (title, date, time, venue required, meeting exists check)

This allows admins to edit meeting details (title, date, time, venue) regardless of the meeting's status. The edit pencil icon will always be visible, and the server action will accept updates for active and completed meetings as well as upcoming ones.
  </action>
  <verify>
// Verify component change
grep -n "const canEdit" src/components/admin/MeetingDetailsCard.tsx

// Verify server action change — should NOT have the status !== 'upcoming' check
grep -A 2 "if (meeting.status" src/lib/actions/meeting.ts | grep -v "^--$"

// Verify the guard is gone by checking line count near updateMeeting
wc -l src/lib/actions/meeting.ts
  </verify>
  <done>
- canEdit no longer restricts to upcoming status in MeetingDetailsCard
- Edit pencil icon visible for all meeting statuses
- updateMeeting server action accepts updates for all statuses
- Form submission allowed for active and completed meetings
- No other guards or logic changed
  </done>
</task>

</tasks>

<verification>
1. Component renders edit button for all meeting statuses (upcoming, active, completed)
2. Server action accepts update requests regardless of meeting status
3. No other guards prevent editing (title/date/time/venue validation still present)
4. Error message about "Can only edit upcoming meetings" removed
</verification>

<success_criteria>
- Edit pencil icon appears for all meeting statuses
- Form can be submitted for active/completed meetings without "Kan bare redigere kommende møter" error
- Meeting details (title, date, time, venue) can be updated for any status
</success_criteria>

<output>
After completion, create `.planning/quick/21-allow-editing-meeting-details-for-all-st/21-SUMMARY.md`
</output>
