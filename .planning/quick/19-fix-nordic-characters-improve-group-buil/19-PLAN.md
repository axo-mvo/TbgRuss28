---
phase: quick-19
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dashboard/PreviousMeetingsList.tsx
  - src/app/dashboard/meeting/[id]/page.tsx
  - src/app/admin/meetings/[id]/page.tsx
  - src/components/admin/GroupBuilder.tsx
  - src/components/admin/MeetingLifecycleControls.tsx
  - src/components/admin/MeetingResultsTab.tsx
  - src/app/dashboard/page.tsx
  - src/components/admin/GroupBucket.tsx
  - src/components/dashboard/MeetingStationPicker.tsx
  - src/components/station/MessageList.tsx
  - src/components/station/MessageBubble.tsx
  - src/components/dashboard/YouthDirectoryView.tsx
  - src/components/dashboard/ContactActions.tsx
  - src/components/admin/UserTable.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "All Norwegian strings display correct special characters (ae, oe, aa)"
    - "Meeting history messages from other groups show role labels instead of real names"
    - "Group builder has more spacious layout on desktop"
    - "Contact directory shows phone inline with youth name"
    - "Admin user table has better vertical spacing"
  artifacts:
    - path: "src/components/station/MessageBubble.tsx"
      provides: "Anonymous message display support"
      contains: "anonymous"
    - path: "src/components/station/MessageList.tsx"
      provides: "Anonymous prop passthrough"
      contains: "anonymous"
  key_links:
    - from: "src/app/dashboard/meeting/[id]/page.tsx"
      to: "group_members table"
      via: "admin.from('group_members') query"
      pattern: "group_members"
---

<objective>
Fix Nordic character encoding issues across the codebase, add meeting history anonymity for cross-group viewing, and apply UI polish to group builder, contact directory, and admin user table.

Purpose: Correct all hardcoded Norwegian strings missing special characters, ensure privacy in meeting history, and improve visual density/spacing across several components.
Output: All Norwegian text displays correctly, meeting history shows anonymous names for non-group members, cleaner UI spacing.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/components/station/MessageBubble.tsx:
```typescript
interface MessageBubbleProps {
  fullName: string
  role: 'youth' | 'parent'
  content: string
  createdAt: string
  isOwn: boolean
}
const roleLabels: Record<'youth' | 'parent', string> = { youth: 'Ungdom', parent: 'Forelder' }
```

From src/components/station/MessageList.tsx:
```typescript
interface MessageListProps {
  messages: ChatMessage[]
  currentUserId: string
}
```

From src/lib/hooks/useRealtimeChat (ChatMessage type):
```typescript
type ChatMessage = {
  id: string
  userId: string
  fullName: string
  role: 'youth' | 'parent'
  content: string
  createdAt: string
  status: 'sending' | 'sent' | 'error'
}
```

From src/components/dashboard/ContactActions.tsx:
```typescript
interface ContactActionsProps {
  phone: string | null
  email: string
}
```

Database table: group_members (group_id UUID FK groups, user_id UUID FK profiles)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Nordic characters and add meeting history anonymity</name>
  <files>
    src/components/dashboard/PreviousMeetingsList.tsx
    src/app/dashboard/meeting/[id]/page.tsx
    src/app/admin/meetings/[id]/page.tsx
    src/components/admin/GroupBuilder.tsx
    src/components/admin/MeetingLifecycleControls.tsx
    src/components/admin/MeetingResultsTab.tsx
    src/app/dashboard/page.tsx
    src/components/admin/GroupBucket.tsx
    src/components/dashboard/MeetingStationPicker.tsx
    src/components/station/MessageList.tsx
    src/components/station/MessageBubble.tsx
  </files>
  <action>
**Part A: Fix all Nordic character occurrences (exact replacements):**

1. `src/components/dashboard/PreviousMeetingsList.tsx` line 25:
   - `Tidligere moter` -> `Tidligere m\u00f8ter`

