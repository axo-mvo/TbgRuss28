---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/dashboard/page.tsx
  - src/components/dashboard/RegisteredUsersOverview.tsx
autonomous: true
requirements: ["QUICK-5"]

must_haves:
  truths:
    - "Youth dashboard shows a list of all registered youth (ungdom)"
    - "Each youth entry shows a count of how many parents are linked to them"
    - "Tapping a youth entry expands to show the parent names underneath"
    - "Parent sections are collapsed by default"
    - "The old placeholder text 'Dashbordet er under utvikling' is removed"
  artifacts:
    - path: "src/components/dashboard/RegisteredUsersOverview.tsx"
      provides: "Collapsible youth-parent list component"
      min_lines: 40
    - path: "src/app/dashboard/page.tsx"
      provides: "Updated dashboard integrating the overview"
  key_links:
    - from: "src/app/dashboard/page.tsx"
      to: "supabase admin client"
      via: "createAdminClient() query for profiles + parent_youth_links"
      pattern: "createAdminClient"
    - from: "src/app/dashboard/page.tsx"
      to: "src/components/dashboard/RegisteredUsersOverview.tsx"
      via: "props passing youth data array"
      pattern: "RegisteredUsersOverview"
---

<objective>
Replace the youth waiting/placeholder page on the dashboard with a dynamic registered users overview. Show all registered youth (ungdom) with collapsible parent (foreldre) lists underneath each, including a count badge.

Purpose: Give youth users visibility into who has registered, replacing the static "under utvikling" placeholder.
Output: Updated dashboard page with RegisteredUsersOverview component.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/dashboard/page.tsx
@src/app/dashboard/layout.tsx
@src/lib/supabase/admin.ts
@src/lib/supabase/server.ts
@src/components/ui/Badge.tsx
@src/components/ui/Card.tsx
@src/components/ui/EmptyState.tsx
@src/app/globals.css
@supabase/migrations/001_schema.sql
@supabase/migrations/002_rls.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create RegisteredUsersOverview client component</name>
  <files>src/components/dashboard/RegisteredUsersOverview.tsx</files>
  <action>
Create a new client component at `src/components/dashboard/RegisteredUsersOverview.tsx`.

This component receives pre-fetched data as props (server component fetches, this component renders with interactivity).

Props interface:
```ts
interface YouthWithParents {
  id: string
  full_name: string
  parents: Array<{ id: string; full_name: string }>
}

interface RegisteredUsersOverviewProps {
  youth: YouthWithParents[]
}
```

Implementation:
- Use `'use client'` directive (needed for `<details>` open state tracking is fine natively, but we want smooth UI).
- Actually, `<details>/<summary>` works without client JS. Make this a SERVER component (no 'use client'). The native HTML `<details>` element handles collapse/expand without JavaScript.
- Render a section heading: "Registrerte deltakere" (h2, text-lg font-semibold text-text-primary mb-4).
- If `youth` array is empty, render the `EmptyState` component with title="Ingen ungdommer registrert enna" and description="Deltakere vises her etter registrering."
- Map over `youth` array. For each youth, render a `<details>` element (collapsed by default):
  - `<summary>` contains: youth name (font-medium text-text-primary) + a small Badge showing parent count (e.g., "2 foreldre"). Use the existing `Badge` component with variant="parent" for the count. Style the summary with flex layout, `list-none` to remove default arrow, and add a custom chevron SVG that rotates on open using the `details[open] > summary` CSS selector via Tailwind's `group-open` or `[&[open]>summary]` approach.
  - Summary row: `flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors`
  - Inside the details (below summary): a div with `pl-4 pt-2 pb-1 space-y-1` containing each parent name in a small row: `text-sm text-text-muted flex items-center gap-2` with a small person icon or bullet. If no parents, show italic text "Ingen foreldre registrert".
  - Add `mb-2` to each `<details>` element for spacing between youth entries.
- Use a chevron icon (inline SVG, rotate via `group-open:rotate-90` or `[open]_>_summary .chevron` with CSS transition). Wrap the `<details>` in a div with `group` class, or use the `<details>` itself. The simplest Tailwind v4 approach: put a `transition-transform duration-200` on the chevron SVG, and use `[&[open]>summary_.chevron]:rotate-90` on the `<details>` element. Actually, simplest: use `open:` modifier on details — Tailwind v4 supports `group/name` and `group-open/name`. Wrap: `<details className="group mb-2">`, then on chevron: `className="... transition-transform duration-200 group-open:rotate-90"`.
- Mobile-first: full-width list, touch-friendly tap targets (min-h-[44px] on summary rows).
  </action>
  <verify>
