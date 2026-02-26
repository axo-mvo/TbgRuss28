---
phase: quick-20
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/actions/meeting.ts
  - src/app/admin/meetings/[id]/page.tsx
  - src/components/admin/MeetingDetailsCard.tsx
  - src/app/admin/meetings/new/page.tsx
  - src/app/dashboard/meeting/[id]/page.tsx
autonomous: true
requirements: [QUICK-20]
must_haves:
  truths:
    - "Admin can edit meeting title, date, time, and venue from the meeting detail page"
    - "New meeting form shows a prefilled title (Fellesmoete #N) that admin can change"
    - "Participants can see the word cloud on the completed meeting history page"
  artifacts:
    - path: "src/components/admin/MeetingDetailsCard.tsx"
      provides: "Editable meeting details card component"
    - path: "src/lib/actions/meeting.ts"
      provides: "updateMeeting server action and getNextMeetingTitle helper"
    - path: "src/app/admin/meetings/new/page.tsx"
      provides: "Prefilled editable title field on create form"
    - path: "src/app/dashboard/meeting/[id]/page.tsx"
      provides: "Word cloud section for completed meeting history"
  key_links:
    - from: "src/components/admin/MeetingDetailsCard.tsx"
      to: "src/lib/actions/meeting.ts"
      via: "updateMeeting server action"
    - from: "src/app/dashboard/meeting/[id]/page.tsx"
      to: "src/components/admin/WordCloud.tsx"
      via: "WordCloud component import"
---

<objective>
Make meeting details editable in admin, prefill meeting title on create, and add word cloud to participant meeting history.

Purpose: Admins currently cannot edit meeting details after creation (title/date/time/venue are read-only). The meeting title is auto-generated with no option to customize. Participants cannot see the word cloud from completed meetings.

Output: Editable meeting card in admin, title field on create form, word cloud on dashboard meeting history.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/actions/meeting.ts
@src/app/admin/meetings/[id]/page.tsx
@src/components/admin/MeetingTabs.tsx
@src/app/admin/meetings/new/page.tsx
@src/app/dashboard/meeting/[id]/page.tsx
@src/components/admin/WordCloud.tsx
@src/components/admin/MeetingResultsTab.tsx
@src/components/ui/Input.tsx
@src/components/ui/Label.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add updateMeeting action, editable details card, and prefilled title on create</name>
  <files>
    src/lib/actions/meeting.ts
    src/components/admin/MeetingDetailsCard.tsx
    src/app/admin/meetings/[id]/page.tsx
    src/app/admin/meetings/new/page.tsx
  </files>
  <action>
**1. Add server actions to `src/lib/actions/meeting.ts`:**

Add `updateMeeting` action after the existing `createMeeting`:
```typescript
export async function updateMeeting(
  meetingId: string,
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }>
```
- verifyAdmin() first
- Extract title, date, time, venue from formData
- Validate all required (title trimmed must be non-empty, date, time, venue non-empty)
- Only allow editing upcoming meetings (check status === 'upcoming'). For active/completed, return error "Kan bare redigere kommende moter"
- Update via admin client: `admin.from('meetings').update({ title, date, time, venue, updated_at: new Date().toISOString() }).eq('id', meetingId)`
- revalidatePath for `/admin/meetings`, `/admin/meetings/${meetingId}`, `/dashboard`
- Return `{ success: true }`

Add `getNextMeetingTitle` helper (exported):
```typescript
export async function getNextMeetingTitle(): Promise<string>
```
- Uses admin client to count meetings: `select('*', { count: 'exact', head: true })`
- Returns `Fellesmøte #${(count ?? 0) + 1}`

Update `createMeeting` to read title from formData:
- Add `const title = (formData.get('title') as string | null)?.trim()`
- If title is empty/null, fall back to the auto-generated `Fellesmøte #N` (keep backward compat)
- Remove the inline count+title generation since it's only needed as fallback now

**2. Create `src/components/admin/MeetingDetailsCard.tsx`:**

'use client' component. Props:
```typescript
interface MeetingDetailsCardProps {
  meeting: {
    id: string
    title: string
    status: string
    date: string | null
    time: string | null
    venue: string | null
  }
}
```

Two modes: view (default) and edit.
- **View mode:** Renders exactly the same card as currently in page.tsx (title heading, badge, date/time/venue info). Add a pencil/edit button in the top-right corner (only visible when status === 'upcoming').
- **Edit mode:** Replaces the info card with a form. Fields:
  - Title: `<Input>` with current value, name="title", required
  - Date: `<input type="date">` with current value, name="date", required (same styling as new meeting form)
  - Time: `<input type="time">` with current value, name="time", required (same styling)
  - Venue: `<Input>` with current value, name="venue", required
  - Two buttons: "Lagre" (submit, teal-primary) and "Avbryt" (cancel, secondary/ghost, calls setEditing(false))
- Use `useActionState` with `updateMeeting.bind(null, meeting.id)` pattern
- On success (state?.success), switch back to view mode
- Show error banner if state?.error
- Include the Badge component in both modes for status display
- Use same icon SVGs from current page for date/time/venue in view mode

**3. Update `src/app/admin/meetings/[id]/page.tsx`:**

Replace the static title heading + info card (lines 178-233) with `<MeetingDetailsCard meeting={meeting} />`. Remove the formatDate and formatTime helper functions from this file (move into the new component or inline). Keep everything else the same -- MeetingTabs below the card.

Import MeetingDetailsCard at the top.

