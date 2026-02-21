---
phase: quick-18
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/dashboard/page.tsx
  - src/components/dashboard/RegisteredUsersOverview.tsx
autonomous: true
requirements: [QUICK-18]

must_haves:
  truths:
    - "Dashboard waiting mode shows summary counts above participant list: youth count, parent count, attending count, not-responded count"
    - "Each youth row shows their attendance status (Kommer / Kommer ikke / Ikke svart)"
    - "Each parent row (when expanded) shows their attendance status"
    - "Counts update correctly based on actual attending column values (null, true, false)"
  artifacts:
    - path: "src/app/dashboard/page.tsx"
      provides: "Fetches attending column for all youth and parents, passes to RegisteredUsersOverview"
    - path: "src/components/dashboard/RegisteredUsersOverview.tsx"
      provides: "Summary counts bar and per-participant attendance indicators"
  key_links:
    - from: "src/app/dashboard/page.tsx"
      to: "src/components/dashboard/RegisteredUsersOverview.tsx"
      via: "props with attending data for youth and parents"
      pattern: "attending"
---

<objective>
Add participant summary counts and per-participant response status indicators to the dashboard waiting list (RegisteredUsersOverview). When groups are not locked, participants see a summary bar showing "x Ungdommer, y Foreldre, z Kommer, w Har ikke svart" and each participant line shows their attendance status.

Purpose: Gives participants and admin visibility into who has responded and who is coming to the Wednesday meeting, directly from the dashboard waiting view.
Output: Updated dashboard page and RegisteredUsersOverview component with summary counts and attendance indicators.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/app/dashboard/page.tsx
@src/components/dashboard/RegisteredUsersOverview.tsx
@src/components/dashboard/AttendingToggle.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fetch attending data for all participants and pass to overview</name>
  <files>src/app/dashboard/page.tsx</files>
  <action>
In dashboard page.tsx, update the data fetching to include `attending` in the youth and parent queries:

1. Update the `allYouth` adminClient query to also select `attending`:
   ```
   .select('id, full_name, attending')
   ```

2. Update the `allLinks` query to include `attending` on the parent profile:
   ```
   parent:profiles!parent_youth_links_parent_id_fkey(id, full_name, attending)
   ```

3. Update the `youthWithParents` mapping to include `attending` on both youth and parents:
   - Youth objects get `attending: y.attending` (boolean | null)
   - Parent objects in the array get `attending` from the link parent data

4. Also fetch all unique parents separately for accurate parent count. Query all profiles where role is 'parent' or 'admin' (use isParentLike logic -- `role in ('parent', 'admin')`) with `attending` to get total parent count and their attendance.

   Actually, simpler approach: fetch ALL profiles (youth + parent + admin) with `id, role, attending` via adminClient to compute summary counts. This is a single query:
   ```typescript
   const { data: allProfiles } = await adminClient
     .from('profiles')
     .select('id, role, attending')
     .in('role', ['youth', 'parent', 'admin'])
   ```
   Then compute counts from allProfiles:
   - `youthCount` = profiles where role === 'youth'
   - `parentCount` = profiles where role === 'parent' or role === 'admin' (admin is also a parent per decision [quick-9])
   - `attendingCount` = all profiles where attending === true
   - `notRespondedCount` = all profiles where attending === null