2. `src/app/dashboard/meeting/[id]/page.tsx` line 138:
   - `Fullfort` -> `Fullf\u00f8rt`

3. `src/app/admin/meetings/[id]/page.tsx` line 11:
   - `Fullfort` -> `Fullf\u00f8rt`

4. `src/components/admin/GroupBuilder.tsx` line 263:
   - `Grupper er l\u00e5st (motet er avsluttet)` -> `Grupper er l\u00e5st (m\u00f8tet er avsluttet)`

5. `src/components/admin/MeetingLifecycleControls.tsx`:
   - line 88: `for a starte motet` -> `for \u00e5 starte m\u00f8tet`
   - line 110: `Motet er avsluttet` -> `M\u00f8tet er avsluttet`
   - line 123: `Start mote?` -> `Start m\u00f8te?`
   - line 124: `etter at motet er startet` -> `etter at m\u00f8tet er startet`
   - line 125: `Start mote` -> `Start m\u00f8te`
   - line 134: `Avslutt mote?` -> `Avslutt m\u00f8te?`
   - line 138: `sikker pa at du vil avslutte motet? Denne handlingen kan ikke angres.` -> `sikker p\u00e5 at du vil avslutte m\u00f8tet? Denne handlingen kan ikke angres.`
   - line 140: `Avslutt mote` -> `Avslutt m\u00f8te`
   - line 83: `Start mote` (button text) -> `Start m\u00f8te`
   - line 104: `Avslutt mote` (button text) -> `Avslutt m\u00f8te`

6. `src/components/admin/MeetingResultsTab.tsx` line 45:
   - `enna for dette motet` -> `enn\u00e5 for dette m\u00f8tet`

7. `src/app/dashboard/page.tsx` line 277:
   - `enna. Tildelingen skjer for motet.` -> `enn\u00e5. Tildelingen skjer f\u00f8r m\u00f8tet.`

8. `src/components/admin/GroupBucket.tsx` line 72:
   - `for a tildele dem` -> `for \u00e5 tildele dem`

9. `src/components/dashboard/MeetingStationPicker.tsx`:
   - line 97: `for a lese diskusjonen` -> `for \u00e5 lese diskusjonen`
   - line 101: `for a se diskusjoner` -> `for \u00e5 se diskusjoner`

**Part B: Meeting history anonymity**

In `src/app/dashboard/meeting/[id]/page.tsx`, after the existing `Promise.all` block (around line 56-68), add a query to check if the current user was in the selected group:

After getting `groupParam`, before building messages, query `group_members` via admin client:
```typescript
// Check if current user was in the selected group
let userWasInGroup = false
if (groupParam) {
  const { data: membership } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', groupParam)
    .eq('user_id', user.id)
    .maybeSingle()
  userWasInGroup = !!membership
}
```

Then when mapping messages (around line 103-116), if `!userWasInGroup`, replace `fullName` with the role label:
```typescript
const roleLabels: Record<string, string> = { youth: 'Ungdom', parent: 'Forelder' }
// ... in the map:
fullName: userWasInGroup
  ? (profileData as { full_name: string } | null)?.full_name ?? 'Ukjent'
  : roleLabels[role] || 'Ukjent',
```

Also pass `anonymous={!userWasInGroup}` to `<MessageList>`.

In `src/components/station/MessageList.tsx`:
- Add `anonymous?: boolean` to `MessageListProps`
- Pass `anonymous={anonymous}` to each `<MessageBubble>`

