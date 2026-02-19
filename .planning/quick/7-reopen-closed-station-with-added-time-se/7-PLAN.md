---
phase: quick-7
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/014_reopen_station.sql
  - src/lib/actions/station.ts
  - src/components/station/ChatRoom.tsx
  - src/components/station/ReopenDialog.tsx
autonomous: true
must_haves:
  truths:
    - "User viewing a completed station can see a Reopen button"
    - "Tapping Reopen shows a dialog with 4 time options (2, 5, 10, 15 min)"
    - "Selecting a time and confirming reopens the station with a new countdown"
    - "Chat input becomes active again after reopening"
    - "Other group members see the station transition to active via realtime"
  artifacts:
    - path: "supabase/migrations/014_reopen_station.sql"
      provides: "reopen_station Postgres function"
      contains: "CREATE OR REPLACE FUNCTION public.reopen_station"
    - path: "src/lib/actions/station.ts"
      provides: "reopenStation server action"
      contains: "export async function reopenStation"
    - path: "src/components/station/ReopenDialog.tsx"
      provides: "Time selection dialog for reopening"
      contains: "ReopenDialog"
    - path: "src/components/station/ChatRoom.tsx"
      provides: "Reopen button in read-only footer"
      contains: "reopenStation"
  key_links:
    - from: "src/components/station/ChatRoom.tsx"
      to: "src/lib/actions/station.ts"
      via: "reopenStation server action call"
      pattern: "reopenStation"
    - from: "src/lib/actions/station.ts"
      to: "supabase/migrations/014_reopen_station.sql"
      via: "supabase.rpc('reopen_station')"
      pattern: "rpc.*reopen_station"
---

<objective>
Add ability to reopen a completed station with a selectable additional time (2, 5, 10, or 15 minutes).

Purpose: During the event, groups may need more discussion time at a station. Currently completed stations are permanently locked. This allows flexible reopening.
Output: New DB function, server action, reopen dialog, and updated ChatRoom UI.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@supabase/migrations/007_station_chat.sql (open_station function pattern)
@supabase/migrations/008_complete_station.sql (complete_station function pattern)
@src/lib/actions/station.ts (existing station actions)
@src/components/station/ChatRoom.tsx (main chat component)
@src/components/ui/Dialog.tsx (existing dialog component -- too simple for radio selection)
@src/components/station/StationHeader.tsx (header with timer)
@src/app/dashboard/station/[sessionId]/page.tsx (station page, passes readOnly/isStarted)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create reopen_station DB function and server action</name>
  <files>
    supabase/migrations/014_reopen_station.sql
    src/lib/actions/station.ts
  </files>
  <action>
    1. Create migration `supabase/migrations/014_reopen_station.sql` with a `reopen_station` Postgres function:
       - Signature: `reopen_station(p_session_id UUID, p_extra_minutes INT) RETURNS JSON`
       - SECURITY DEFINER (same pattern as open_station/complete_station)
       - SELECT FOR UPDATE the session row by p_session_id
       - If session not found -> return `{error: 'Okt ikke funnet'}`
       - If session status != 'completed' -> return `{error: 'Stasjonen er ikke avsluttet'}` (only completed stations can be reopened)
       - Validate p_extra_minutes is one of 2, 5, 10, 15 -> return `{error: 'Ugyldig tid'}` if not
       - Check no OTHER station is active for this group (same check as in open_station):
         `SELECT id FROM station_sessions WHERE group_id = v_session.group_id AND status = 'active' AND id != p_session_id LIMIT 1`
         If found -> return `{error: 'Gruppen har allerede en aktiv stasjon'}`
       - UPDATE the session: `status = 'active'`, `end_timestamp = now() + (p_extra_minutes || ' minutes')::interval`, `completed_at = NULL`
       - RETURNING * INTO v_session, then return `{id, end_timestamp, status}`

    2. Add `reopenStation` server action to `src/lib/actions/station.ts`:
       - Signature: `reopenStation(sessionId: string, extraMinutes: number): Promise<{ endTimestamp?: string; error?: string }>`
       - Auth check (getUser), then get session's group_id, verify membership (same pattern as endStation)
       - Validate extraMinutes is one of [2, 5, 10, 15] on server side too
       - Call `supabase.rpc('reopen_station', { p_session_id: sessionId, p_extra_minutes: extraMinutes })`
       - Return `{ endTimestamp: result.end_timestamp }` on success or `{ error }` on failure

    3. Apply migration: `npx supabase db push` (or `supabase migration up` depending on local setup)
  </action>
  <verify>
    - Migration file exists and has valid SQL syntax
    - `reopenStation` exported from station.ts
    - TypeScript compiles: `npx tsc --noEmit`
  </verify>
  <done>reopen_station DB function and reopenStation server action exist and compile</done>
</task>