File exists at src/components/dashboard/RegisteredUsersOverview.tsx. TypeScript compiles: `npx tsc --noEmit --pretty 2>&1 | grep -i "RegisteredUsersOverview"` returns no errors.
  </verify>
  <done>
RegisteredUsersOverview component exists as a server component rendering a collapsible list of youth with parent counts. Uses native HTML details/summary for zero-JS interactivity. Each youth shows parent count badge, collapsed parents list expands on tap.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update dashboard page to fetch and display registered users</name>
  <files>src/app/dashboard/page.tsx</files>
  <action>
Modify `src/app/dashboard/page.tsx` to replace the placeholder message with the RegisteredUsersOverview.

1. Add import for `createAdminClient` from `@/lib/supabase/admin` and `RegisteredUsersOverview` from `@/components/dashboard/RegisteredUsersOverview`.

2. Add a new data fetch using the admin client (bypasses RLS so youth users can see all profiles). Place this AFTER the existing profile/membership queries. The admin client is necessary because RLS on `profiles` only allows users to see their own profile — youth need to see everyone.

Query pattern (similar to admin/users/page.tsx):
```ts
const adminClient = createAdminClient()

// Fetch all youth with their linked parents
const { data: allYouth } = await adminClient
  .from('profiles')
  .select('id, full_name')
  .eq('role', 'youth')
  .order('full_name')

const { data: allLinks } = await adminClient
  .from('parent_youth_links')
  .select(`
    youth_id,
    parent:profiles!parent_youth_links_parent_id_fkey(id, full_name)
  `)

// Assemble youth with parents
const youthWithParents = (allYouth ?? []).map(y => ({
  id: y.id,
  full_name: y.full_name,
  parents: (allLinks ?? [])
    .filter(l => l.youth_id === y.id)
    .map(l => l.parent as unknown as { id: string; full_name: string })
    .filter(Boolean)
}))
```

3. Replace the placeholder `<p>` at line ~98 (the one showing "Dashbordet er under utvikling. Stasjoner og gruppechat kommer snart.") and the "Du er ikke tildelt en gruppe enna" message with the RegisteredUsersOverview. The conditional block (lines 89-103) currently shows StationSelector when groups are locked, or a placeholder otherwise. Change the else branch:

Replace:
```tsx
<p className="text-text-muted mb-8">
  {!membership
    ? 'Du er ikke tildelt en gruppe enna. Kontakt admin.'
    : 'Dashbordet er under utvikling. Stasjoner og gruppechat kommer snart.'}
</p>
```

With:
```tsx
<div className="mb-8">
  {!membership && (
    <p className="text-text-muted mb-4">
      Du er ikke tildelt en gruppe enna. Kontakt admin.
    </p>
  )}
  <RegisteredUsersOverview youth={youthWithParents} />
</div>
```

This shows the registered users overview always in the non-station-selector branch, but keeps the "not assigned to group" notice if relevant. The overview replaces the old "under utvikling" text entirely.

4. Keep the existing welcome header, role badge, group card, station selector, and logout button unchanged. Only the else-branch content changes.

5. Do NOT remove or change any existing imports that are still used. Keep the `createClient` import for the auth/profile queries (those use the user's own auth context correctly).
  </action>
  <verify>
Run `npx tsc --noEmit --pretty` to confirm no TypeScript errors. Run `npm run build` to verify the page builds successfully. Visually: the dashboard page for a youth user (not in a locked group) should show "Registrerte deltakere" heading with a list of youth names, each with a parent count badge and expandable parent list.
  </verify>
  <done>
Dashboard page fetches all youth and parent data via admin client on server side. The placeholder "under utvikling" text is gone. Youth users see a list of all registered youth with collapsible parent sections. Station selector still appears when groups are locked. Build passes with no errors.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `npm run build` succeeds
3. Dashboard page for youth user (no locked group) shows "Registrerte deltakere" heading with youth list
4. Each youth entry shows parent count badge (e.g., "2 foreldre")
5. Tapping a youth entry expands to show parent names
6. Parent sections are collapsed by default
7. Empty state shown if no youth registered
8. Station selector still works correctly when groups are locked
</verification>

<success_criteria>
- The old "Dashbordet er under utvikling" placeholder is completely replaced
- All registered youth are listed with their linked parent counts
- Collapsible parent details work via native HTML details/summary (no JS required)
- Mobile-first layout with touch-friendly tap targets
- No TypeScript or build errors
</success_criteria>

<output>
After completion, create `.planning/quick/5-replace-youth-waiting-page-with-register/5-SUMMARY.md`
</output>
