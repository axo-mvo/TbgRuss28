# Pitfalls Research

**Domain:** Real-time group discussion webapp (Next.js App Router + Supabase Realtime + ~80 concurrent users)
**Researched:** 2026-02-19
**Confidence:** HIGH (verified against official Supabase docs, GitHub discussions, and multiple community sources)

## Critical Pitfalls

### Pitfall 1: Supabase Realtime Subscription Leaks in React Components

**What goes wrong:**
Channels accumulate without cleanup, hitting the 100-channels-per-connection limit. The app throws `ChannelRateLimitReached` errors and stops receiving real-time updates entirely. In a discussion app with multiple rooms/groups, each navigation between groups creates a new channel subscription. Without cleanup, a user moving between 3-4 groups a few times exhausts the limit within minutes.

**Why it happens:**
React's `useEffect` cleanup is easy to forget or implement incorrectly. React 18 StrictMode runs effects twice in development, which double-subscribes channels. Developers test in dev mode, see it "working" (because the second subscription overwrites the first), then deploy to production where the leaked channels silently accumulate. Navigation in Next.js App Router unmounts and remounts components, compounding the problem.

**How to avoid:**
1. Always call `supabase.removeChannel(channel)` in the useEffect cleanup function -- not just `channel.unsubscribe()`, which leaves the channel object alive.
2. Create the Supabase client as a singleton outside React components (e.g., in a `lib/supabase-browser.ts` module-level variable).
3. Use stable, deterministic channel names based on group/room IDs so the SDK can reuse existing channels.
4. Add a diagnostic check: `console.log('Active channels:', supabase.getChannels().length)` during development to spot leaks early.
5. Call `supabase.removeAllChannels()` on logout and before auth state transitions.

**Warning signs:**
- `supabase.getChannels().length` grows over time without shrinking
- Users report messages stopping after navigating between groups several times
- Browser DevTools shows growing WebSocket frame count
- Console warnings about `ChannelRateLimitReached`

**Phase to address:**
Phase 1 (Foundation/Infrastructure) -- this must be baked into the Supabase client wrapper and custom hook patterns from the very first component. Retrofitting cleanup into existing components is error-prone.

---

### Pitfall 2: Postgres Changes Authorization Bottleneck at 80 Users

**What goes wrong:**
When using Supabase Realtime's Postgres Changes feature (listening for INSERT/UPDATE on a messages table), every change event triggers an RLS authorization check for every subscribed user. With 80 users subscribed to the same discussion channel: 1 INSERT = 80 authorization queries. If those RLS policies involve JOINs (e.g., checking group membership via a junction table), the database becomes the bottleneck. Messages arrive with visible latency (2-5 seconds), or time out entirely.

**Why it happens:**
Postgres Changes processes events on a single thread to maintain ordering. Each event must be individually authorized per subscriber. The documentation explicitly warns: "If your database cannot authorize the changes rapidly enough, the changes will be delayed until you receive a timeout." Developers don't notice this in testing with 2-3 users.

**How to avoid:**
1. Use **Broadcast** instead of Postgres Changes for the real-time message delivery layer. Broadcast does not incur per-subscriber RLS checks on every message.
2. Write messages to the database via a standard INSERT (for persistence), then separately broadcast the message to the channel using `channel.send()`. This decouples persistence from real-time delivery.
3. If you must use Postgres Changes, keep RLS policies simple: use `auth.uid()` comparisons against indexed columns, avoid JOINs, and wrap `auth.uid()` in a subquery to enable PostgreSQL plan caching.
4. Add indexes on every column referenced in RLS policies.

**Warning signs:**
- Messages appear instantly for the sender (optimistic UI) but arrive 2-5 seconds later for other participants
- Database CPU spikes correlate with message volume
- Supabase dashboard shows high Realtime message latency in the Reports tab

