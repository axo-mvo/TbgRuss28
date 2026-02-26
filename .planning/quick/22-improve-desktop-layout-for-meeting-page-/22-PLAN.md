---
phase: quick-22
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/meetings/[id]/page.tsx
  - src/app/dashboard/meeting/[id]/page.tsx
  - src/app/dashboard/page.tsx
  - src/app/admin/meetings/page.tsx
  - src/app/admin/page.tsx
autonomous: true
requirements: [QUICK-22]
must_haves:
  truths:
    - "All pages with max-w-lg use responsive width on desktop screens"
    - "Mobile layout remains unchanged (constrained single column)"
  artifacts:
    - path: "src/app/admin/meetings/[id]/page.tsx"
      provides: "Responsive container for admin meeting detail"
      contains: "max-w-5xl"
    - path: "src/app/dashboard/meeting/[id]/page.tsx"
      provides: "Responsive container for participant meeting history"
      contains: "max-w-5xl"
    - path: "src/app/dashboard/page.tsx"
      provides: "Responsive container for participant dashboard"
      contains: "max-w-5xl"
    - path: "src/app/admin/meetings/page.tsx"
      provides: "Responsive container for admin meetings list"
      contains: "max-w-5xl"
    - path: "src/app/admin/page.tsx"
      provides: "Responsive container for admin home"
      contains: "max-w-5xl"
  key_links: []
---

<objective>
Widen all narrow pages on desktop to use available screen width instead of being constrained to a narrow 512px column.

Purpose: Five pages use `max-w-lg` (512px max-width), which looks fine on mobile but wastes enormous horizontal space on desktop. All should expand to fill more of the screen on larger viewports.

Output: All 5 page files updated with responsive max-width that keeps mobile unchanged but expands on md+ screens.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/admin/meetings/[id]/page.tsx
@src/app/dashboard/meeting/[id]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Widen all narrow page containers for desktop</name>
  <files>
    src/app/admin/meetings/[id]/page.tsx
    src/app/dashboard/meeting/[id]/page.tsx
    src/app/dashboard/page.tsx
    src/app/admin/meetings/page.tsx
    src/app/admin/page.tsx
  </files>
  <action>
In all 5 files, change `max-w-lg mx-auto` to `max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto`:

1. **src/app/admin/meetings/[id]/page.tsx** (line 143)
2. **src/app/dashboard/meeting/[id]/page.tsx** (line 200)
3. **src/app/dashboard/page.tsx** (line 145)
4. **src/app/admin/meetings/page.tsx** (line 20)
5. **src/app/admin/page.tsx** (line 9)

This keeps the mobile layout identical (max-w-lg = 32rem/512px on small screens), expands to max-w-3xl (48rem/768px) on md screens (768px+), and max-w-5xl (64rem/1024px) on lg screens (1024px+).

Note: src/app/admin/users/page.tsx already uses max-w-4xl — leave it unchanged.
  </action>
  <verify>
    Run `grep -rn "max-w-lg mx-auto" src/app/` to confirm zero remaining instances of the old narrow pattern.
    Run `grep -rn "max-w-lg md:max-w-3xl" src/app/` to confirm 5 instances of the new responsive pattern.
  </verify>
  <done>
    All 5 pages use responsive container widths: max-w-lg on mobile, max-w-3xl on md, max-w-5xl on lg. Mobile layout unchanged. Desktop layout uses significantly more horizontal space.
  </done>
</task>

</tasks>

<verification>
- `grep -rn "max-w-lg md:max-w-3xl lg:max-w-5xl" src/app/` returns 5 matches
- `grep -rn "max-w-lg mx-auto" src/app/` returns 0 matches (all old patterns replaced)
- Build succeeds without errors
</verification>

<success_criteria>
- All 5 pages with max-w-lg expanded to use available width on desktop (up to 1024px)
- Mobile layout (< 768px) is completely unchanged
- No build errors
</success_criteria>

<output>
After completion, create `.planning/quick/22-improve-desktop-layout-for-meeting-page-/22-SUMMARY.md`
</output>
