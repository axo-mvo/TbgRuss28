---
phase: quick-22
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/meetings/[id]/page.tsx
  - src/app/dashboard/meeting/[id]/page.tsx
autonomous: true
requirements: [QUICK-22]
must_haves:
  truths:
    - "Admin meeting detail page uses full available width on desktop screens"
    - "Participant meeting history page uses full available width on desktop screens"
    - "Mobile layout remains unchanged (constrained single column)"
  artifacts:
    - path: "src/app/admin/meetings/[id]/page.tsx"
      provides: "Responsive container for admin meeting detail"
      contains: "max-w-5xl"
    - path: "src/app/dashboard/meeting/[id]/page.tsx"
      provides: "Responsive container for participant meeting history"
      contains: "max-w-5xl"
  key_links: []
---

<objective>
Widen the meeting page layout on desktop to use available screen width instead of being constrained to a narrow 512px column.

Purpose: The admin meeting detail page (`/admin/meetings/[id]`) and participant meeting history page (`/dashboard/meeting/[id]`) both use `max-w-lg` (512px max-width), which looks fine on mobile but wastes enormous horizontal space on desktop. The content (header, tabs, station lists, group builder, word cloud, messages) should expand to fill more of the screen on larger viewports.

Output: Both meeting page files updated with responsive max-width that keeps mobile unchanged but expands on md+ screens.
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
  <name>Task 1: Widen meeting page containers for desktop</name>
  <files>
    src/app/admin/meetings/[id]/page.tsx
    src/app/dashboard/meeting/[id]/page.tsx
  </files>
  <action>
In both files, change the inner container div from the narrow mobile-only constraint to a responsive width that scales up on desktop:

**src/app/admin/meetings/[id]/page.tsx** (line 143):
Change: `<div className="max-w-lg mx-auto pt-8">`
To: `<div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pt-8">`

**src/app/dashboard/meeting/[id]/page.tsx** (line 200):
Change: `<div className="max-w-lg mx-auto pt-8">`
To: `<div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pt-8">`

This keeps the mobile layout identical (max-w-lg = 32rem/512px on small screens), expands to max-w-3xl (48rem/768px) on md screens (768px+), and max-w-5xl (64rem/1024px) on lg screens (1024px+).

Do NOT change any other pages (admin list, dashboard, etc.) -- only the two meeting detail/history pages. The other pages are content-light and work fine narrow.
  </action>
  <verify>
    Run `npx next build 2>&1 | tail -20` to confirm no build errors. Then visually confirm by grepping:
    `grep -n "max-w-lg md:max-w-3xl" src/app/admin/meetings/\[id\]/page.tsx src/app/dashboard/meeting/\[id\]/page.tsx`
    Should show both files with the responsive max-width classes.
  </verify>
  <done>
    Both meeting pages use responsive container widths: max-w-lg on mobile, max-w-3xl on md, max-w-5xl on lg. Mobile layout unchanged. Desktop layout uses significantly more horizontal space.
  </done>
</task>

</tasks>

<verification>
- `grep -n "max-w-lg md:max-w-3xl lg:max-w-5xl" src/app/admin/meetings/\[id\]/page.tsx src/app/dashboard/meeting/\[id\]/page.tsx` returns 2 matches (one per file)
- `grep -c "max-w-lg mx-auto" src/app/admin/meetings/\[id\]/page.tsx` returns 0 (old pattern removed)
- Build succeeds without errors
</verification>

<success_criteria>
- Admin meeting detail page (`/admin/meetings/[id]`) expands to use available width on desktop (up to 1024px)
- Participant meeting history page (`/dashboard/meeting/[id]`) expands to use available width on desktop (up to 1024px)
- Mobile layout (< 768px) is completely unchanged
- No build errors
</success_criteria>

<output>
After completion, create `.planning/quick/22-improve-desktop-layout-for-meeting-page-/22-SUMMARY.md`
</output>