**Phase to address:**
Phase 1 (Architecture) -- the choice between Broadcast vs. Postgres Changes is an architectural decision that affects every real-time feature. Switching later requires rewriting all subscription logic.

---

### Pitfall 3: Auth Middleware Trusting getSession() Instead of getUser()

**What goes wrong:**
The middleware uses `supabase.auth.getSession()` to check if a user is authenticated. This reads the session from cookies without revalidating the JWT with Supabase Auth servers. A user with an expired or tampered session cookie passes the middleware check and accesses protected routes. Combined with the March 2025 Next.js middleware bypass vulnerability (CVE-2025-29927), this creates a double layer of insecurity.

**Why it happens:**
`getSession()` is faster (no network round-trip) and many tutorials use it. The official Supabase docs now explicitly warn against this: "Never trust `supabase.auth.getSession()` inside server code such as middleware. It isn't guaranteed to revalidate the Auth token." But older examples and AI-generated code still use it.

**How to avoid:**
1. Use `supabase.auth.getUser()` (or `getClaims()` in newer SDK versions) in middleware -- this validates the JWT against Supabase Auth servers on every request.
2. Never rely solely on middleware for auth. Implement auth verification in Server Components and API routes as well (defense in depth).
3. Configure the middleware matcher to exclude static assets: `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`.
4. Keep `@supabase/ssr` updated to get security patches.

**Warning signs:**
- grep your codebase for `getSession()` in any server-side context
- Users can access protected pages after their session should have expired
- Auth checks only exist in middleware, not in data-fetching functions

**Phase to address:**
Phase 1 (Auth setup) -- auth patterns must be correct from the start. Every subsequent feature inherits the auth pattern established here.

---

### Pitfall 4: Timer Drift -- Clients Running Independent Countdowns

**What goes wrong:**
For a structured meeting app with timed discussion phases, each client runs its own `setInterval` or `setTimeout` countdown. After 5 minutes, different clients show timers that are 3-15 seconds apart. When the facilitator's timer ends, some participants still see time remaining, causing confusion about when to stop speaking.

**Why it happens:**
JavaScript timers are not precise -- `setInterval(fn, 1000)` does not guarantee exactly 1000ms intervals. Browser tab throttling (especially on mobile) makes this worse: inactive tabs may only fire timers every 1-60 seconds. Each client's system clock may differ. The compound effect across 80 devices over a 5-10 minute countdown creates unacceptable divergence.

**How to avoid:**
1. Store the timer's `end_timestamp` on the server (Supabase DB or Broadcast). Broadcast it once to all clients.
2. Clients calculate remaining time as `end_timestamp - Date.now()` on every render tick. Never decrement a local counter.
3. Use `requestAnimationFrame` or a 500ms `setInterval` that recalculates from the server timestamp, not from a local decrement.
4. For the timer start event, use Supabase Broadcast (not Postgres Changes) for minimal latency.
5. Accept that clocks differ by up to 1 second across devices -- this is fine for a meeting timer. Don't over-engineer NTP-like synchronization for this use case.

**Warning signs:**
- Any code that does `setTimeRemaining(prev => prev - 1)` -- this is the drift pattern
- Timer displays differ by more than 2 seconds across devices during testing
- Users on mobile report timers "jumping" when they return to the tab

**Phase to address:**
Phase 2 (Timer/Discussion features) -- but the Broadcast channel infrastructure from Phase 1 must support this. Design the timer as a server-authoritative state machine from day one.

---

### Pitfall 5: RLS Policies That Block Realtime or Break INSERT Operations

**What goes wrong:**
RLS is enabled on the messages table. INSERT operations fail silently or return cryptic "new row violates row-level security policy" errors. Alternatively, messages are inserted successfully but Realtime subscribers never receive them because the SELECT policy doesn't match the subscription filter. In January 2025, 170+ Supabase apps were found with completely disabled RLS (CVE-2025-48757).

