---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/011_parent_invite_codes.sql
  - supabase/migrations/ALL_MIGRATIONS.sql
  - src/lib/actions/auth.ts
  - src/app/dashboard/page.tsx
  - src/components/dashboard/ParentInviteBanner.tsx
autonomous: true
requirements: [QUICK-6-01, QUICK-6-02, QUICK-6-03, QUICK-6-04, QUICK-6-05]
must_haves:
  truths:
    - "Youth without a linked parent sees their unique VOKSEN### invite message on the dashboard"
    - "Youth with a linked parent does NOT see the invite message"
    - "The message includes a clickable SMS link to send the code to parents"
    - "The invite code text is copyable via a copy button"
    - "When a parent registers with code VOKSEN###, they are automatically linked to the youth who owns that code"
  artifacts:
    - path: "supabase/migrations/011_parent_invite_codes.sql"
      provides: "parent_invite_code column on profiles, generate codes for existing youth, trigger for new youth"
      contains: "parent_invite_code"
    - path: "src/components/dashboard/ParentInviteBanner.tsx"
      provides: "Client component showing invite message with SMS link and copy button"
      min_lines: 30
    - path: "src/lib/actions/auth.ts"
      provides: "Updated register function that auto-links parent when VOKSEN### code is used"
      contains: "parent_invite_code"
    - path: "src/app/dashboard/page.tsx"
      provides: "Dashboard conditionally rendering ParentInviteBanner for youth without parents"
      contains: "ParentInviteBanner"
  key_links:
    - from: "src/app/dashboard/page.tsx"
      to: "src/components/dashboard/ParentInviteBanner.tsx"
      via: "conditional render when role=youth and no parents linked"
      pattern: "ParentInviteBanner"
    - from: "src/lib/actions/auth.ts"
      to: "profiles.parent_invite_code"
      via: "lookup youth by parent_invite_code during parent registration"
      pattern: "parent_invite_code"
    - from: "src/components/dashboard/ParentInviteBanner.tsx"
      to: "sms: URI"
      via: "anchor tag with sms: scheme for mobile messaging"
      pattern: "sms:"
---

<objective>
Add a unique parent invite code system for youth. Each youth gets a code (VOKSEN + 3-digit number). When they have no linked parent, the dashboard shows a message they can send (via SMS link or copy) to their parents. When a parent registers using that VOKSEN### code, they are automatically linked to the youth.

Purpose: Streamline parent-youth linking by giving each youth a unique code to share, eliminating the need for parents to manually find and select their child during registration.
Output: DB migration, updated registration logic, and a new dashboard banner component.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/dashboard/page.tsx
@src/lib/actions/auth.ts
@src/components/auth/RegisterForm.tsx
@src/components/dashboard/RegisteredUsersOverview.tsx
@supabase/migrations/001_schema.sql
@supabase/migrations/003_functions.sql
@supabase/migrations/004_seed.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration - add parent_invite_code to profiles</name>
  <files>supabase/migrations/011_parent_invite_codes.sql, supabase/migrations/ALL_MIGRATIONS.sql</files>
  <action>
Create migration `011_parent_invite_codes.sql` that:

1. Adds a `parent_invite_code` TEXT column to `profiles` table with a UNIQUE constraint. This column is nullable (only youth get codes, parents/admins get NULL).

2. Generates codes for ALL existing youth profiles. Use a DO block:
   - Query all profiles where role = 'youth' ordered by created_at
   - Assign each a sequential 3-digit number starting from 100 (so first youth gets VOKSEN100, second VOKSEN101, etc.)
   - UPDATE each profile to set parent_invite_code = 'VOKSEN' || number

3. Creates a trigger function `assign_parent_invite_code()` that fires BEFORE INSERT on profiles:
   - Only acts when NEW.role = 'youth'
   - Finds the max existing numeric suffix from parent_invite_code (extract digits after 'VOKSEN'), defaults to 99 if none exist
   - Sets NEW.parent_invite_code = 'VOKSEN' || (max_number + 1)
   - The trigger ensures new youth automatically get the next sequential code

4. Creates the trigger: `BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION assign_parent_invite_code()`

5. Add an index on parent_invite_code for fast lookup during registration: `CREATE INDEX idx_profiles_parent_invite_code ON profiles(parent_invite_code) WHERE parent_invite_code IS NOT NULL`

After creating the migration file, append the contents to `ALL_MIGRATIONS.sql` with a section header comment.

IMPORTANT: The codes use 3+ digit numbers starting from 100 (not 001). This avoids leading-zero issues and gives room for growth. Format: VOKSEN100, VOKSEN101, ..., VOKSEN999, VOKSEN1000, etc.

Run the migration against Supabase using: `npx supabase db push` or if that is not available, output the SQL so the user can run it manually.
  </action>
  <verify>
Verify by running: `npx supabase db push --dry-run` or checking the SQL is syntactically valid. If the Supabase CLI is not configured for remote push, note this for the user as a manual step.
  </verify>
  <done>
Migration file exists at supabase/migrations/011_parent_invite_codes.sql. ALL_MIGRATIONS.sql is updated. The migration adds parent_invite_code column, backfills existing youth, creates trigger for new youth, and adds an index.
  </done>
</task>

