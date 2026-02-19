---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/dashboard/page.tsx
  - src/app/admin/page.tsx
autonomous: true
requirements: [QUICK-9]

must_haves:
  truths:
    - "Admin user sees an 'Adminpanel' button on the dashboard"
    - "Tapping the Adminpanel button navigates to /admin"
    - "Admin panel has a 'Tilbake til dashbord' link to return to /dashboard"
    - "Non-admin users (youth, parent) do NOT see the admin button"
  artifacts:
    - path: "src/app/dashboard/page.tsx"
      provides: "Conditional admin panel link for admin role"
      contains: "Adminpanel"
    - path: "src/app/admin/page.tsx"
      provides: "Back to dashboard link from admin panel"
      contains: "/dashboard"
  key_links:
    - from: "src/app/dashboard/page.tsx"
      to: "/admin"
      via: "Next.js Link component"
      pattern: "href.*admin"
    - from: "src/app/admin/page.tsx"
      to: "/dashboard"
      via: "Next.js Link component"
      pattern: "href.*dashboard"
---

<objective>
Add admin panel navigation button to the dashboard for admin users, and a back-to-dashboard link on the admin panel.

Purpose: Admins are also parents and use the dashboard for group/station activity. They need quick access to the admin panel without logging out or manually typing the URL. Likewise, from the admin panel they need to get back to the dashboard.
Output: Updated dashboard page with conditional admin link, updated admin page with back link.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/app/dashboard/page.tsx
@src/app/admin/page.tsx
@src/components/ui/Button.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add admin panel button to dashboard and back link to admin page</name>
  <files>src/app/dashboard/page.tsx, src/app/admin/page.tsx</files>
  <action>
In `src/app/dashboard/page.tsx`:
- Add a conditional admin panel link that renders ONLY when `role === 'admin'`
- Place it between the welcome header section and the group/station content (after the "Du er logget inn som..." paragraph, before the group assignment card)
- Use Next.js `Link` component (already available via `next/link` -- add import if not present)
- Style as a prominent card-style link matching the admin page's card pattern:
  ```
  rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-teal-primary hover:shadow-md transition-all
  ```
- Content: Shield/settings SVG icon + "Adminpanel" heading + subtitle "Administrer brukere, grupper og eksport"
- Wrap in a `{role === 'admin' && ( ... )}` conditional block
- Add `import Link from 'next/link'` at the top imports

In `src/app/admin/page.tsx`:
- Add a "Tilbake til dashbord" link at the top of the page, between the header and the navigation cards
- Use Next.js `Link` (already imported)
- Style as a subtle text link with left arrow: `text-sm text-text-muted hover:text-teal-primary transition-colors`
- Content: "← Tilbake til dashbord" pointing to `/dashboard`
- Place it as the first element after the header div (before the flex flex-col gap-4 div)
  </action>
  <verify>
Run `npx next build` to confirm no TypeScript or build errors. Visually inspect:
1. Dashboard page for admin user shows the admin panel card link
2. Dashboard page for non-admin user does NOT show the link
3. Admin page shows "Tilbake til dashbord" link at the top
  </verify>
  <done>
Admin users see an "Adminpanel" card-link on the dashboard that navigates to /admin. The admin panel page shows a "Tilbake til dashbord" link that navigates back to /dashboard. Non-admin users see no admin-related UI.
  </done>
</task>

</tasks>

<verification>
- Build passes: `npx next build` completes without errors
- Admin conditional: The admin link is wrapped in `role === 'admin'` check
- Navigation works bidirectionally: dashboard -> admin and admin -> dashboard
</verification>

<success_criteria>
- Admin users see "Adminpanel" button on dashboard, non-admins do not
- Clicking the button navigates to /admin
- Admin panel has a back link to /dashboard
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/9-the-admin-role-is-also-a-parent-role-the/9-SUMMARY.md`
</output>