**Why it happens:**
Three common mistakes compound:
1. INSERT policies exist but no SELECT policy is defined -- PostgreSQL needs SELECT permission to return the newly inserted row.
2. UPDATE policies use only `USING` but not `WITH CHECK` -- the `USING` clause checks if you can see the row, `WITH CHECK` validates the new values.
3. Realtime Postgres Changes subscription filters (e.g., `filter: 'group_id=eq.abc'`) don't match the RLS SELECT policy conditions, so the authorization check fails silently.

**How to avoid:**
1. For every table with RLS, always create both SELECT and INSERT policies at minimum.
2. For UPDATE, always include both `USING` and `WITH CHECK` clauses.
3. Test RLS policies using Supabase's SQL editor with `SET ROLE authenticated; SET request.jwt.claims = '{"sub":"user-uuid"}'` to simulate actual user access.
4. Use the Supabase Dashboard's "RLS Debugger" (if available) or write explicit test queries for each policy.
5. Keep RLS policies simple: `auth.uid() = user_id` on indexed columns. Avoid JOINs in policies -- use denormalized `group_id` columns instead of joining to a membership table.

**Warning signs:**
- "new row violates row-level security policy" errors in console
- Messages save to the database but other users don't see them in real-time
- Supabase logs show frequent policy check failures
- Any table with RLS enabled but zero policies defined (this blocks ALL access)