<task type="auto">
  <name>Task 2: Create ReopenDialog and integrate into ChatRoom</name>
  <files>
    src/components/station/ReopenDialog.tsx
    src/components/station/ChatRoom.tsx
  </files>
  <action>
    1. Create `src/components/station/ReopenDialog.tsx`:
       - 'use client' component
       - Uses native `<dialog>` element (same pattern as Dialog.tsx in ui/)
       - Props: `open: boolean`, `onClose: () => void`, `onConfirm: (minutes: number) => void`, `loading: boolean`
       - State: `selectedMinutes` defaulting to 5
       - UI: Title "Gjenåpne stasjon?", description "Velg hvor mye ekstra tid gruppen far."
       - 4 radio-style buttons (styled as tappable pills/cards, mobile-first) for 2, 5, 10, 15 min
         - Each shows the number and "min" label, e.g. "2 min", "5 min", "10 min", "15 min"
         - Selected state: `bg-teal-primary text-warm-white`, unselected: `bg-text-muted/10 text-text-primary`
         - Use a horizontal grid `grid grid-cols-4 gap-2` for the 4 options
       - Footer: "Avbryt" (secondary) and "Gjenåpne" (primary) buttons using Button component
       - On confirm click, call `onConfirm(selectedMinutes)`

    2. Update `src/components/station/ChatRoom.tsx`:
       - Import `ReopenDialog` and `reopenStation` from station actions
       - Add state: `showReopenDialog` (boolean), `reopening` (boolean)
       - Add `handleReopen(minutes: number)` async function:
         - Set `reopening = true`
         - Call `reopenStation(sessionId, minutes)`
         - On error: log, set reopening false, return
         - On success: set `localEndTimestamp` to result.endTimestamp, set `started = true` (to exit readOnly rendering), close dialog, set reopening false
         - NOTE: The page was rendered with `readOnly=true` from the server. To make the chat active again after reopen, add a local `localReadOnly` state initialized from the `readOnly` prop. After successful reopen, set `localReadOnly = false`. Use `localReadOnly` throughout instead of the `readOnly` prop.
       - Replace the existing readOnly footer (the "Diskusjonen er avsluttet" bar) with:
         ```tsx
         {localReadOnly ? (
           <div className="px-4 py-3 bg-text-muted/10 border-t border-text-muted/10 flex items-center justify-between">
             <span className="text-sm text-text-muted">Diskusjonen er avsluttet</span>
             <Button variant="primary" size="sm" onClick={() => setShowReopenDialog(true)}>
               Gjenåpne
             </Button>
           </div>
         ) : (
           <ChatInput onSend={handleSend} disabled={!connected} />
         )}
         ```
       - Add `<ReopenDialog>` at the bottom of the component (next to the existing end-station Dialog):
         ```tsx
         <ReopenDialog
           open={showReopenDialog}
           onClose={() => setShowReopenDialog(false)}
           onConfirm={handleReopen}
           loading={reopening}
         />
         ```
       - Also update the StationHeader in the readOnly branch: when localReadOnly is true but we just reopened, pass `onEndStation` and `endTimestamp` properly. Actually, since `localReadOnly` will be false after reopen, the existing active-state rendering already handles this correctly.
       - When `localReadOnly` changes from true to false, the realtime subscription needs to activate. Currently `useRealtimeChat` receives `readOnly` as an option and skips subscription when true. Pass `localReadOnly` instead of the prop: `{ readOnly: localReadOnly, onStationEnded: ... }`. This way, after reopen, the subscription starts automatically.
       - Also pass `localReadOnly` (not the prop) to the StationHeader's `readOnly` prop and the ChatInput conditional.

    Button component check: Verify Button supports a `size` prop. If not, just use smaller padding classes inline: `className="text-xs px-3 py-1.5"` on the Button instead of `size="sm"`.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - Open a completed station page in browser: see "Diskusjonen er avsluttet" with a "Gjenåpne" button on the right
    - Tap "Gjenåpne" -> dialog shows with 4 time pills and confirm/cancel
    - Select a time, confirm -> station reopens, timer appears, chat input is active
  </verify>
  <done>
    - Completed stations show "Gjenåpne" button in the footer
    - Dialog presents 2/5/10/15 minute options as tappable pills
    - Confirming reopens the station: countdown restarts, chat becomes active, messages can be sent
    - Other group members see station transition to active via existing realtime subscription on station_sessions
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit`
2. Navigate to a completed station -> "Gjenåpne" button visible
3. Tap Gjenåpne -> time selection dialog appears with 2, 5, 10, 15 min options
4. Select time and confirm -> station reopens with new countdown
5. Chat input is re-enabled, messages can be sent
6. Dashboard StationSelector shows station as "Aktiv" again (via existing realtime)
7. After new timer expires, station can be ended or timer runs out normally
</verification>

<success_criteria>
- Completed stations can be reopened with 2, 5, 10, or 15 additional minutes
- Reopen is atomic (DB function with FOR UPDATE lock)
- One-active-station-per-group constraint is maintained
- UI transitions cleanly from readOnly to active without page reload
- Mobile-first dialog with easy tap targets for time selection
</success_criteria>

<output>
After completion, create `.planning/quick/7-reopen-closed-station-with-added-time-se/7-SUMMARY.md`
</output>