**4. Update `src/app/admin/meetings/new/page.tsx`:**

Convert to server component wrapper + client form component approach, OR keep as client component but call getNextMeetingTitle on mount. Simplest approach: keep client component, add a `title` Input field before the date field.

- Add an `<Input>` field for title: label="Tittel", name="title", id="title", required, placeholder="F.eks. Fellesmoete #3"
- To prefill: Since this is a client component, it cannot call server actions on load directly. Instead, make the page a server component that fetches the next title and passes it to a client form component.

Restructure:
- `src/app/admin/meetings/new/page.tsx` becomes a server component that calls `getNextMeetingTitle()` and renders `<NewMeetingForm defaultTitle={title} />`
- Move the existing form into a new inline section or keep in same file using a client component pattern.

Actually, simplest: keep the existing `new/page.tsx` as a client component. Add the title field with a hardcoded placeholder. The server action `createMeeting` already auto-generates the title if none provided, and the new code will use the submitted title if provided. The prefill can be done by fetching via a small API or just showing the placeholder text.

Best approach: Convert `new/page.tsx` to a thin server component that fetches the suggested title, then renders a `NewMeetingForm` client component with `defaultTitle` prop.

```typescript
// new/page.tsx (server component)
import { getNextMeetingTitle } from '@/lib/actions/meeting'
import NewMeetingForm from './NewMeetingForm'

export default async function NewMeetingPage() {
  const defaultTitle = await getNextMeetingTitle()
  return <NewMeetingForm defaultTitle={defaultTitle} />
}
```

Create `src/app/admin/meetings/new/NewMeetingForm.tsx` as the client component with the existing form content, plus a title `<Input>` field (first field) prefilled with `defaultTitle`.

  </action>
  <verify>
    Build succeeds: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx next build 2>&1 | tail -20`
  </verify>
  <done>
    - Admin meeting detail page shows editable card with edit button (upcoming meetings only)
    - Edit mode shows form with title/date/time/venue fields, save/cancel buttons
    - updateMeeting server action validates and updates meeting in DB
    - New meeting form has prefilled title field (Fellesmoete #N) that admin can change
    - createMeeting action uses provided title or falls back to auto-generated
  </done>
</task>

<task type="auto">
  <name>Task 2: Add word cloud to participant meeting history page</name>
  <files>
    src/app/dashboard/meeting/[id]/page.tsx
  </files>
  <action>
Add a word cloud section to the completed meeting history page at `/dashboard/meeting/[id]`.

**1. Move WordCloud import to a shared location (or import from existing path):**

The WordCloud component is at `src/components/admin/WordCloud.tsx`. Since it has no admin-specific logic (pure presentational), import it directly on the dashboard meeting page. No need to move the file -- the "admin" directory is just organizational.

**2. Update `src/app/dashboard/meeting/[id]/page.tsx`:**

Add message fetching for word cloud data. In the parallel Promise.all fetch block, add a messages query (same pattern as admin meeting detail page):

```typescript
// Add to Promise.all:
admin
  .from('messages')
  .select(`
    id, content,
    station_sessions:session_id (
      station_id,
      stations:station_id ( id, number, title, meeting_id ),
      groups:group_id ( id, name )
    )
  `)
  .order('created_at', { ascending: true }),
```

After the fetch, transform messages into WordCloudMessage[] using the same pattern as the admin page (filter by meeting_id === id, extract station/group data).

Build wordcloudGroups and wordcloudStations arrays from groups and stations results.

**3. Render word cloud section:**

Add after the discussion display area (after the station/group picker messages section, before the closing `</div>`s), render:

```tsx
{/* Word cloud section -- only show when meeting has messages */}
<div className="mt-8">
  <h2 className="text-lg font-semibold text-text-primary mb-3">Ordsky</h2>
  <WordCloud
    messages={meetingMessages}
    groups={wordcloudGroups}
    stations={wordcloudStations}
  />
</div>
```

Only render this section if meetingMessages.length > 0. If no messages, show nothing (the meeting history page already has its own empty state per station/group selection).

Import WordCloud and WordCloudMessage type at the top:
```typescript
import WordCloud from '@/components/admin/WordCloud'
import type { WordCloudMessage } from '@/components/admin/WordCloud'
```

  </action>
  <verify>
    Build succeeds: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx next build 2>&1 | tail -20`
  </verify>
  <done>
    - Completed meeting history page shows word cloud section below the station/group discussion viewer
    - Word cloud displays all messages from the meeting with group/station filtering
    - Word cloud only appears when the meeting has messages
    - Same WordCloud component reused from admin (consistent UX)
  </done>
</task>

</tasks>

<verification>
- `npx next build` completes without errors
- Admin meeting detail page at `/admin/meetings/[id]` shows edit button for upcoming meetings
- Clicking edit reveals form with prefilled title/date/time/venue, saving updates the meeting
- New meeting form at `/admin/meetings/new` has title field prefilled with next sequential title
- Dashboard meeting history at `/dashboard/meeting/[id]` shows word cloud for completed meetings with messages
</verification>

<success_criteria>
- Meeting details (title, date, time, venue) are editable for upcoming meetings in admin
- Meeting title is prefilled on the create form but editable by admin
- Word cloud appears on participant-facing completed meeting history page
- All existing functionality preserved (no regressions)
</success_criteria>

<output>
After completion, create `.planning/quick/20-editable-meeting-details-in-admin-prefil/20-SUMMARY.md`
</output>
