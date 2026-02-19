# Codebase Concerns

**Analysis Date:** 2026-02-19

**Status:** Pre-implementation (PRD phase). This document identifies risks and architectural challenges outlined in the PRD before development begins.

---

## Tech Debt & Design Risks

### 1. Realtime Synchronization Complexity

**Issue:** Heavy reliance on Supabase Realtime across multiple tables without proven error handling strategy.

**Files affected:** `src/components/station/ChatView.tsx`, `src/components/dashboard/StationGrid.tsx`, database schema (stations, messages, station_sessions, meeting_status tables)

**Impact:**
- Network disconnections during chat could leave UI out-of-sync with database
- Subscription cleanup on component unmount not specified
- Multiple concurrent subscriptions (messages, station_sessions, meeting_status) could cause memory leaks if not properly managed
- Realtime events could trigger race conditions when multiple users edit station_sessions simultaneously

**Fix approach:**
- Implement explicit subscription cleanup in useEffect cleanup functions
- Add connection state monitoring and UI feedback for disconnections
- Use optimistic UI updates with rollback on failure for critical operations
- Implement exponential backoff for reconnection attempts
- Test race conditions in group coordination (e.g., two users starting station simultaneously)

---

### 2. Timer Synchronization Across Devices

**Issue:** Timer relies on client-side calculation from `started_at` timestamp without server-side enforcement or drift detection.

**Files affected:** `src/components/station/StationTimer.tsx`, `src/lib/utils.ts` (timer calculation logic)

**Impact:**
- Clock skew between user devices and server could cause different countdowns
- Users with system clock errors could see incorrect timer values
- No way to detect if a user's device clock drifted during a 15-minute session
- Groups could accidentally exceed time limits if some devices show 0:00 but others don't

**Fix approach:**
- Implement server-side timer enforcement: reject messages or mark stationComplete if server-side time has exceeded 15min
- Add periodic time resync: every 60 seconds, fetch current server time and recalibrate local timer
- Display warning if local time drifts >30 seconds from server
- Use `setInterval` with server-time-based calculations, not just elapsed time
- Consider absolute deadline timestamp instead of relative duration

---

### 3. Group Member Authorization Gaps

**Issue:** RLS policies allow reading all groups/members but don't explicitly prevent users from joining groups they're not assigned to.

**Files affected:** `src/lib/supabase/middleware.ts`, database RLS policies (lines 447-451 in PRD)

**Impact:**
- Malicious user could craft API request to join any group and read all messages from other groups
- No RLS policy explicitly prevents users from posting to stations outside their group
- A user could theoretically see all parent-youth links (which is private family data)

