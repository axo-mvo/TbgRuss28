---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/015_phone_column.sql
  - src/components/auth/RegisterForm.tsx
  - src/lib/actions/auth.ts
  - src/app/admin/users/page.tsx
  - src/components/admin/UserTable.tsx
autonomous: true
requirements: [QUICK-13]

must_haves:
  truths:
    - "Registration form shows a phone number field (8-digit Norwegian format)"
    - "Phone number is validated as exactly 8 digits before submission"
    - "Phone number is saved to the profiles table during registration"
    - "Admin users page displays phone numbers for registered users"
  artifacts:
    - path: "supabase/migrations/015_phone_column.sql"
      provides: "phone column on profiles table"
      contains: "ALTER TABLE profiles ADD COLUMN phone"
    - path: "src/components/auth/RegisterForm.tsx"
      provides: "Phone input field with 8-digit validation"
      contains: "phone"
    - path: "src/lib/actions/auth.ts"
      provides: "Phone saved during register() action"
      contains: "phone"
  key_links:
    - from: "src/components/auth/RegisterForm.tsx"
      to: "src/lib/actions/auth.ts"
      via: "formData.set('phone', phone)"
      pattern: "formData\\.set\\('phone'"
    - from: "src/lib/actions/auth.ts"
      to: "profiles table"
      via: "admin.from('profiles').insert({...phone})"
      pattern: "phone"
---

<objective>
Add an 8-digit Norwegian phone number field to the registration flow and display it in the admin users overview.

Purpose: Collect member phone numbers during registration for contact/coordination purposes.
Output: Migration file, updated registration form + action, updated admin users page.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@supabase/migrations/001_schema.sql
@src/components/auth/RegisterForm.tsx
@src/lib/actions/auth.ts
@src/app/admin/users/page.tsx
@src/components/admin/UserTable.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add phone column and registration form field</name>
  <files>
    supabase/migrations/015_phone_column.sql
    src/components/auth/RegisterForm.tsx
    src/lib/actions/auth.ts
  </files>
  <action>
1. Create migration `supabase/migrations/015_phone_column.sql`:
   - `ALTER TABLE profiles ADD COLUMN phone TEXT;` (nullable -- existing users don't have one)
   - No constraint on the column itself; validation is client+server side.

2. Update `src/components/auth/RegisterForm.tsx`:
   - Add `const [phone, setPhone] = useState('')` state in the Step 2 fields section.
   - Add a phone input field in Step 2, between the "Fullt navn" field and the "E-post" field:
     ```
     <div>
       <Label htmlFor="phone">Telefonnummer</Label>
       <Input
         id="phone"
         type="tel"
         inputMode="numeric"
         placeholder="8 siffer"
         value={phone}
         onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
         autoComplete="tel"
         maxLength={8}
       />
     </div>
     ```
   - Use `inputMode="numeric"` for mobile number pad and `type="tel"` for semantics.
   - The onChange strips non-digits and caps at 8 chars.
   - Add client-side validation in `handleRegister()` after the email check:
     ```
     if (phone.length !== 8) {
       setError('Telefonnummer må være 8 siffer')
       return
     }
     ```
   - Add `formData.set('phone', phone)` in handleRegister before calling register().

3. Update `src/lib/actions/auth.ts` register() function:
   - Extract phone: `const phone = formData.get('phone') as string`
   - Add server-side validation after the existing required-fields check: if phone is provided, verify `/^\d{8}$/.test(phone)`, else return error 'Telefonnummer må være 8 siffer'.
   - Include phone in the required fields check (add to the `if (!email || !password || !fullName || !inviteCode || !role)` condition -- add `|| !phone`).
   - Add `phone` to the profiles insert: `{ id: authData.user.id, full_name: fullName, email, role, phone }`.
  </action>
  <verify>
    - `npm run build` completes without errors
    - Inspect RegisterForm.tsx for phone state, input field, and 8-digit validation
    - Inspect auth.ts register() for phone extraction, validation, and insertion into profiles
    - Inspect migration file exists with ALTER TABLE statement
  </verify>
  <done>
    Registration form has a phone number field with 8-digit Norwegian validation. Phone is saved to profiles table during registration. Migration file ready to apply.
  </done>
</task>

<task type="auto">
  <name>Task 2: Display phone number in admin users overview</name>
  <files>
    src/app/admin/users/page.tsx
    src/components/admin/UserTable.tsx
  </files>
  <action>
1. Update `src/app/admin/users/page.tsx`:
   - Add `phone` to the profiles select query: change the select string from `id, full_name, email, role, created_at, ...` to include `phone` (i.e., `id, full_name, email, phone, role, created_at, ...`).

2. Update `src/components/admin/UserTable.tsx`:
   - Add `phone: string | null` to the `UserWithLinks` type.
   - **Mobile card view:** Add phone display below the email line (before the registration date):
     ```
     {user.phone && (
       <p className="text-sm text-text-muted mb-1">Tlf: {user.phone}</p>
     )}
     ```
   - **Desktop table view:** Add a "Telefon" column header after "E-post" in the thead.
     Add a matching `<td>` in the tbody row:
     ```
     <td className="py-3 pr-4 text-sm text-text-muted">
       {user.phone || '—'}
     </td>
     ```
  </action>
  <verify>
    - `npm run build` completes without errors
    - UserTable.tsx type includes phone field
    - Both mobile and desktop views render phone data
  </verify>
  <done>
    Admin users page shows phone numbers for all users (mobile cards and desktop table). Users without a phone number show a dash on desktop and nothing on mobile.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with zero errors
- Registration form shows phone field with numeric input and 8-digit validation
- Server action validates and saves phone to profiles table
- Admin users overview displays phone numbers in both mobile and desktop layouts
- Migration file is syntactically correct SQL
</verification>

<success_criteria>
- Phone field appears in registration Step 2 with numeric keyboard on mobile
- Only exactly 8 digits accepted (client and server validation)
- Phone persisted in profiles.phone column on successful registration
- Admin can see phone numbers in the users list
</success_criteria>

<output>
After completion, create `.planning/quick/13-add-phone-number-field-to-registration-8/13-SUMMARY.md`
</output>