**Phase to address:**
Phase 1 (Database schema) -- RLS policies must be written and tested alongside schema creation. They are not a "security layer to add later."

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create problems, especially given the tight timeline.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Disabling RLS during development | Faster iteration, no auth-related errors | Forgetting to re-enable before deploy exposes all data. The CVE-2025-48757 incident affected 170+ apps this way. | Never. Use RLS from day 1 with a service_role client for admin operations. |
| Using Postgres Changes for everything | Simpler mental model (one subscription type) | 80x authorization overhead per message at your user count. Latency degrades noticeably. | Acceptable for low-frequency events (group creation, user joins). Never for chat messages. |
| Client-side timer countdown | Faster to implement, no server coordination needed | Timer drift across 80 devices within minutes. Meeting facilitator and participants out of sync. | Never for shared timers. Fine for purely decorative animations. |
| Skipping optimistic UI | Simpler state management, no rollback logic | Chat feels sluggish -- users see a 200-500ms delay on every message send. Unacceptable for real-time discussion. | Never for message sending. Acceptable for admin actions (create group, start timer). |
| Single Supabase client for server + client | Less boilerplate | Server Components cannot write cookies; auth token refresh breaks. Official docs require separate client/server client factories. | Never. Always use the documented `createBrowserClient` / `createServerClient` pattern. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + Next.js Middleware | Using `getSession()` which reads unvalidated cookies | Use `getUser()` or `getClaims()` which validates JWT against Supabase servers |
| Supabase Realtime + React | Creating channels inside component render (re-created on every render) | Create channels inside `useEffect` with proper cleanup via `removeChannel()` |
| Supabase Realtime + Next.js App Router | Subscribing in Server Components (impossible -- Realtime requires WebSocket on client) | Only use Realtime subscriptions in Client Components (`'use client'`). Server Components fetch initial data; Client Components subscribe for updates. |
| Supabase RLS + Realtime Postgres Changes | Assuming channel `private: true` protects database row access | Channel privacy (Broadcast/Presence) and database RLS are independent systems. Postgres Changes always uses database-level RLS, not channel authorization. |
| Tailwind CSS + Mobile Viewport | Using `h-screen` or `100vh` which doesn't account for mobile keyboard | Use `h-dvh` (dynamic viewport height) which adjusts when the mobile keyboard opens |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Postgres Changes with complex RLS on high-traffic table | Messages delayed 2-5s, database CPU spikes during active discussion | Use Broadcast for message delivery, Postgres Changes only for rare events | ~20+ concurrent users sending messages with JOIN-based RLS policies |
| Re-rendering entire message list on every new message | UI jank, dropped frames, scrollbar jumping | Use React `key` prop correctly, virtualize long lists with `react-window` or similar, append new messages instead of re-fetching the full list | ~200+ messages in a single discussion thread |
| Subscribing to entire table changes without filters | All users receive all changes for all groups, client filters after receipt | Use Postgres Changes filter: `.on('postgres_changes', { filter: 'group_id=eq.xxx' })` to filter at the server level | Immediately -- with 10+ groups, every user processes 10x unnecessary events |
| Multiple Supabase channel subscriptions per component | Exponential channel count as users navigate. 100-channel limit hit within session. | One channel per logical scope (one per group room). Multiplex Broadcast + Presence on same channel. | 5-10 group navigations without cleanup |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled on any table | Complete data exposure. Anyone with the anon key (visible in client JS) can read/write all data. | Enable RLS on every table at creation time. Use the Supabase Dashboard's security advisor. |
| Exposing `service_role` key in client-side code | Full database bypass. The service_role key skips all RLS. | Only use service_role in server-side code (API routes, Server Actions). Store in environment variables prefixed with server-only patterns. |
| Not validating group membership before showing discussion content | Users can view/join discussions they weren't invited to by guessing group IDs | RLS policy: `auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = messages.group_id)` -- but use a denormalized approach for performance. |
| Trusting client-sent user_id in message inserts | Users can impersonate others by sending a different user_id | RLS INSERT policy with `WITH CHECK (auth.uid() = user_id)` forces the user_id to match the authenticated user |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Mobile keyboard pushes entire page up, hiding the message input | Users on phones cannot see what they are typing in the chat input | Use `h-dvh` for the outer container, `position: fixed` or `sticky` for the input area. Test on actual iOS Safari and Android Chrome. |
| No scroll-to-bottom on new messages | Users must manually scroll to see new messages during active discussion | Auto-scroll when user is within ~100px of bottom. Do NOT auto-scroll if user has scrolled up to read history (this is infuriating). |
| Timer shows "0:00" and nothing happens | Users don't know the phase ended, facilitator must verbally announce | Play a sound, show a visual overlay ("Time is up!"), and optionally auto-advance to the next phase. |
| No connection status indicator | Users send messages into the void when their WebSocket disconnects (common on mobile networks) | Show a "Reconnecting..." banner when the Realtime connection drops. Queue messages locally and send when reconnected. |
| Optimistic message appears, then disappears on error | Worse than no optimistic UI -- user thinks their message was sent | Show a red "Failed to send" indicator with a retry button instead of silently removing the message |

## "Looks Done But Isn't" Checklist

