---
phase: quick-23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dashboard/YouthDirectoryView.tsx
  - src/components/dashboard/ContactActions.tsx
autonomous: true
requirements: [QUICK-23]

must_haves:
  truths:
    - "Youth name and phone number appear on the same line in the summary row"
    - "Youth email appears directly under the youth name in the summary (not in expanded section)"
    - "Expanded section visually connects to the card as one cohesive unit with shared border/background"
    - "Parent section has a clear 'Foreldre' label and better visual hierarchy"
    - "Parent contacts mirror youth layout: name + phone on same line, email underneath"
  artifacts:
    - path: "src/components/dashboard/YouthDirectoryView.tsx"
      provides: "Redesigned youth directory cards with connected expansion"
      min_lines: 60
    - path: "src/components/dashboard/ContactActions.tsx"
      provides: "Contact display component with compact variant for inline name+phone layout"
  key_links:
    - from: "src/components/dashboard/YouthDirectoryView.tsx"
      to: "src/components/dashboard/ContactActions.tsx"
      via: "ContactActions component import"
      pattern: "ContactActions"
---

<objective>
Redesign the youth directory expansion card for better visual hierarchy, connected expanded sections, and consistent name+phone+email layout for both youth and parents.

Purpose: The current card has disconnected visual elements - phone is small/detached, email is hidden in expansion, expanded section floats separately from the card, and parent contacts lack hierarchy. This redesign creates a cohesive, scannable contact directory.

Output: Redesigned YouthDirectoryView.tsx and updated ContactActions.tsx
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/dashboard/YouthDirectoryView.tsx
@src/components/dashboard/ContactActions.tsx
@src/components/ui/Badge.tsx

Note: This is a 100% mobile-first app. All touch targets min 44px. Tailwind CSS v4 with @theme directive.

Theme colors:
- teal-primary: #1B4D5C (youth-related accents)
- coral: #E8734A (parent-related)
- text-primary: #1E2D3D
- text-muted: #3A4F5E
- Standard borders: border-gray-200
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add compact phone display variant to ContactActions</name>
  <files>src/components/dashboard/ContactActions.tsx</files>
  <action>
Add a new variant `"compact"` to ContactActions that renders ONLY a tappable phone link (icon + number) suitable for placing inline next to a name on the same line. This is distinct from the existing `"inline"` variant which is too small (text-xs, h-3 icon) and from `"full"` which renders both phone and email as a block.

The compact variant should:
- Render a phone link with `text-sm` text (not text-xs), `h-4 w-4` icon
- Use `text-text-muted` color (not teal) so it reads as contact info, not an action
- Include `hover:text-teal-primary` for interactivity hint
- Have `min-h-[44px]` touch target via padding
- Use `onClick={(e) => e.stopPropagation()}` to prevent details toggle
- Return null if phone is null (same as inline variant behavior)
- Keep `inline-flex items-center gap-1.5` for horizontal alignment

Update the ContactActionsProps variant type to `'full' | 'inline' | 'compact'`.

Do NOT remove the existing `inline` or `full` variants -- they may be used elsewhere.
  </action>
  <verify>grep -n "compact" src/components/dashboard/ContactActions.tsx && npx tsc --noEmit --pretty 2>&1 | tail -5</verify>
  <done>ContactActions has a compact variant that renders a tappable phone number suitable for inline placement next to a name. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Redesign YouthDirectoryView card layout with connected expansion</name>
  <files>src/components/dashboard/YouthDirectoryView.tsx</files>
  <action>
Completely redesign the card structure in YouthDirectoryView.tsx. The key architectural change: wrap each youth in a container div that provides the shared border/background, with both the summary and expanded content INSIDE this container.

**Card container (outer div, replaces bare `<details>`):**
- Wrap `<details>` inside a div with: `rounded-lg border border-gray-200 bg-white overflow-hidden` (overflow-hidden ensures children respect rounded corners)
- The `<details>` element itself should have NO border or background (the wrapper provides it)
- Add `group` class on the details element (keep existing behavior)

**Summary row - LEFT side (youth info block):**
- Line 1: Youth `full_name` as `font-medium text-text-primary text-base` followed by phone via `<ContactActions variant="compact" />` on the SAME line. Use `flex items-center gap-2` to keep them aligned. If no phone, just show the name.
- Line 2: Youth email as `text-sm text-text-muted` directly under the name. Make it a tappable `mailto:` link with `hover:text-teal-primary`. Add `onClick={(e) => e.stopPropagation()}` to prevent details toggle.
- Remove the youth email from the expanded section entirely (it now lives in the summary).

**Summary row - RIGHT side (badge + chevron):**
- Keep existing Badge with parent count and chevron icon, unchanged.
- Summary should use `flex items-start justify-between min-h-[44px] p-3 cursor-pointer hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden`
- Use `items-start` (not items-center) so the badge aligns with the name line while email sits below.

**Expanded section (connected, inside the same border):**
- Use `px-3 pb-3 pt-1` for padding (no pl-4, the outer container border already wraps it).
- Add a thin separator: `border-t border-gray-100` at the top of the expanded section to subtly divide summary from details while keeping them visually connected.
- Remove the old disconnected `pl-4 pt-2 pb-1` styling.

**Parent section inside expanded:**
- Add a "Foreldre" label: `<p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Foreldre</p>`
- Each parent card: use a subtle `bg-gray-50 rounded-md p-2.5` background to visually nest parents.
- Parent layout mirrors youth: name + phone on same line (use `<ContactActions variant="compact" />`), email underneath as `text-sm text-text-muted` mailto link.
- Use `space-y-2` between parent cards.
- Remove the old `border-l-2 border-gray-100` left-line indicator.
- Keep the "Ingen foreldre registrert" empty state.

**Important implementation details:**
- Keep the `key={y.id}` on the outer wrapper div
- Keep all existing data: full_name, phone, email for youth; full_name, phone, email for each parent
- All phone/email links must have `onClick={(e) => e.stopPropagation()}` to prevent toggling the details
- Ensure the chevron rotation animation still works with `group-open:rotate-90`
  </action>
  <verify>npx tsc --noEmit --pretty 2>&1 | tail -5</verify>
  <done>Youth directory cards show name+phone on same line, email under name in summary, expanded section is visually connected within the card border, parents have "Foreldre" label with bg-gray-50 cards matching the youth layout pattern. TypeScript compiles cleanly.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. Visual check: each youth card shows name + phone on one line, email underneath in summary
3. Visual check: expanding a card shows content inside the same rounded border (no gap/disconnection)
4. Visual check: parent section has "Foreldre" label, each parent in a subtle gray card with name+phone on one line, email underneath
5. Tap targets: all phone/email links are at least 44px tall
6. Tapping phone/email links does NOT toggle the card expansion
</verification>

<success_criteria>
- Youth name and phone display on the same summary line
- Youth email displays under name in summary (removed from expanded section)
- Expanded content shares the card border — one cohesive rounded-corner unit
- Parents display with "Foreldre" heading and consistent name+phone/email layout
- All interactive elements have proper touch targets and stopPropagation
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/23-redesign-youth-expansion-card-better-vis/23-SUMMARY.md`
</output>