In `src/components/station/MessageBubble.tsx`:
- Add `anonymous?: boolean` to `MessageBubbleProps`
- When `anonymous && !isOwn`, display the role label (`roleLabels[role]`) instead of `fullName` in the name span. When it IS the user's own message, behavior is unchanged (no name shown for own messages anyway).
  </action>
  <verify>
    <automated>cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - All 15+ Nordic character occurrences display correct oe, aa characters
    - Meeting history page queries group_members to determine if user was in the group
    - Messages from groups the user was NOT in show role labels instead of real names
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: UI polish - group builder spacing, contact directory, user table</name>
  <files>
    src/components/admin/GroupBuilder.tsx
    src/components/admin/GroupBucket.tsx
    src/components/dashboard/YouthDirectoryView.tsx
    src/components/dashboard/ContactActions.tsx
    src/components/admin/UserTable.tsx
  </files>
  <action>
**Group Builder desktop spacing:**

In `src/components/admin/GroupBuilder.tsx` line 328, change the desktop grid classes:
- `gap-4` -> `gap-4 lg:gap-6`

In `src/components/admin/GroupBucket.tsx`:
- line 42: Change `p-4` to `p-4 lg:p-5`
- line 75: Change inner `gap-2` to `gap-2 lg:gap-3`

**Contact directory compact layout:**

In `src/components/dashboard/ContactActions.tsx`:
- Add an optional `variant` prop: `variant?: 'full' | 'inline'` (default `'full'`)
- When `variant === 'inline'`: render only the phone link (icon + number) in an inline `span` with no `mt-1` and smaller touch target. No email shown. If no phone, render nothing.
- When `variant === 'full'` (default): keep existing behavior unchanged (phone + email, block layout with `mt-1`).

```typescript
interface ContactActionsProps {
  phone: string | null
  email: string
  variant?: 'full' | 'inline'
}
```

For `inline` variant, render:
```tsx
{variant === 'inline' ? (
  phone ? (
    <a
      href={`tel:+47${phone}`}
      aria-label={`Ring ${phone}`}
      className="inline-flex items-center gap-1 ml-2 text-xs text-teal-primary hover:text-teal-secondary transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      {phone}
    </a>
  ) : null
) : (
  // existing full layout
)}
```

In `src/components/dashboard/YouthDirectoryView.tsx`:
- Change the youth `<summary>` row to use `variant="inline"` on ContactActions so phone shows inline next to the name.
- Move email to the expanded section: In the `<details>` expanded area (`<div className="pl-4 pt-2 pb-1 space-y-2">`), add the youth's own email as a small text line before the parents section, but only inside the expanded details block.
- For parent entries in the expanded section, keep using the default full variant (phone + email shown).
- Add visual containment: wrap the expanded parent content in a div with `ml-1 pl-3 border-l-2 border-gray-100` to create a visual nesting line.

**Admin user table polish:**

In `src/components/admin/UserTable.tsx`:
- In the desktop `<tbody>`, on each `<td>`, change `py-3` to `py-4` and add `align-top` class (i.e. `className="py-4 pr-4 align-top ..."` for all td elements). There are 7 td elements per row (lines 399, 419, 422, 425, 428, 433, 436). Update all of them.
  </action>
  <verify>
    <automated>cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - Group builder desktop grid uses `gap-4 lg:gap-6`, buckets use `p-4 lg:p-5` and `gap-2 lg:gap-3`
    - Contact directory shows phone number inline with youth name, email moved to expanded section
    - ContactActions has `inline` variant for compact phone-only display
    - Admin user table td elements use `py-4` and `align-top`
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `npm run build` completes successfully
- Grep for remaining unescaped Nordic issues: `grep -rn "moter\|Fullfort\|motet\|for a \|enna \|sikker pa" src/ --include="*.tsx"` should return zero results
</verification>

<success_criteria>
- All Norwegian strings display correct special characters
- Meeting history anonymizes names for users viewing groups they were not in
- Group builder spacing is wider on desktop (lg breakpoint)
- Contact directory phone shows inline, email in expanded section only
- Admin table rows have increased vertical padding and top-aligned content
- TypeScript compilation succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/19-fix-nordic-characters-improve-group-buil/19-SUMMARY.md`
</output>
