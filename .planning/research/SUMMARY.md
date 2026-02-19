# Project Research Summary

**Project:** Buss 2028 Fellesmote-appen
**Domain:** Real-time structured group discussion webapp (World Cafe facilitation)
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

This is a purpose-built single-event facilitation app for ~80 Norwegian users (youth aged 16-18 and parents) rotating through 6 themed discussion stations in a World Cafe format. No existing tool — Slido, GroupMap, Stagetimer, Mentimeter — combines station-based group rotation with real-time free-form chat and countdown timers in one integrated experience. The recommended approach is Next.js 15 (not v14 as the PRD specifies — it reached end-of-life October 2025) with Supabase as the all-in-one backend for auth, PostgreSQL, and real-time WebSocket delivery. The entire stack is well-documented, free-tier sufficient for 80 users, and deployable on Vercel.

The dominant architectural pattern is Server Component shells fetching initial data, paired with Client Component islands that hold Realtime subscriptions and interactive state. All mutations route through Server Actions, never direct client inserts. Real-time message delivery is the central challenge and the highest-risk architectural decision: Supabase Realtime Postgres Changes introduces per-subscriber RLS authorization overhead that becomes a bottleneck at 80 concurrent users. The recommended mitigation is to use Supabase Broadcast for real-time message delivery and direct database INSERTs for persistence — a two-path approach that decouples latency from security.

The top risks are not feature-related but infrastructure-related: subscription channel leaks, auth middleware using `getSession()` instead of `getUser()`, and RLS policies that silently block Realtime delivery. All three must be addressed in Phase 1 (foundation) before any feature work begins, because retrofitting correct patterns is significantly more costly than building them correctly from the start. The app's single-use, single-event nature means over-engineering is the enemy — defer everything not required for the live event.

---

## Key Findings

### Recommended Stack

The PRD targets Next.js 14, but that version reached end-of-life on October 26, 2025, with no further security patches. Use Next.js 15 (^15.5): it is actively supported until October 2026, uses the same App Router paradigm as v14, and requires only two mechanical adaptations (async request APIs and explicit caching). Next.js 16 exists but introduces unnecessary complexity (renamed middleware, Turbopack-only, React Compiler) for a deadline-pressured project. Tailwind CSS v4 is the clear choice for new projects — stable since January 2025, 70% smaller output, and CSS-first configuration. Supabase provides the full backend stack (auth, PostgreSQL, Realtime) on a free tier that comfortably handles 80 concurrent users, eliminating any need for separate services.

**Core technologies:**
- **Next.js ^15.5:** Full-stack React framework (App Router) — supported until Oct 2026, same paradigm as PRD's v14 spec
- **React ^19:** UI library — required by Next.js 15, includes `useActionState` replacing deprecated `useFormState`
- **TypeScript ^5.9:** Type safety — essential for tight timelines; catches bugs at compile time
- **Tailwind CSS ^4.2:** Utility-first styling — v4 stable since Jan 2025, CSS-first config, zero reason to use v3 for a new project
- **Supabase (latest):** Auth + PostgreSQL + Realtime — all-in-one backend; free tier handles ~80 users; eliminates separate backend service
- **@supabase/supabase-js ^2.97:** Core Supabase client — use this, never the deprecated `@supabase/auth-helpers-nextjs`
- **@supabase/ssr ^0.8:** SSR auth helpers for Next.js — provides `createBrowserClient()` and `createServerClient()` for cookie-based auth in App Router