**Fix approach:**
- Restrict reading `parent_youth_links` to admins only, plus the users involved
- Verify user's group membership before allowing message inserts: add explicit `and profile_id in (select profile_id from group_members where group_id = messages.group_id)` to messages_insert policy
- Create middleware function `is_in_group(group_id)` for reuse across policies
- Audit all SELECT policies: if reading data, verify user should see it (don't default to "all authenticated")

---

### 4. Invite Code Token Exhaustion

**Issue:** Invite code uses counter-based limits (`uses` vs `max_uses`) without rate limiting or time-window expiration.

**Files affected:** `src/app/register/page.tsx`, database function `validate_invite_code()` (lines 523-543 in PRD)

**Impact:**
- Attacker could exhaust all 50 uses of a code by attempting registrations with invalid data
- No protection against brute force: the PRD doesn't mention rate limiting per IP or per code
- Codes remain active indefinitely if not manually deactivated
- Parent registration phase could fail silently if youth code was exhausted by accident

**Fix approach:**
- Add `expires_at` timestamp to `invite_codes` table, expire codes 24 hours after creation by default
- Implement rate limiting per IP address: max 5 registration attempts per minute
- Add logging to track failed validation attempts and flag suspicious patterns
- Require admin approval before activating parent codes (not automatic)
- When displaying invitation status, show remaining uses

---

### 5. Message Content Validation Inconsistency

**Issue:** Message length limited to 2000 chars in DB constraint but no client-side validation specified, and no XSS protection mentioned.

**Files affected:** `src/components/station/ChatInput.tsx`, database schema line 399

**Impact:**
- Users could paste 4000-char text, see it accepted, then get silent server error
- No mention of sanitizing Markdown or special characters
- If messages are exported as Markdown, users could inject Markdown syntax that corrupts export format
- No mention of HTML escaping in chat display

**Fix approach:**
- Implement client-side character counter in ChatInput, disable send button at 2000 chars
- Sanitize message content on insert: remove/escape Markdown special chars or use HTML escaping
- For export: quote message content or wrap in code blocks if it contains `#`, `##`, etc.
- Use DOMPurify or similar library if rendering user content as HTML
- Test export with messages containing: `#`, `##`, `[link](url)`, `**bold**`, etc.

---

### 6. Admin Role Escalation Vulnerability

**Issue:** PRD specifies "Mulighet til å endre rolle" in admin panel but no audit trail or approval workflow.

**Files affected:** `src/app/admin/users/page.tsx`, `src/lib/supabase/server.ts`

**Impact:**
- Admin could accidentally (or maliciously) grant themselves additional permissions
- No record of who changed a user's role or when
- If admin account is compromised, attacker could create more admins without trace
- No way to audit privilege changes

**Fix approach:**
- Add `role_change_log` table: tracks `admin_id`, `user_id`, `old_role`, `new_role`, `timestamp`, `reason`
- Log all role changes before executing them
- Require second admin approval for role escalation (youth→admin or parent→admin)
- Disable role changes after meeting has started
- Alert all other admins when a new admin is created

---

### 7. Station Session Race Condition

**Issue:** `start_station_session()` function uses `on conflict ... do update` but logic may not handle concurrent calls correctly.

**Files affected:** Database function `start_station_session()` (lines 505-520 in PRD)

**Impact:**
- If two users in a group open the same station simultaneously, both could call start_station_session
- The second call's `coalesce()` logic might still update `started_at` or `status` unintentionally
- All group members see different timers if `started_at` gets updated twice

**Fix approach:**
- Add `FOR UPDATE` lock to prevent race condition: lock the row before updating
- Simplify logic: only set `started_at` if it's NULL, never update after set
- Use single SQL condition: `set started_at = coalesce(station_sessions.started_at, now())`
- Test with concurrent requests using PostgreSQL `pgbench` or similar
- Add test case: two browsers in same group opening station1 within 100ms

---

### 8. Cascade Delete Data Loss

**Issue:** Multiple foreign keys use `on delete cascade` without archive/soft-delete strategy.

**Files affected:** Database schema:
- `profiles` references `auth.users` with cascade (line 344)
- `parent_youth_links` references both `profiles` with cascade (lines 354-355)
- `group_members` references `profiles` and `groups` with cascade (lines 369-370)
- `station_sessions` references `groups` with cascade (line 386)
- `messages` references `profiles`, `stations`, `groups` with cascade (lines 396-398)

**Impact:**
- If a group is deleted, all station_sessions and messages for that group are permanently deleted
- No way to recover meeting notes if group is accidentally deleted
- If a user profile is deleted, all their messages disappear
- After meeting ends, admin might want to delete a user but accidentally lose all their messages

**Fix approach:**
- Replace hard deletes with soft deletes: add `deleted_at` timestamp column to profiles, groups, messages
- Update RLS to filter out soft-deleted records
- Create `archived_meetings` table to preserve meeting exports before data is deleted
- Implement 30-day grace period: users/groups marked deleted but not purged for 30 days
- Require admin confirmation before hard-deleting, with warning about data loss

---

## Known Bugs & Edge Cases

### 9. Missing Station Status for New Groups

**Issue:** When groups are created after meeting starts, they have no `station_sessions` rows.

**Files affected:** `src/components/dashboard/StationGrid.tsx`, admin group creation flow

**Impact:**
- New group members see "No stations available" instead of available stations
- They cannot join any station even though meeting is active
- No clear error message about why group wasn't initialized

**Fix approach:**
- Create trigger: when a new group is inserted and meeting_status = 'active', auto-create 6 station_sessions rows with status='available'
- When meeting starts (admin sets status='active'), iterate all existing groups and ensure they have station_sessions for all 6 stations
- Display helpful message if group has no station_sessions
- Admin dashboard should warn if a group is missing station_sessions

---

### 10. Timer Continues After Station End

**Issue:** When admin marks station as complete or when group manually ends station, timer component may not stop immediately.

**Files affected:** `src/components/station/StationTimer.tsx`, `src/app/dashboard/station/[stationId]/page.tsx`

**Impact:**
- User could be typing message while timer displays "Avslutt stasjon" button, but the Realtime update didn't come through yet
- UI shows timer at 0:00 but subscription hasn't notified about `ended_at` yet
- User presses send, message rejects because `status='completed'` on server

**Fix approach:**
- When station_sessions subscription receives `ended_at` update, immediately disable ChatInput
- Add 500ms debounce on Realtime updates to prevent UI flashing
- Show confirmation toast when station ends: "Stasjon avsluttet" before redirecting
- Cache message draft in localStorage and restore if user returns to station in read-only mode

---

### 11. Export Consistency Issues

**Issue:** `export_meeting_data()` function runs synchronously and could be slow with many messages.

**Files affected:** `src/app/admin/export/page.tsx`, database function `export_meeting_data()` (lines 546-576 in PRD)

**Impact:**
- If thousands of messages exist, export could timeout
- Export happens in transaction that locks tables while running
- No pagination or streaming: entire result set loaded into memory before download
- User has no progress feedback during export generation

**Fix approach:**
- Generate export in background job (if using serverless: use Vercel background functions)
- Show progress indicator: "Exporting 2,341 messages..." with percentage
- Stream Markdown export instead of buffering entire result
- Paginate database query: fetch 1000 messages at a time, append to stream
- Add export timestamp and meeting duration to document header
- Cache exports: store last 5 exports and allow re-download without regenerating

---

## Security Considerations

### 12. Supabase Service Role Key Exposure

**Issue:** `SUPABASE_SERVICE_ROLE_KEY` is required for server-side functions but could be leaked in logs or error messages.

**Files affected:** `src/lib/supabase/server.ts`, Next.js API routes

**Impact:**
- Service role key has unrestricted database access
- If key appears in error logs, entire database is compromised
- Environment variable in `.env.local` is easy to accidentally commit

**Fix approach:**
- Never log service role key or any part of it
- Use Supabase's RLS and avoid service-role-key for user-initiated operations
- For admin-only operations, verify role in RLS policy instead of bypassing with service key
- Rotate key quarterly
- Use GitHub Actions secrets, never check `.env.local` into git
- Add pre-commit hook to prevent `.env.local` commits
- Set up Vercel secrets for production key (different from dev)

---

### 13. CSRF Protection Missing

**Issue:** Form submissions (group creation, code generation, meeting start) don't mention CSRF tokens.

**Files affected:** `src/app/admin/*` pages, admin forms

**Impact:**
- Attacker could trick admin into clicking malicious link that calls API to start/end meeting
- Group could be deleted via CSRF attack
- Invite codes could be generated or disabled without admin's intent

**Fix approach:**
- Next.js 14 handles CSRF for Server Actions by default, but verify it's enabled
- For API routes: use `iron-session` or similar to manage secure tokens
- Never allow GET requests for state-changing operations
- Validate Referer and Origin headers on sensitive endpoints
- Add double-submit cookie validation for extra protection

---

### 14. Rate Limiting for Chat Spam

**Issue:** No rate limiting mentioned for message posting.

**Files affected:** `src/app/api/messages` (if using API routes), Supabase RLS policies

**Impact:**
- User could spam hundreds of messages per second
- Database could be flooded, degrading performance for others
- No protection against automated bots
- Meeting notes would be polluted with spam

**Fix approach:**
- Implement rate limiting: max 5 messages per minute per user per station
- Add cooldown: must wait 2 seconds between messages
- Check in RLS policy using `now() - created_at` on user's last message
- For API routes: use middleware to track request rate per IP/user_id
- Log repeated violations and alert admin
- Implement progressive backoff: increase cooldown if user exceeds limits

---

## Performance Bottlenecks

### 15. Unbounded Message List Loading

**Issue:** ChatView.tsx fetches "all meldinger for stasjon+gruppe" without pagination or windowing.

**Files affected:** `src/components/station/ChatView.tsx`

**Impact:**
- After 3 hours of discussion, a station could have 1000+ messages
- First load fetches all 1000 messages from database
- React renders all 1000 messages in DOM, causing jank
- Memory usage grows linearly with message count
- Mobile browsers could become unresponsive

**Fix approach:**
- Implement virtual scrolling (e.g., `react-window`) to render only visible messages
- Paginate: fetch first 50 messages, then load older on scroll-up
- Limit initial load to last 100 messages, fetch older in batches
- Add loading indicator: "Loading older messages..." when scrolling to top
- Consider archiving messages from completed stations to separate table
- Add database index on `(station_id, group_id, created_at)` for efficient pagination

---

### 16. Expensive Admin Queries

**Issue:** User overview page loads all users with their parent-youth links without filtering or pagination.

**Files affected:** `src/app/admin/users/page.tsx`

**Impact:**
- With 75+ users (25 youth + 50 parents), admin page could load all relationships
- Nested loop to display "Koblet ungdom" for each parent user could be slow
- Admin page could timeout if it does N+1 query pattern

**Fix approach:**
- Add server-side pagination: load 20 users per page
- Use single JOIN query instead of N+1 lookups for parent-youth links
- Implement server-side filtering by role or search term
- Cache profiles list and invalidate on user changes
- Use database view `user_with_links` that pre-joins parent_youth_links

---

### 17. No Database Index on Group Membership Lookups

**Issue:** RLS policies repeatedly check `group_id in (select group_id from group_members where profile_id = auth.uid())`.

**Files affected:** Database schema (lines 411-414), RLS policies for messages, station_sessions, etc.

**Impact:**
- This subquery runs for every message insert/select (potentially 100+ times during meeting)
- Without index on `(profile_id, group_id)`, query must scan entire group_members table
- Under load with 75 users, this could cause significant slowdown

**Fix approach:**
- Index already exists for `idx_group_members_profile` (line 413), but verify it includes group_id
- Add composite index: `create index idx_group_members_profile_group on group_members(profile_id, group_id);`
- Consider caching group membership in session/auth token instead of querying on every operation
- Test query performance: `EXPLAIN ANALYZE` on RLS checks with 75 users

---

## Fragile Areas

### 18. Parent-Child Linking Assumes 1-1 Relationship in UI

**Issue:** PRD states "Mulighet til å endre rolle (f.eks. gjøre noen til admin)" and group assignment but the UI for assigning parents to groups isn't clearly specified.

**Files affected:** `src/app/admin/groups/page.tsx` (group builder UI)

**Impact:**
- Admin must manually assign parent to same group as child, but UI may not make this obvious
- Parent could be assigned to different group than their child
- Meeting discussions split between parent and child if in different groups
- No validation that parents are assigned to same group as their linked children

**Fix approach:**
- Add constraint: when assigning a parent to a group, auto-assign all linked children to same group
- Highlight parent-child pairs in group builder UI
- Disable assigning parent to group if their child isn't in that group
- Add validation: run check before locking groups, report any parent-child mismatches
- Consider forcing: auto-assign all parents to same groups as their children, no manual override

---

### 19. Collapsed Questions Section Loses Content on Scroll

**Issue:** QuestionPanel.tsx has sammenleggbar logic but interaction with sticky positioning or message scrolling not fully specified.

**Files affected:** `src/components/station/QuestionPanel.tsx`

**Impact:**
- If user collapses questions, then scrolls down, questions might re-expand unexpectedly
- State of collapsed/expanded might not persist across navigation back to station
- Sticky header positioning could overlap with chat messages if panel is tall

**Fix approach:**
- Persist collapsed state in `localStorage` keyed by stationId
- Use `useCallback` with dependency on stationId to restore state
- Separate fixed header from scrolling content: keep header (title, timer) fixed, allow questions+messages to scroll
- Test on mobile: ensure questions panel doesn't cover input field
- Add overflow handling: if questions are very long (rare), allow questions panel to scroll internally

---

### 20. No Handling for Connection Loss During Session

**Issue:** If user's internet drops mid-station, they see stale UI but no indication of offline status.

**Files affected:** `src/components/station/ChatView.tsx`, `src/components/station/StationTimer.tsx`, Realtime subscriptions

**Impact:**
- User could spend 2 minutes offline while typing, then message fails to send
- Timer continues counting down locally but server has moved on
- No indication that user is out-of-sync
- Confusing UX: sent message appears in local chat, then disappears on reconnect

**Fix approach:**
- Add online/offline detector: listen to `window.online/offline` events
- Display banner: "Offline – changes won't sync" when offline
- Prevent message sends while offline (disable input button)
- Queue messages in `IndexedDB` and auto-retry when online
- Invalidate local timer and re-fetch station status when reconnecting
- Show toast: "Reconnected – refreshing..." and reload data from server

---

## Missing Critical Features

### 21. No Audit Trail for Meeting Events

**Issue:** No logging of meeting state changes, group creation, or admin actions.

**Files affected:** All admin pages, database operations

**Impact:**
- If something goes wrong during meeting, no way to debug what happened
- Admin cannot verify if a user was in a group at specific time
- Cannot answer: "Was John in Group 1 when it started?"
- If data is lost or corrupted, no forensic trail

**Fix approach:**
- Create `audit_log` table: `admin_id`, `action` (start_meeting, create_group, assign_user), `details` (JSON), `timestamp`
- Log all admin actions: meeting start/end, group creation, user role changes, code generation
- Log system events: station session created, completed, messages in/out
- Implement admin audit view to query logs
- Retain logs for 30 days minimum

---

### 22. No Offline Data Recovery

**Issue:** If meeting is interrupted (app crash, power loss), users lose their chat context.

**Files affected:** `src/components/station/ChatView.tsx`

**Impact:**
- After app crash, user has to reload and loses knowledge of where they were
- Previous messages might not load if database connection is slow
- No quick way to return to active station
- Users on slow connections might lose session state

**Fix approach:**
- Cache current station/group/session in `localStorage` under `current_session` key
- On app load, check `localStorage` for session and auto-navigate if still valid
- Pre-cache last 50 messages from current station in `IndexedDB`
- On first load of station, show cached messages while fetching fresh data
- Notify user if cached data is older than 1 hour

---

### 23. No Accessibility Testing Plan

**Issue:** PRD mentions WCAG AA accessibility but doesn't specify testing approach.

**Files affected:** All UI components

**Impact:**
- Accessible features might not be implemented correctly
- Users with visual impairments could be unable to participate
- Timer announcements might not work in all screen readers
- Color-only status indicators (green/yellow/red) fail for colorblind users

**Fix approach:**
- Use axe DevTools during development to catch accessibility violations
- Test with NVDA (Windows) and VoiceOver (Mac/iOS)
- Implement focus management: when modal/dialog opens, trap focus
- Ensure status changes are announced: use `aria-live="polite"` on timer and station status
- Add text labels alongside color indicators: "Active" not just green
- Test with colorblind simulator: ensure status is distinguishable without relying on color alone
- Create accessibility testing checklist in TESTING.md

---

## Test Coverage Gaps

### 24. Timer Accuracy Not Tested

**Issue:** No mention of how to test timer accuracy under various network conditions.

**Files affected:** `src/components/station/StationTimer.tsx`, test files (not yet created)

**Impact:**
- Timer could drift significantly on slow networks
- No test coverage for clock skew scenarios
- Difficult to debug timer issues in production

**Fix approach:**
- Write integration test: mock `Date.now()` and test timer accuracy
- Test scenarios:
  - Device clock is 30 seconds ahead of server
  - Device clock is 30 seconds behind of server
  - 100ms network latency between client and Realtime subscription
  - Device goes offline for 10 seconds mid-station
- Mock Supabase to return specific `started_at` timestamps
- Assert timer value accuracy within ±1 second over 15-minute period

---

### 25. Realtime Subscription Cleanup Not Tested

**Issue:** No test coverage for properly cleaning up subscriptions on unmount.

**Files affected:** `src/components/station/ChatView.tsx`, `src/components/dashboard/StationGrid.tsx`

**Impact:**
- Memory leaks accumulate if users navigate between stations frequently
- Subscriptions might continue to fire after component unmounts
- In long sessions with 30+ navigation events, memory could become problematic

**Fix approach:**
- Write unit tests for subscription cleanup in React Testing Library
- Mock `supabase.on('postgres_changes').subscribe()` and verify `unsubscribe()` is called
- Use React Profiler to measure memory usage after 50 station navigations
- Implement memory leak test: ensure no lingering event listeners after unmount

---

### 26. Authorization/RLS Not Unit Tested

**Issue:** PRD includes complex RLS policies but no test strategy mentioned.

**Files affected:** Database RLS policies (lines 417-490 in PRD), `src/lib/supabase/` server functions

**Impact:**
- RLS bypass vulnerability could slip through undetected
- Authorization checks might not work as intended in edge cases
- Difficult to debug authorization failures in production

**Fix approach:**
- Write PostgREST/Supabase client tests for each RLS policy
- Test scenarios:
  - User can read own group's messages but not other group's
  - Admin can read all messages
  - User cannot insert message for different user (even if technically in same group)
  - Parent can read their child's messages
- Use Supabase test client with different auth tokens
- Create test fixtures: 2 groups, 2 users per group, then test access patterns

---

## Scaling Limits

### 27. 15-Minute Timer Precision at Scale

**Issue:** With 75 concurrent users in 6 stations, Realtime could be laggy, causing timer drift.

**Files affected:** Supabase Realtime configuration, timer components

**Impact:**
- Timer might lag significantly when many messages flood in
- Groups could see different countdowns if Realtime updates are slow
- User experience degrades with high message volume

**Fix approach:**
- Load test with 75 concurrent users sending messages in 1 station
- Monitor Realtime latency: aim for <500ms subscription updates
- If latency is >1s, consider server-side timer enforcement (admin can see actual time passed)
- Set message batching: if >10 messages pending, batch them in single Realtime update
- Consider: do all 6 stations need Realtime, or could they use polling?

---

### 28. Database Connection Pool Exhaustion

**Issue:** PRD doesn't specify connection pooling strategy for Supabase.

**Files affected:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

**Impact:**
- Each user could open multiple subscriptions, exhausting connection pool
- Under high load, new connections fail with "too many connections" error
- Users unable to join stations during peak time

**Fix approach:**
- Enable Supabase connection pooling in project settings (PgBouncer)
- Monitor active connections in Supabase dashboard
- Implement connection limit: max 1 concurrent subscription per user
- Clean up subscriptions aggressively: unsubscribe when user navigates away
- Load test: simulate 75 users each opening 1 station, verify no connection errors

---

### 29. Export Performance with Large Message Volume

**Issue:** Export runs in a single transaction without streaming or pagination.

**Files affected:** `export_meeting_data()` database function, export button

**Impact:**
- If 1000+ messages exist, export could timeout (30s limit on Vercel functions)
- Memory spike when building large JSON object before converting to Markdown
- User clicks export and gets 504 Gateway Timeout

**Fix approach:**
- Implement streaming export: write to response stream as we fetch data
- Paginate: fetch 500 messages at a time, write to stream, fetch next batch
- Set timeout: show warning if export takes >20 seconds
- Consider: export by station instead of all-at-once
- Test with 5000 messages: measure memory and time

---

## Deployment & Operations

### 30. No Error Monitoring Setup

**Issue:** No mention of error tracking (Sentry, LogRocket, etc.) or production logging.

**Files affected:** All frontend, API routes

**Impact:**
- Runtime errors in production are invisible to developers
- User reports "the app crashed" but no logs to debug
- Realtime disconnections or other issues go unnoticed
- Cannot correlate user issues with code changes

**Fix approach:**
- Integrate Sentry or LogRocket during initial deployment
- Log client-side errors with context (user_id, group_id, station_id)
- Log server-side database errors and slow queries
- Set up alerts: notify team if error rate >1% or specific errors spike
- Create error dashboard to track top issues

---

## Summary Table: Priority & Risk

| Risk Level | Count | Examples |
|-----------|-------|----------|
| **Critical** | 7 | Authorization gaps (#3), Race conditions (#7), Service key exposure (#12), CSRF (#13), Timer drift (#2) |
| **High** | 10 | Realtime complexity (#1), Cascading deletes (#8), Rate limiting (#14), Message pagination (#15) |
| **Medium** | 8 | Invite code limits (#4), Station status gaps (#9), Audit trail (#21), Export performance (#29) |
| **Low** | 5 | Content validation (#5), Timer continuation (#10), Accessibility testing (#23) |

---

*Concerns audit: 2026-02-19*