5. Pass these as new props to RegisteredUsersOverview:
   ```tsx
   <RegisteredUsersOverview
     youth={youthWithParents}
     summary={{ youthCount, parentCount, attendingCount, notRespondedCount }}
   />
   ```
   Where youthWithParents now includes `attending` on both youth and parent objects.
  </action>
  <verify>TypeScript compiles without errors: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npx tsc --noEmit 2>&1 | head -30`</verify>
  <done>Dashboard page fetches attending data for all participants and passes summary counts + per-participant attending status to RegisteredUsersOverview</done>
</task>

<task type="auto">
  <name>Task 2: Add summary counts bar and per-participant attendance indicators</name>
  <files>src/components/dashboard/RegisteredUsersOverview.tsx</files>
  <action>
Update RegisteredUsersOverview to display summary counts and attendance status:

1. Update interfaces to include attending data:
   ```typescript
   interface YouthWithParents {
     id: string
     full_name: string
     attending: boolean | null
     parents: Array<{ id: string; full_name: string; attending: boolean | null }>
   }

   interface SummaryCounts {
     youthCount: number
     parentCount: number
     attendingCount: number
     notRespondedCount: number
   }

   interface RegisteredUsersOverviewProps {
     youth: YouthWithParents[]
     summary: SummaryCounts
   }
   ```

2. Add a summary counts bar between the "Registrerte deltakere" heading and the participant list. Use a compact horizontal layout with small pill-style items. Mobile-first, wrapping on small screens:
   ```tsx
   <div className="flex flex-wrap gap-2 mb-4">
     <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
       <span className="font-semibold text-text-primary">{summary.youthCount}</span> Ungdommer
     </span>
     <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
       <span className="font-semibold text-text-primary">{summary.parentCount}</span> Foreldre
     </span>
     <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
       <span className="w-2 h-2 rounded-full bg-success inline-block" />
       <span className="font-semibold text-text-primary">{summary.attendingCount}</span> Kommer
     </span>
     <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
       <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
       <span className="font-semibold text-text-primary">{summary.notRespondedCount}</span> Har ikke svart
     </span>
   </div>
   ```

3. Add attendance status indicator on each youth row (inside the summary element, after the youth name, before the parent badge). Use a small helper function:
   ```typescript
   function AttendanceIndicator({ attending }: { attending: boolean | null }) {
     if (attending === true) return <span className="w-2 h-2 rounded-full bg-success shrink-0" title="Kommer" />
     if (attending === false) return <span className="w-2 h-2 rounded-full bg-coral shrink-0" title="Kommer ikke" />
     return <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" title="Har ikke svart" />
   }
   ```
   Place this dot right after the youth name inside the summary line:
   ```tsx
   <span className="font-medium text-text-primary flex items-center gap-2">
     {y.full_name}
     <AttendanceIndicator attending={y.attending} />
   </span>
   ```

4. Add attendance indicator on each parent row in the expanded details section (next to parent name, similar pattern as the existing coral dot but replacing it with an attendance-aware dot):
   ```tsx
   <div key={parent.id} className="text-sm text-text-muted flex items-center gap-2">
     <AttendanceIndicator attending={parent.attending} />
     {parent.full_name}
   </div>
   ```
   This replaces the existing static `bg-coral/40` dot with the dynamic attendance indicator.

5. Keep the empty state unchanged.
  </action>
  <verify>Build succeeds: `cd /Users/mariusvalle-olsen/Github/TbgRuss28 && npm run build 2>&1 | tail -20`</verify>
  <done>Summary counts bar shows above participant list with youth/parent/attending/not-responded counts. Each youth row has a colored dot indicating attendance status. Each parent row in expanded view shows their attendance status dot. Green = Kommer, red/coral = Kommer ikke, gray = Har ikke svart.</done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- Dashboard page in waiting mode (groups not locked) shows summary counts bar at top of participant list
- Each youth row shows a colored attendance indicator dot (green/coral/gray)
- Expanded parent rows show attendance indicator dots replacing the old static coral dots
- Counts are computed from all profiles (youth + parent + admin roles)
</verification>

<success_criteria>
- Summary bar displays: "x Ungdommer, y Foreldre, z Kommer, w Har ikke svart" with correct computed values
- Youth participants show attendance dot indicator inline with their name
- Parent participants show attendance dot indicator in expanded details
- Three attendance states visually distinct: green (attending), coral (not attending), gray (not responded)
- Mobile-first layout: summary pills wrap naturally on narrow screens
- Build passes without errors
</success_criteria>

<output>
After completion, create `.planning/quick/18-add-participant-summary-counts-and-respo/18-SUMMARY.md`
</output>
