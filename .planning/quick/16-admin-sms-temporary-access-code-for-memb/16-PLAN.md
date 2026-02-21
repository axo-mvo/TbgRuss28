---
phase: quick-16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/018_temp_access_codes.sql
  - src/lib/sms/twilio.ts
  - src/lib/actions/admin.ts
  - src/lib/actions/auth.ts
  - src/components/admin/UserTable.tsx
  - src/components/auth/LoginForm.tsx
  - src/app/login/page.tsx
  - src/middleware.ts
autonomous: true
requirements: [QUICK-16]
must_haves:
  truths:
    - "Admin can tap a button on a user card to send an SMS temporary access code"
    - "SMS is sent to the user's phone number with a 6-digit code"
    - "User can enter the temporary code on the login page to gain access"
    - "Temporary code expires after 24 hours"
    - "If Twilio env vars are missing, SMS content is logged to console as fallback"
  artifacts:
    - path: "supabase/migrations/018_temp_access_codes.sql"
      provides: "temp_access_codes table"
      contains: "CREATE TABLE temp_access_codes"
    - path: "src/lib/sms/twilio.ts"
      provides: "SMS sending with Twilio + console fallback"
      exports: ["sendSms"]
    - path: "src/lib/actions/admin.ts"
      provides: "sendTempAccessCode server action"
      exports: ["sendTempAccessCode"]
    - path: "src/lib/actions/auth.ts"
      provides: "loginWithCode server action"
      exports: ["loginWithCode"]
    - path: "src/components/admin/UserTable.tsx"
      provides: "Send SMS button on user cards"
    - path: "src/components/auth/LoginForm.tsx"
      provides: "Temporary code login tab/section"
  key_links:
    - from: "src/components/admin/UserTable.tsx"
      to: "src/lib/actions/admin.ts"
      via: "sendTempAccessCode action call"
      pattern: "sendTempAccessCode"
    - from: "src/lib/actions/admin.ts"
      to: "src/lib/sms/twilio.ts"
      via: "sendSms function call"
      pattern: "sendSms"
    - from: "src/components/auth/LoginForm.tsx"
      to: "src/lib/actions/auth.ts"
      via: "loginWithCode action call"
      pattern: "loginWithCode"
    - from: "src/lib/actions/auth.ts"
      to: "temp_access_codes table"
      via: "Supabase query to validate code"
      pattern: "temp_access_codes"
---

<objective>
Add temporary SMS access code feature: admin sends a 6-digit code via SMS to a member who cannot log in. The member enters this code on the login page to get 24-hour temporary access.

Purpose: During meetings, some members may not remember their password. Admin needs a quick way to give them access without resetting passwords.
Output: DB migration, SMS module, admin action + UI button, code-based login flow.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/actions/admin.ts
@src/lib/actions/auth.ts
@src/components/admin/UserTable.tsx
@src/components/auth/LoginForm.tsx
@src/app/login/page.tsx
@src/middleware.ts
@src/lib/supabase/admin.ts
@src/lib/supabase/server.ts
@supabase/migrations/001_schema.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration + SMS module + server actions</name>
  <files>
    supabase/migrations/018_temp_access_codes.sql
    src/lib/sms/twilio.ts
    src/lib/actions/admin.ts
    src/lib/actions/auth.ts
  </files>
  <action>
**1. Create migration `supabase/migrations/018_temp_access_codes.sql`:**

```sql
CREATE TABLE temp_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast code lookup
CREATE INDEX idx_temp_access_codes_code ON temp_access_codes(code);
CREATE INDEX idx_temp_access_codes_user_id ON temp_access_codes(user_id);

-- Enable RLS (admin client bypasses RLS, so no policies needed for now)
ALTER TABLE temp_access_codes ENABLE ROW LEVEL SECURITY;
```

**2. Create SMS module `src/lib/sms/twilio.ts`:**

Export a `sendSms(to: string, body: string): Promise<{ success: boolean; error?: string }>` function.