**Do not use:** Next.js 14 (EOL), `@supabase/auth-helpers-nextjs` (deprecated), Socket.IO/Pusher (Supabase Realtime covers all needs), Redux/Zustand (overkill), Prisma/Drizzle (double abstraction over Supabase's typed client), NextAuth.js/Clerk (Supabase Auth is built-in and free).

### Expected Features

No competitor covers the full combination of group rotation + real-time chat + countdown timers. This is a focused tool that does one thing well for one event.

**Must have (table stakes — event cannot run without these):**
- Invite-code registration with role assignment (youth/parent/admin) — frictionless join, no passwords, no email
- Real-time chat per station per group — the core interaction, highest implementation complexity
- Visible countdown timer — synced globally from server timestamp, not client-decremented
- Discussion questions panel — collapsible, per-station static content
- Station and group awareness — users always know where they are in the rotation
- Admin: group management and user assignment — prerequisite for all meeting-day features
- Admin: start/stop/advance meeting — state machine driving the entire event flow
- Mobile-responsive layout with auto-scroll chat — 90%+ of users are on phones
- Message persistence and connection resilience — survive page refreshes and brief signal drops

**Should have (add after core is stable, before event day):**
- Timer warnings (color changes at 5 min / 2 min / 30 sec) — low effort, high impact
- Admin: export chat logs as CSV — the lasting output of the entire event
- Visual rotation indicator — progress dots showing which stations are complete
- Slow mode / rate limiting — insurance against spam from excited teenagers
- Notification sound for new messages — keeps attention during discussion
- Admin: user management view — see who is online, handle latecomers

**Defer to v2+ (only if time permits after P1 and P2 are solid):**
- Pinned messages, anonymous mode toggle, emoji reactions, admin live dashboard

**Confirmed anti-features (do not build):** User accounts with email/password, video/audio calling, direct messages, message editing/deletion by users, file/image upload, threaded conversations, push notifications, i18n framework, offline-first sync, persistent user profiles.

### Architecture Approach

The architecture follows a Server Component shell + Client Component island pattern: page-level Server Components fetch initial data server-side and pass it as props to Client Components that own Realtime subscriptions and interactive state. All mutations flow through Server Actions, never direct client-side inserts. The Supabase client is split into three variants (browser singleton for client components, per-request server client for Server Components and Actions, service-role admin client for privileged operations). Row-Level Security enforces data access at the database level with a defense-in-depth approach — middleware validates auth, layout guards enforce role-based routing, and RLS policies protect individual rows.

**Major components:**
1. **Next.js Middleware (`middleware.ts`)** — auth token refresh on every request; role-based redirects (admin vs participant paths); uses `getUser()` not `getSession()`
2. **Browser Supabase Client (singleton)** — all client-side Realtime subscriptions and direct DB reads filtered by RLS; created once in `lib/supabase/client.ts`
3. **Server Supabase Client (per-request)** — initial page data fetching in Server Components, Server Actions mutations; created via `lib/supabase/server.ts` using `cookies()` from `next/headers`
4. **Server Actions (`lib/actions/`)** — all write operations: send message, start/end station, manage groups, create invite codes; validates business logic before DB write
5. **Custom Realtime Hooks (`lib/hooks/`)** — `useRealtimeMessages`, `useRealtimeSessions`, `useMeetingStatus`, `useCountdown`; each manages subscription lifecycle with cleanup
6. **RLS Policies** — row-level security on all 8 tables; `is_admin()` helper; simple `auth.uid()` comparisons on indexed columns (no JOINs in policies)
7. **Supabase Realtime Channels** — Broadcast for high-frequency chat delivery; Postgres Changes for low-frequency events (group assignment, meeting status)

**Critical architectural constraint:** Supabase Realtime supports only ONE filter column per Postgres Changes subscription (GitHub issue open since 2021, unresolved). Filter by `station_id` at subscription level, then client-side filter by `group_id` in the callback. RLS policies provide the actual security boundary. Alternatively, use Broadcast for message delivery (recommended for performance at 80 users).

**Recommended build order from architecture research:**
1. Foundation: Supabase schema + migrations + three client utilities + middleware + base UI
2. Auth: invite code validation + registration + login + role-based routing
3. Admin panel: user management + group management + invite codes + meeting control
4. Meeting-day core: station chat + Realtime subscriptions + countdown timer + question panel
5. Export and polish: CSV export + read-only mode + mobile polish + error handling

### Critical Pitfalls

1. **Supabase Realtime subscription leaks** — channels accumulate without cleanup, hitting the 100-channel limit and silencing all real-time updates. Always call `supabase.removeChannel(channel)` (not just `channel.unsubscribe()`) in useEffect cleanup. Use a singleton browser client. Add `getChannels().length` diagnostics in development. Must be baked in from Phase 1 — retrofitting is error-prone.

2. **Postgres Changes authorization bottleneck at 80 users** — each INSERT triggers an RLS authorization check for every subscriber: 1 message = 80 auth queries. With JOIN-based RLS policies, messages arrive 2-5 seconds late. Fix: use Supabase Broadcast for real-time message delivery (no per-subscriber auth overhead) and INSERT separately for persistence. This is an architectural decision that must be made in Phase 1 — switching later requires rewriting all subscription code.

3. **Auth middleware using `getSession()` instead of `getUser()`** — `getSession()` reads cookies without validating the JWT signature, allowing tampered sessions to pass auth checks. Combined with the March 2025 Next.js middleware bypass CVE-2025-29927, this is a double vulnerability. Always use `getUser()` in server contexts. Never let middleware be the sole auth check — validate in Server Components and Server Actions too.

4. **Timer drift across 80 devices** — any code that decrements a local counter (`setTimeRemaining(prev => prev - 1)`) will show timers 3-15 seconds apart within 5 minutes due to JavaScript timer imprecision and mobile tab throttling. Fix: store `end_timestamp` on the server, broadcast it once, and have all clients compute `end_timestamp - Date.now()` on each tick. Never decrement a local counter.

5. **RLS policy gaps blocking Realtime or INSERTs** — enabling RLS without defining all required policies blocks all access silently. Every table needs SELECT + INSERT policies minimum; UPDATE needs both `USING` and `WITH CHECK`. RLS and Realtime channel authorization are independent systems — a Realtime subscription filter that doesn't match the RLS SELECT policy causes silent auth failures. Test every policy in the SQL editor using `SET ROLE authenticated` before deployment.

---

## Implications for Roadmap

Based on combined research, the architecture research's recommended build order is well-justified by feature dependencies and pitfall prevention requirements. Five phases are suggested.

### Phase 1: Foundation and Auth

**Rationale:** Everything depends on knowing who the user is and what group they belong to. The Supabase client patterns, middleware auth, and RLS policies must be correct before any feature code is written. The three most critical pitfalls (subscription leaks, getSession() auth, RLS gaps) all manifest in this phase.

**Delivers:** Working Supabase project with schema, three-client pattern, auth middleware using `getUser()`, invite-code registration with roles (youth/parent/admin), login/logout, role-based routing, and base UI primitives (Button, Card, Input, Badge).

**Addresses (from FEATURES.md):** Invite-code registration, role assignment, mobile-responsive layout foundation

**Avoids (from PITFALLS.md):** Auth middleware `getSession()` vulnerability (Pitfall 3), RLS policy gaps (Pitfall 5), subscription leak infrastructure (Pitfall 1 — patterns established here)

**Key decisions to make in this phase:**
- Broadcast vs Postgres Changes for message delivery (architectural commitment)
- RLS policy design (denormalized `group_id` columns vs JOIN-based — choose denormalized)
- Browser client singleton pattern

### Phase 2: Admin Panel

**Rationale:** Group management and user assignment must exist before any meeting-day features work. Admin cannot start a meeting or assign users to stations without groups. Build admin tools before the participant experience.

**Delivers:** Admin dashboard with user management (view all registered users, roles, online status), invite code management (create/revoke codes), group creation and member assignment, meeting start/stop/advance control.

**Addresses (from FEATURES.md):** Admin group management, admin user management, admin start/stop/advance meeting — all P1 table stakes

**Avoids (from PITFALLS.md):** Service role key exposure (server-side only), client-sent user_id impersonation (Server Actions enforce auth.uid())

**Uses (from STACK.md):** Server Actions for all admin mutations, service-role admin client for privileged operations, `supabase gen types` for TypeScript safety

### Phase 3: Meeting-Day Core

**Rationale:** This is the highest-complexity phase containing the critical path feature (real-time chat). Groups must already exist (Phase 2) before chat channels can be scoped. Build all features a participant needs during the live event.

**Delivers:** Station selector dashboard with group-aware routing, real-time chat per station per group (Broadcast delivery + Postgres INSERT persistence), countdown timer synchronized from server `started_at` timestamp, collapsible discussion questions panel, station/group awareness display, auto-scroll chat, end-station flow with group-wide redirect, Realtime subscriptions for meeting status and session state.

**Addresses (from FEATURES.md):** Real-time chat per station per group, visible countdown timer, discussion questions panel, station/group awareness, auto-scroll chat, message persistence, connection resilience — the entire P1 list

**Avoids (from PITFALLS.md):** Subscription leaks (cleanup in every useEffect), Postgres Changes bottleneck (Broadcast for chat delivery), timer drift (server timestamp arithmetic, never decrement), mobile keyboard layout (h-dvh, not h-screen)

**Implements (from ARCHITECTURE.md):** Pattern 1 (Server Component shell + Client Component island), Pattern 2 (Realtime subscription hook with cleanup), Pattern 3 (optimistic UI for chat), Pattern 4 (server-timestamp timer sync)

**Research flag:** This phase is the highest technical risk. If load testing with 20+ simulated users shows message latency above 500ms, revisit the Broadcast vs Postgres Changes decision immediately.

### Phase 4: Polish and Resilience

**Rationale:** After the core meeting flow works end-to-end and is tested, add the features that make the experience resilient and polished. These are all relatively low-effort additions on top of the working core.

**Delivers:** Timer warnings with color changes (green/yellow/red at 5 min/2 min/30 sec), slow mode / rate limiting per user per channel, notification sound for new messages, visual rotation indicator (progress dots), admin user management view with online status, connection status indicator with auto-reconnect banner, optimistic message error state (red "failed to send" with retry, not silent removal).

**Addresses (from FEATURES.md):** All P2 features (timer warnings, visual rotation indicator, slow mode, notification sound, admin user management view)

**Avoids (from PITFALLS.md):** Optimistic UI inconsistency (failed messages show retry UI, not disappear), connection recovery gap (airplane mode test), scroll behavior correctness

### Phase 5: Export and Event Wrap-Up

**Rationale:** Export is needed after the event, not during. It depends on all messages being persisted correctly (Phase 3). Build it last — it's low-risk, low-complexity, and cannot be tested until the meeting has generated data.

**Delivers:** Admin export of all chat logs per station per group as CSV, read-only mode for completed stations, any remaining edge case handling, final mobile QA pass (test on actual iPhone Safari and Android Chrome).

**Addresses (from FEATURES.md):** Admin export chat logs (P2), read-only completed station view

**Uses (from STACK.md):** Server Action calling `export_meeting_data()` SQL function, client-side CSV/Markdown formatting, browser download

**Note:** The "Looks Done But Isn't" checklist from PITFALLS.md should be run in full during this phase before the event.

### Phase Ordering Rationale

- Auth comes before everything because group membership is the security and routing boundary for all features
- Admin tools come before participant features because groups must be configured before the meeting-day experience is testable
- Real-time chat (Phase 3) is built as a single phase rather than split across phases because its components are tightly interdependent (Broadcast channel, subscription hooks, optimistic UI, server-timestamp timer all interact)
- Polish (Phase 4) is separated from core (Phase 3) to ensure the critical path is validated before adding complexity
- Export is last because it only has value after data exists and is highest-confidence to ship quickly

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1 (Foundation):** The Broadcast vs Postgres Changes architectural decision is consequential and should be validated against the specific Supabase Realtime Broadcast API before committing. The key question: can Broadcast be filtered to specific group members by RLS, or does it require application-level routing?
- **Phase 3 (Meeting-Day Core):** Supabase Realtime single-filter limitation and the workaround strategy (filter by `station_id` at subscription, client-filter by `group_id`) should be prototyped early before building the full chat component.

**Phases with standard, well-documented patterns (skip research-phase):**
- **Phase 2 (Admin Panel):** Standard CRUD with Server Actions. Supabase documentation covers all patterns. No novel integration required.
- **Phase 4 (Polish):** Standard UX patterns (timer colors, rate limiting, connection banners). No infrastructure unknowns.
- **Phase 5 (Export):** Standard CSV generation in a Server Action. Well-documented pattern.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry, official docs, and endoflife.date on 2026-02-19. The Next.js 14 EOL finding is definitive and critical. |
| Features | HIGH | Feature decisions grounded in World Cafe facilitation research, competitor analysis (Slido, Mentimeter, GroupMap, Stagetimer), and established chat UX patterns from GetStream. Anti-features are well-reasoned for the specific use case. |
| Architecture | HIGH | Architectural patterns are directly from official Supabase and Next.js documentation. The single-filter Realtime limitation is verified against a confirmed open GitHub issue (#97). |
| Pitfalls | HIGH | All critical pitfalls sourced from official Supabase docs and confirmed GitHub issues. CVE references are real and documented. The Postgres Changes bottleneck is explicitly warned against in official Realtime documentation. |

**Overall confidence: HIGH**

### Gaps to Address

- **Supabase new key format migration:** Supabase is transitioning to new key formats (`sb_publishable_xxx`, `sb_secret_xxx`) for projects created after November 2025. If the project's Supabase instance was created after this date, the environment variable setup differs in name (but not in client code). Verify which format the project's keys use when setting up `.env.local`. (MEDIUM confidence on timeline.)

- **Supabase Broadcast RLS behavior:** The research recommends Broadcast over Postgres Changes for message delivery, but Supabase Broadcast authorization is channel-level (not row-level). This means group isolation for Broadcast messages must be enforced at the application level (correct channel naming per group) rather than by database RLS. This is a known pattern but needs explicit implementation in Phase 1's architectural decisions.

- **Supabase free tier Realtime limits:** Supabase free tier has a limit of 200 concurrent Realtime connections. With 80 users each holding potentially 2-3 active subscriptions (messages, meeting status, session state), the theoretical ceiling is ~240 connections — marginally above the free tier limit. Verify current free tier limits before the event and consider upgrading to the Pro tier ($25/month) as insurance.

---

## Sources

### Primary (HIGH confidence)
- [Next.js endoflife.date](https://endoflife.date/nextjs) — v14 EOL Oct 2025, v15 supported until Oct 2026
- [Next.js v15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15) — breaking changes, async APIs, caching defaults
- [Supabase Auth SSR setup for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — client patterns, middleware, `getUser()` vs `getSession()` warning
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) — subscription patterns, cleanup
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — filter limitations, authorization overhead
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) — 100 channels per connection limit
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy structure, WITH CHECK requirement
- [Tailwind CSS v4 Next.js guide](https://tailwindcss.com/docs/guides/nextjs) — @tailwindcss/postcss setup
- [React docs: useOptimistic](https://react.dev/reference/react/useOptimistic) — optimistic UI patterns
- [GitHub Issue #97: Multi-column filter not supported](https://github.com/supabase/realtime-js/issues/97) — confirmed single-filter limitation

### Secondary (MEDIUM confidence)
- [Supabase API key migration discussion](https://github.com/orgs/supabase/discussions/29260) — new key format timeline
- [Next.js 15 vs 16 comparison](https://www.descope.com/blog/post/nextjs15-vs-nextjs16) — feature differences
- [MakerKit: Next.js + Supabase patterns](https://makerkit.dev/docs/next-supabase/) — production patterns for Server Actions vs API routes
- [Timer sync across clients](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a) — server-timestamp approach validation
- [Mobile keyboard fix with dvh](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport) — `h-dvh` over `h-screen`
- [170+ apps exposed by missing RLS](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — CVE-2025-48757 incident report
- [Stagetimer](https://stagetimer.io/) — countdown timer feature comparison
- [GroupMap facilitation tools](https://www.groupmap.com/online-workshop-facilitation-tools/) — World Cafe pattern comparison
- [GetStream chat UX best practices](https://getstream.io/blog/chat-ux/) — auto-scroll, connection recovery patterns
- [World Cafe method](https://www.facilitator.school/glossary/world-cafe) — facilitation pattern reference

---
*Research completed: 2026-02-19*
*Ready for roadmap: yes*