- [ ] **Realtime subscriptions:** Cleanup functions exist in every `useEffect` that creates a channel -- verify with `getChannels().length` after navigation
- [ ] **RLS policies:** Every table with RLS enabled has at least SELECT + INSERT policies -- verify by querying as an authenticated user from SQL editor
- [ ] **Auth middleware:** Uses `getUser()` not `getSession()` -- grep the codebase for `getSession` in server contexts
- [ ] **Timer sync:** Timer displays `end_timestamp - now`, not a decremented counter -- verify by opening two browser tabs and comparing after 2 minutes
- [ ] **Mobile input:** Chat input remains visible and usable when the mobile keyboard opens -- test on an actual iPhone (Safari) and Android device
- [ ] **Scroll behavior:** New messages auto-scroll only when already at bottom -- test by scrolling up, having someone send a message, and verifying the scroll position stays put
- [ ] **Connection recovery:** Pull up airplane mode on a phone for 10 seconds, disable it, and verify the client reconnects and shows missed messages
- [ ] **Optimistic UI rollback:** Turn off the network, send a message, verify it shows a "failed" state rather than disappearing silently

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Subscription leaks (TooManyChannels) | LOW | Add `removeChannel()` to useEffect cleanup functions. Call `removeAllChannels()` on page transitions as an interim fix. |
| Postgres Changes bottleneck | HIGH | Requires architectural change from Postgres Changes to Broadcast for message delivery. All subscription code must be rewritten. Plan for this from the start. |
| getSession() in middleware | LOW | Find-and-replace `getSession()` with `getUser()` in server-side code. Add `getUser()` checks in Server Components as defense in depth. |
| Timer drift | MEDIUM | Replace decrement-based timers with timestamp-diff calculation. Requires touching every timer component but the logic change is straightforward. |
| RLS policy gaps | MEDIUM | Audit all tables, add missing policies. May require schema changes (adding denormalized columns) if JOIN-based policies cause performance issues. |
| Mobile keyboard layout breakage | LOW | Replace `h-screen` with `h-dvh` in the root layout. Add `position: sticky` to the input container. 30-minute fix if caught early. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Subscription leaks | Phase 1: Supabase client setup | `getChannels().length` stays constant during navigation testing |
| Postgres Changes bottleneck | Phase 1: Architecture decision | Load test with 20+ simulated users; message latency stays under 500ms |
| Auth middleware using getSession | Phase 1: Auth implementation | Grep for `getSession` in server code returns zero results |
| Timer drift | Phase 2: Timer feature | Two devices show timers within 1 second of each other after 5 minutes |
| RLS policy gaps | Phase 1: Database schema | SQL audit: every RLS-enabled table has SELECT + INSERT + UPDATE policies |
| Mobile keyboard layout | Phase 1: Layout/CSS foundation | Manual test on iPhone Safari with keyboard open -- input stays visible |
| Optimistic UI inconsistency | Phase 2: Chat messaging | Network-off test: failed messages show retry UI, not silent removal |
| Connection recovery | Phase 2: Chat messaging | Airplane mode test: reconnects within 5 seconds, shows missed messages |

## Sources

- [Supabase Realtime Limits (official docs)](https://supabase.com/docs/guides/realtime/limits) -- HIGH confidence
- [Supabase Realtime Troubleshooting (official docs)](https://supabase.com/docs/guides/realtime/troubleshooting) -- HIGH confidence
- [Supabase Postgres Changes (official docs)](https://supabase.com/docs/guides/realtime/postgres-changes) -- HIGH confidence
- [Supabase Realtime Authorization (official docs)](https://supabase.com/docs/guides/realtime/authorization) -- HIGH confidence
- [Supabase Auth with Next.js (official docs)](https://supabase.com/docs/guides/auth/server-side/nextjs) -- HIGH confidence
- [Supabase RLS (official docs)](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [TooManyChannels troubleshooting (official docs)](https://supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error) -- HIGH confidence
- [React StrictMode + Realtime issue (GitHub #169)](https://github.com/supabase/realtime-js/issues/169) -- HIGH confidence
- [Supabase Discussion: Unsubscribe issues with React 18 (#8573)](https://github.com/orgs/supabase/discussions/8573) -- HIGH confidence
- [RLS Misconfigurations (ProsperaSoft)](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) -- MEDIUM confidence
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- MEDIUM confidence
- [170+ Apps Exposed by Missing RLS (ByteIota)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) -- MEDIUM confidence
- [Timer Sync Across Clients (Flowersayo/Medium)](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a) -- MEDIUM confidence
- [Mobile Keyboard Fix with dvh (Francisco Moretti)](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport) -- MEDIUM confidence
- [Optimistic Update Race Conditions in SvelteKit (Dejan Vasic)](https://dejan.vasic.com.au/blog/2025/11/solving-optimistic-update-race-conditions-in-sveltekit) -- LOW confidence (different framework, pattern still applies)

---
*Pitfalls research for: Buss 2028 Fellesmote-appen (real-time group discussion webapp)*
*Researched: 2026-02-19*