- Check if `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` env vars exist.
- If all present: use Twilio REST API directly via `fetch` (POST to `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`) with Basic auth header (base64 of `accountSid:authToken`), form-urlencoded body with `To`, `From`, `Body`. Norwegian numbers need +47 prefix -- prepend if `to` is 8 digits without prefix.
- If env vars missing: `console.log('[SMS FALLBACK]', { to, body })` and return `{ success: true }` (so the flow still works in dev).
- Do NOT install the twilio npm package -- use raw fetch to avoid dependency bloat.

**3. Add `sendTempAccessCode` to `src/lib/actions/admin.ts`:**

```typescript
export async function sendTempAccessCode(
  userId: string
): Promise<{ error?: string; code?: string }>
```

- Call `verifyAdmin()` first (existing pattern).
- Use `createAdminClient()` to look up the user's profile (full_name, phone) from `profiles` where `id = userId`.
- If no phone number: return `{ error: 'Brukeren har ikke registrert telefonnummer' }`.
- Generate a random 6-digit numeric code: `Math.floor(100000 + Math.random() * 900000).toString()`.
- Set `expires_at` to `new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()`.
- Invalidate any existing unused codes for this user: `UPDATE temp_access_codes SET used = true WHERE user_id = userId AND used = false`.
- Insert new row into `temp_access_codes` with `user_id`, `code`, `expires_at`.
- Call `sendSms(phone, 'Din midlertidige tilgangskode for Buss 2028 Fellesmoete er: ${code}. Koden er gyldig i 24 timer.')` -- use proper Norwegian characters in the message.
- If SMS fails: return `{ error: 'Kunne ikke sende SMS' }`.
- Return `{ code }` on success (admin sees the code as confirmation/backup in case SMS doesn't arrive).
- Do NOT revalidatePath -- no page data changes.

**4. Add `loginWithCode` to `src/lib/actions/auth.ts`:**

```typescript
export async function loginWithCode(code: string): Promise<{ error?: string }>
```

- Validate code is 6 digits.
- Use `createAdminClient()` to query `temp_access_codes` where `code = trimmedCode`, `used = false`, `expires_at > now()`. Join with `profiles` to get `email`.
- If no match: return `{ error: 'Ugyldig eller utlopt kode' }`.
- Mark code as used: `UPDATE temp_access_codes SET used = true WHERE id = codeRow.id`.
- Use admin client to generate a magic link / sign-in: Call `admin.auth.admin.generateLink({ type: 'magiclink', email: userEmail })` to get a token. Then on the server-side Supabase client, use `supabase.auth.verifyOtp({ token_hash: properties.hashed_token, type: 'magiclink' })` to establish the session.
- If sign-in fails, return `{ error: 'Kunne ikke logge inn. Prov igjen.' }`.
- On success: `revalidatePath('/', 'layout')` then `redirect('/dashboard')` (outside try/catch per project convention).
  </action>
  <verify>
- `npx tsc --noEmit` passes (no type errors)
- `npm run build` succeeds
- Migration SQL is valid syntax
  </verify>
  <done>
- temp_access_codes table migration exists
- sendSms function works with Twilio or falls back to console.log
- sendTempAccessCode generates code, stores in DB, sends SMS
- loginWithCode validates code, signs user in, redirects to dashboard
  </done>
</task>

<task type="auto">
  <name>Task 2: Admin UI button + login page code entry</name>
  <files>
    src/components/admin/UserTable.tsx
    src/components/auth/LoginForm.tsx
    src/app/login/page.tsx
    src/middleware.ts
  </files>
  <action>
**1. Add SMS button to `src/components/admin/UserTable.tsx`:**

- Import `sendTempAccessCode` from `@/lib/actions/admin`.
- Add state: `const [smsTarget, setSmsTarget] = useState<{ id: string; name: string; phone: string | null } | null>(null)` and `const [smsResult, setSmsResult] = useState<{ code?: string; error?: string } | null>(null)`.
- In the mobile card view, add a third button "Send SMS-kode" (SMS icon) between "Endre rolle" and "Slett" in the action buttons div. Only show this button if `user.phone` exists. Use teal-primary color styling matching the "Endre rolle" button pattern. Add `onClick={(e) => { e.stopPropagation(); setSmsTarget({ id: user.id, name: user.full_name, phone: user.phone }); }}`.
- In the desktop table view, add the same "SMS-kode" button in the actions column.
- Add a confirmation Dialog (using the existing Dialog component pattern) that shows when `smsTarget` is set:
  - Title: `Send tilgangskode til ${smsTarget.name}?`
  - Description: `En 6-sifret kode sendes via SMS til ${smsTarget.phone}. Koden er gyldig i 24 timer.`
  - Confirm label: "Send kode"
  - On confirm: call `sendTempAccessCode(smsTarget.id)`, store result in `smsResult`.
- After the action completes, show a result dialog:
  - If success: show "Kode sendt!" with the code displayed prominently (in case SMS doesn't arrive, admin can read it aloud). Format: "Koden er: **{code}**. Den er sendt til {phone} via SMS."
  - If error: show the error message.
  - Single "Lukk" button to dismiss.

**2. Update `src/components/auth/LoginForm.tsx`:**

- Add a tab/toggle at the top to switch between "E-post" (default) and "Tilgangskode" login modes. Use two buttons in a flex row with underline/active state styling (similar to segment control). State: `const [mode, setMode] = useState<'email' | 'code'>('email')`.
- When mode is 'code', show a single input field for the 6-digit code (type="text", inputMode="numeric", pattern="[0-9]*", maxLength={6}, placeholder="6-sifret kode", text-base for iOS zoom prevention). Style the input with `text-center text-2xl tracking-[0.5em] font-mono` for a code-entry feel.
- Import and call `loginWithCode` from `@/lib/actions/auth`.
- The "Logg inn" button calls `loginWithCode(code)` when in code mode.
- Keep the existing email/password form unchanged when mode is 'email'.
- Add a small help text under the code input: "Skriv inn koden du mottok pa SMS" (with proper Norwegian characters).

**3. Update `src/middleware.ts`:**

No changes needed -- `/login` is already a public route in the `publicRoutes` array, so the code login route is already accessible.

**4. No changes to `src/app/login/page.tsx`:**

The page renders LoginForm which handles both modes internally. No page-level changes needed.
  </action>
  <verify>
- `npm run build` succeeds
- Visit `/admin/users` -- SMS button visible on user cards with phone numbers
- Visit `/login` -- toggle between email and code modes works
  </verify>
  <done>
- Admin sees "Send SMS-kode" button on each user card (only if user has phone)
- Tapping button shows confirmation, then sends code and shows result with the code
- Login page has a toggle for "Tilgangskode" mode with 6-digit code input
- Entering a valid code logs the user in and redirects to /dashboard
  </done>
</task>

</tasks>

<verification>
1. `npm run build` passes with no errors
2. TypeScript compilation clean (`npx tsc --noEmit`)
3. Admin panel shows SMS button for users with phone numbers
4. Login page has working email/code toggle
5. Full flow: admin sends code -> user enters code -> user logged in
</verification>

<success_criteria>
- Admin can send a temporary 6-digit SMS access code to any member with a phone number
- Code is stored in temp_access_codes table with 24-hour expiry
- SMS sent via Twilio (or logged to console if env vars missing)
- Admin sees the code in UI as backup
- User can use the code on the login page to authenticate
- Code is single-use (marked as used after login)
- Previous unused codes for the same user are invalidated when a new one is generated
- All UI is in Norwegian, mobile-first design
</success_criteria>

<output>
After completion, create `.planning/quick/16-admin-sms-temporary-access-code-for-memb/16-SUMMARY.md`
</output>