<task type="auto">
  <name>Task 2: Auto-match parent registration and dashboard invite banner</name>
  <files>src/lib/actions/auth.ts, src/components/dashboard/ParentInviteBanner.tsx, src/app/dashboard/page.tsx</files>
  <action>
**A) Update `src/lib/actions/auth.ts` - register function:**

After the existing Step 4 (parent-youth links from youthIds), add a new Step 4b that handles VOKSEN### auto-matching:

- BEFORE Step 1 (before the invite code validation), check if the invite code starts with 'VOKSEN' (case-insensitive).
- If it does:
  1. Look up the youth profile where `parent_invite_code = inviteCode.trim().toUpperCase()`
  2. If no youth found, return error: "Ugyldig foreldrekode. Sjekk koden og prov igjen."
  3. If youth found, store the youth_id for later linking
  4. Override the role to 'parent' (the code implicitly defines the role)
  5. For the actual invite code validation (Step 1), use the standard parent invite code 'FORELDER2028' instead of the VOKSEN### code (since VOKSEN### is not in the invite_codes table, we need to use the real parent code for atomic use-counting)
- In Step 4 (parent-youth links), if we have a stored youth_id from VOKSEN### matching, include it in the links array (in addition to any manually selected youthIds, though typically the VOKSEN flow won't have manual selections)

This approach reuses the existing invite code infrastructure. The VOKSEN### code is a "virtual" code that maps to a youth and triggers the standard FORELDER2028 code for actual registration.

**B) Create `src/components/dashboard/ParentInviteBanner.tsx`:**

A client component ('use client') that receives `inviteCode: string` prop.

The component renders:
- A visually distinct card/banner (use the existing design patterns: rounded-xl, border-2, bg color). Use a warm/attention color like amber/yellow tones to stand out from the teal group card.
- An icon or emoji-free label like "Send til dine foreldre:" at the top
- The full message text: `Registrer deg som deltager pa fellsmotet pa onsdag pa www.russ28.no bruk koden {inviteCode}`
- A clickable SMS button that opens the native SMS app with the message pre-filled:
  `sms:?body=Registrer deg som deltager pa fellsmotet pa onsdag pa www.russ28.no bruk koden {inviteCode}`
  Style as a primary-ish button with text "Send som SMS"
- A "Kopier melding" (copy message) button that uses `navigator.clipboard.writeText()` to copy the full message. Show brief "Kopiert!" feedback using local state with a setTimeout to reset after 2 seconds.
- Both buttons should have min-h-[44px] for mobile touch targets
- Stack buttons vertically on mobile for easy tapping

**C) Update `src/app/dashboard/page.tsx`:**

1. In the profile query (line ~27), also select `parent_invite_code`:
   `.select('full_name, role, parent_invite_code')`

2. Check if the current user is a youth with no linked parent:
   - role === 'youth'
   - Check parent_youth_links for this user: query `parent_youth_links` where `youth_id = user.id` and count > 0 means they have a parent
   - Use the existing `allLinks` data already fetched (line 68-73) to check: `const hasParent = (allLinks ?? []).some(l => l.youth_id === user.id)`

3. If youth with no parent AND has a parent_invite_code, render `<ParentInviteBanner inviteCode={profile.parent_invite_code} />` ABOVE the `<RegisteredUsersOverview>` component in the waiting (non-locked) state.

4. Import the new component at the top of the file.

IMPORTANT: The banner only shows in the "waiting" state (when groups are NOT locked). Once groups are locked and station selector shows, the banner is not needed. This matches the existing conditional structure on lines 116-133.
  </action>
  <verify>
1. `npm run build` completes without errors
2. Visual check: Log in as a youth user. If no parent linked, the invite banner should appear above RegisteredUsersOverview with the correct VOKSEN### code, SMS link, and copy button.
3. Functional check: The SMS link should open native messaging app (on mobile) or show sms: intent. The copy button should copy text and show "Kopiert!" feedback.
4. Registration check: A new parent registering with code VOKSEN### should be created with role=parent and automatically linked to the correct youth.
  </verify>
  <done>
- Youth without a linked parent sees a banner with their unique VOKSEN### code and message
- The banner has working SMS link and copy button
- Parents can register using VOKSEN### which auto-links them to the correct youth
- Youth WITH a linked parent do NOT see the banner
- Build passes with no errors
  </done>
</task>

</tasks>

<verification>
1. Database: `parent_invite_code` column exists on profiles, existing youth have codes, new youth get codes via trigger
2. Dashboard: Youth without parents see the invite banner; youth with parents do not
3. Registration: VOKSEN### code creates parent account and auto-links to correct youth
4. UX: SMS link works on mobile, copy button provides feedback
5. Build: `npm run build` passes cleanly
</verification>

<success_criteria>
- Every youth has a unique VOKSEN### code stored in profiles.parent_invite_code
- Dashboard shows invite message for youth without linked parents, hidden for those with parents
- SMS link opens native messaging with pre-filled message
- Copy button copies message text with "Kopiert!" feedback
- Parent registration with VOKSEN### auto-creates parent_youth_link to correct youth
- No regressions in existing registration or dashboard functionality
</success_criteria>

<output>
After completion, create `.planning/quick/6-youth-parent-invite-code-with-auto-match/6-SUMMARY.md`
</output>
