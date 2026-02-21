---
phase: quick-17
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/actions/admin.ts
  - src/components/admin/UserTable.tsx
  - src/lib/sms/twilio.ts
autonomous: true
requirements: [QUICK-17]

must_haves:
  truths:
    - "Admin taps SMS-kode button, code is generated and shown in result dialog"
    - "Result dialog shows 'Apne SMS' button that opens native SMS app with pre-filled phone + message"
    - "Twilio module no longer exists in the codebase"
    - "No server-side SMS sending occurs -- code is generated and returned, SMS is user-initiated via sms: URI"
  artifacts:
    - path: "src/lib/actions/admin.ts"
      provides: "sendTempAccessCode without Twilio import or sendSms call"
      contains: "return { code, phone: profile.phone }"
    - path: "src/components/admin/UserTable.tsx"
      provides: "SMS result dialog with sms: URI link button"
      contains: "sms:"
  key_links:
    - from: "src/components/admin/UserTable.tsx"
      to: "src/lib/actions/admin.ts"
      via: "sendTempAccessCode returns { code, phone }"
      pattern: "sendTempAccessCode"
    - from: "src/components/admin/UserTable.tsx"
      to: "native SMS app"
      via: "sms: URI in <a> tag"
      pattern: "sms:\\+47"
---

<objective>
Replace Twilio SMS sending with native sms: URI link. Delete the Twilio module entirely. The server action generates the code and returns it; the admin then taps an "Apne SMS" button that opens the native SMS app with pre-filled recipient and message body.

Purpose: Eliminate Twilio dependency and cost. Native sms: URI is simpler, free, and works on all mobile devices.
Output: Modified admin action (no Twilio), updated UserTable with sms: URI button, deleted twilio.ts.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/sms/twilio.ts
@src/lib/actions/admin.ts
@src/components/admin/UserTable.tsx
@src/components/ui/Dialog.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Twilio from server action and delete twilio.ts</name>
  <files>src/lib/actions/admin.ts, src/lib/sms/twilio.ts</files>
  <action>
1. In `src/lib/actions/admin.ts`:
   - Remove the `import { sendSms } from '@/lib/sms/twilio'` line (line 7).
   - In `sendTempAccessCode` function (starts ~line 259):
     - Keep everything up through inserting the code into temp_access_codes (line 303).
     - Remove lines 306-314 (the `sendSms()` call and its error check).
     - Update the return to include the phone number: `return { code, phone: profile.phone }`.
     - Update the return type to `Promise<{ error?: string; code?: string; phone?: string }>`.
     - Update the JSDoc comment to reflect that the code is generated and returned (no SMS sending). Remove mention of "sends via SMS".

2. Delete `src/lib/sms/twilio.ts` entirely.
   - Also check if `src/lib/sms/` directory has any other files. If twilio.ts is the only file, delete the directory too.
  </action>
  <verify>Run `npx tsc --noEmit` -- no type errors. Confirm `src/lib/sms/twilio.ts` does not exist. Grep for "twilio" across codebase to confirm no remaining references.</verify>
  <done>sendTempAccessCode generates code, stores in DB, returns { code, phone } without any SMS sending. Twilio module deleted. No "twilio" references remain in source code.</done>
</task>

<task type="auto">
  <name>Task 2: Update UserTable SMS result dialog with sms: URI button</name>
  <files>src/components/admin/UserTable.tsx</files>
  <action>
1. Update `smsResult` state type to include `phone`:
   - It already has `phone?: string` -- keep as-is.

2. Update `handleSendSmsCode` to capture the returned phone from the action:
   - The action now returns `{ code, phone, error }`.
   - Update: `setSmsResult({ code: result.code, error: result.error, phone: result.phone || smsTarget.phone || undefined })`.
   - This ensures phone is available from the action response (preferred) or falls back to smsTarget.

3. Replace the SMS result `<Dialog>` component (lines 547-558) with a custom `<dialog>` element (because the Dialog component only accepts string description, but we need JSX with an `<a>` tag). Model it after the existing role change dialog pattern already in UserTable.

   The new SMS result dialog should:
   - Use a `useRef<HTMLDialogElement>` (add `smsResultDialogRef`).
   - Add a `useEffect` that calls `.showModal()` when `smsResult` is truthy and `.close()` when null.
   - Display:
     - If error: title "Feil", error message, single "Lukk" button.
     - If success:
       - Title: "Kode opprettet"
       - Show the code prominently: `Koden er: <span class="font-mono font-bold text-lg">{code}</span>`
       - Explanation text: "Trykk knappen under for a apne SMS-appen med ferdigutfylt melding."
       - "Apne SMS" button as an `<a>` tag styled as a prominent teal button:
         ```
         href={`sms:${normalizedPhone}?&body=${encodeURIComponent(smsBody)}`}
         ```
         Where:
         - `normalizedPhone`: prepend `+47` if phone is 8 digits (same normalization as the deleted twilio.ts). Format: if `/^\d{8}$/` test passes, prepend `+47`. If doesn't start with `+`, prepend `+`.
         - `smsBody`: `Din midlertidige tilgangskode for Buss 2028 Fellesmote er: ${code}. Koden er gyldig i 24 timer.`
         - Use `encodeURIComponent()` on the body.
       - Style the `<a>` as: `block w-full text-center min-h-[44px] flex items-center justify-center px-4 py-3 rounded-xl text-white font-medium bg-teal-primary hover:bg-teal-dark transition-colors`
       - Add an SMS icon (inline SVG, simple chat bubble) before the text.
       - Below the SMS button, a secondary "Lukk" button (use Button variant="secondary").

   Phone normalization helper: create a small inline function `normalizePhone(phone: string): string` inside the component or at module level. Logic:
   ```ts
   function normalizePhone(phone: string): string {
     const trimmed = phone.trim()
     if (/^\d{8}$/.test(trimmed)) return `+47${trimmed}`
     if (!trimmed.startsWith('+')) return `+${trimmed}`
     return trimmed
   }
   ```

4. Update the SMS confirmation dialog description (line 541) to say:
   `En 6-sifret kode opprettes for ${smsTarget?.name}. Du kan deretter sende den via SMS.`
   (Remove the implication that it auto-sends.)

5. Update the confirmation dialog title (line 540) to:
   `Opprett tilgangskode for ${smsTarget?.name}?`
  </action>
  <verify>Run `npx tsc --noEmit` -- no type errors. Run `npm run build` -- build succeeds. Visually inspect the dialog structure in the code to confirm sms: URI is correctly formatted.</verify>
  <done>SMS result dialog shows generated code and an "Apne SMS" link/button using `sms:+47XXXXXXXX?&body=encoded_message` format. Confirmation dialog updated to not imply auto-sending. The `<a>` tag ensures native OS handles SMS composition.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `npm run build` succeeds
- No "twilio" references remain in source code (grep confirms)
- `src/lib/sms/twilio.ts` does not exist
- `src/lib/actions/admin.ts` has no sendSms import and sendTempAccessCode returns { code, phone }
- `src/components/admin/UserTable.tsx` contains `sms:` URI in an `<a>` tag
- `src/components/admin/UserTable.tsx` uses `encodeURIComponent` for the SMS body
</verification>

<success_criteria>
- Twilio module completely removed from codebase
- Server action generates code and returns it with phone number (no SMS sending)
- Admin sees code in result dialog with prominent "Apne SMS" button
- sms: URI correctly formatted with +47 prefix and URI-encoded Norwegian message body
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/17-replace-twilio-sms-with-native-sms-uri-f/17-SUMMARY.md`
</output>
