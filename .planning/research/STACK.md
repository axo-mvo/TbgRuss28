# Stack Research

**Domain:** Real-time group discussion webapp (small-scale, single-event)
**Researched:** 2026-02-19
**Confidence:** HIGH

## Critical Finding: Next.js 14 is End-of-Life

The PRD specifies Next.js 14, but Next.js 14 reached end-of-life on 2025-10-26 and no longer receives security patches. The latest v14 release is 14.2.35. **Do not start a new project on Next.js 14.**

**Recommendation: Use Next.js 15 (latest 15.5.x).** Next.js 15 is in active security support until 2026-10-21, giving this project an 8-month runway. It uses the same App Router patterns as v14 with manageable breaking changes (async request APIs, changed caching defaults). Next.js 16 exists (16.1.6) but introduces more disruptive changes (middleware renamed to proxy.ts, React Compiler, Turbopack-only) that are unnecessary complexity for a time-pressured project.

Similarly, Tailwind CSS v4 is now stable and the clear choice for new projects over v3.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | ^15.5 | Full-stack React framework (App Router) | Supported until Oct 2026. Same App Router paradigm as v14 but with security patches. Async APIs and explicit caching are the main changes from v14 -- small adaptation for a new project. Vercel deployment is seamless. |
| React | ^19 | UI library | Required by Next.js 15. Includes `use()` hook for unwrapping promises in client components, `useActionState` for forms. Stable and well-documented. |
| TypeScript | ^5.9 | Type safety | Latest stable (6.0 is in beta). Full Next.js 15 integration. Catches bugs at compile time, essential for a project with tight timeline. |
| Tailwind CSS | ^4.2 | Utility-first styling | v4 is production-stable since Jan 2025. CSS-first config (@theme instead of tailwind.config.js), 70% smaller output than v3, automatic content detection. Zero reason to use v3 for a new project. |
| Supabase (platform) | Latest | Auth + PostgreSQL + Realtime | All-in-one backend: authentication, database, real-time subscriptions. Free tier handles ~80 users easily. Eliminates need for separate backend service. |

**Confidence: HIGH** -- Versions verified against npm registry, Next.js endoflife.date, and official docs (2026-02-19).

### Supabase Client Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@supabase/supabase-js` | ^2.97 | Core Supabase client (Auth, DB queries, Realtime) | Actively maintained (updated hours ago). Stable v2 API. Handles all Supabase interactions from both client and server. |
| `@supabase/ssr` | ^0.8 | Server-side rendering auth helpers for Next.js | Official replacement for deprecated @supabase/auth-helpers-nextjs. Provides `createBrowserClient()` and `createServerClient()` for proper cookie-based auth in App Router. Required for middleware auth refresh. |

**Confidence: HIGH** -- Versions verified on npm (2026-02-19).

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tailwindcss/postcss` | ^4.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 integration with Next.js. Replaces the old `tailwindcss` PostCSS plugin. |
| `postcss` | ^8.5 | CSS transformation pipeline | Required peer dependency for @tailwindcss/postcss. |

**Confidence: HIGH** -- Verified via official Tailwind CSS Next.js setup guide.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `eslint` + `eslint-config-next` | Linting | Included by create-next-app. Next.js-specific rules catch common mistakes (missing Image alt, incorrect Link usage). |
| `@types/react` + `@types/react-dom` | React type definitions | Must match React 19. Included by create-next-app with TypeScript. |
| Supabase CLI (`supabase`) | Local development, migrations | Optional but recommended. Enables `supabase db push` for schema management and local Supabase instance for development. Install globally: `npm install -g supabase`. |

## Installation

```bash
# Create the project (installs Next.js 16 by default, then pin to 15)
npx create-next-app@latest tbg-russ28 --typescript --eslint --app --tailwind

# Pin Next.js to v15 (create-next-app installs latest which is v16)
cd tbg-russ28
npm install next@15 react@19 react-dom@19

# Install Supabase client libraries
npm install @supabase/supabase-js @supabase/ssr

# Tailwind v4 setup (create-next-app may scaffold v3 config)
# If so, follow Tailwind v4 upgrade:
npm install tailwindcss@latest @tailwindcss/postcss postcss

# Dev dependencies (should already be present from create-next-app)
npm install -D @types/react @types/react-dom typescript eslint eslint-config-next
```

**Alternative: Manual setup (recommended for control)**

```bash
mkdir tbg-russ28 && cd tbg-russ28
npm init -y

# Core
npm install next@15 react@19 react-dom@19

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Styling
npm install tailwindcss@latest @tailwindcss/postcss postcss

# Dev
npm install -D typescript @types/react @types/react-dom eslint eslint-config-next

# Supabase CLI (global, for migrations)
npm install -g supabase
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15 | Next.js 16 (16.1.6) | If starting a project with 1+ year timeline. v16 has Turbopack default, React Compiler, renamed middleware. More future-proof but more to learn. For a days-away deadline, 15 is safer. |
| Next.js 15 | Next.js 14 (14.2.35) | Never for a new project. EOL since Oct 2025. No security patches. |
| Tailwind CSS v4 | Tailwind CSS v3.4 | Only if using a UI component library that requires v3 (check compatibility first). Most libraries support v4 now. |
| @supabase/ssr | @supabase/auth-helpers-nextjs | Never. auth-helpers is deprecated. All fixes go to @supabase/ssr. |
| Supabase Realtime | Socket.IO / Pusher | If you need features Supabase Realtime lacks (e.g., presence channels with complex state, rooms). For this project, Supabase Realtime postgres_changes covers all needs and avoids an extra dependency. |
| Raw Tailwind | shadcn/ui component library | If building a larger app with complex UI patterns (data tables, command palettes, sheets). For this project with ~10 pages and straightforward chat UI, raw Tailwind utilities are simpler and avoid the overhead of configuring a component library. |
| No state management | Zustand / Jotai | If you had complex cross-component state. This app's state is mostly server data (Supabase queries) + local UI state (timer, input). React's built-in useState/useContext is sufficient. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated. No bug fixes. Will eventually break with newer Supabase versions. | `@supabase/ssr` ^0.8 |
| Next.js 14 | EOL since Oct 2025. No security patches. Using it for a new project is irresponsible. | Next.js ^15.5 |
| Tailwind CSS v3 for new projects | v4 is stable, faster, smaller output, better DX. No reason to start with v3. | Tailwind CSS ^4.2 |
| Socket.IO / Pusher / Ably | Adds external dependency when Supabase already includes Realtime. Extra cost, complexity, and another point of failure for a feature Supabase handles natively. | Supabase Realtime (included) |
| Redux / MobX | Massive overkill for ~80 users, ~10 pages, server-driven data. Adds boilerplate and learning curve. | React useState + useContext + Supabase client queries |
| Prisma / Drizzle ORM | Adds an abstraction layer on top of Supabase's already-typed client. Supabase JS client with generated types is sufficient and avoids double-abstraction. | `@supabase/supabase-js` with `supabase gen types` |
| NextAuth.js / Clerk | Supabase Auth is built-in and free. Adding another auth provider creates integration headaches and costs money. | Supabase Auth (included) |
| CSS Modules / styled-components | Splits styling across files, harder to maintain, no utility-first benefits. Tailwind is already in the stack. | Tailwind CSS |
| `@next/font` package | Removed in Next.js 15. | `next/font` (built-in) |
| `useFormState` | Deprecated in React 19. | `useActionState` |

## Stack Patterns by Variant

**For Supabase client creation:**
- Browser (client components): Use `createBrowserClient()` from `@supabase/ssr`
- Server components: Use `createServerClient()` from `@supabase/ssr` with cookies
- Middleware: Use `createServerClient()` with request/response cookie handling
- Route handlers: Use `createServerClient()` with cookies from `next/headers`
- Server actions: Use `createServerClient()` with cookies from `next/headers`

**For real-time subscriptions (chat messages):**
- Must be in client components (`'use client'`)
- Use `supabase.channel('channel-name').on('postgres_changes', ...)` pattern
- Filter by `station_id` and `group_id` for scoped updates
- Clean up with `supabase.removeChannel()` in useEffect cleanup
- Cannot filter DELETE events in postgres_changes (Supabase limitation)

**For the countdown timer:**
- Client-side only (no server push needed)
- Calculate from `station_sessions.started_at` server timestamp
- Use `setInterval(1000)` for countdown
- No external timer library needed -- simple arithmetic

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next@15` | `react@19`, `react-dom@19` | Next.js 15 requires React 19. Do not use React 18. |
| `@supabase/ssr@0.8` | `@supabase/supabase-js@2.x` | Must use supabase-js v2. ssr v0.8 does not work with v1. |
| `tailwindcss@4.2` | `@tailwindcss/postcss@4.2`, `postcss@8.x` | Tailwind v4 requires its own PostCSS plugin, not the old `tailwindcss` PostCSS entry. |
| `next@15` | `tailwindcss@4.x` | Fully compatible. Official Tailwind docs show Next.js setup with v4. |
| `next@15` | `eslint-config-next@15` | Match major versions. |
| `typescript@5.9` | `next@15`, `react@19` | Latest stable TS. 6.0 is beta -- do not use in production. |

## Key Migration Notes from PRD's v14 Spec

The PRD was written targeting Next.js 14. The following patterns from the PRD need adaptation for Next.js 15:

1. **Async request APIs**: `cookies()`, `headers()`, `params`, `searchParams` must be awaited. The PRD's middleware and server-side code patterns need `await` added. This is straightforward.

2. **Caching defaults changed**: Fetch requests are no longer cached by default in v15. For this app this is actually better -- real-time data should not be cached.

3. **`useFormState` -> `useActionState`**: If any server actions use form state, use the React 19 API.

4. **Middleware pattern unchanged**: The `src/middleware.ts` pattern for auth refresh works identically in v15. The Supabase SSR docs show the v15-compatible pattern.

5. **App Router unchanged**: Route structure, layouts, loading states, error boundaries -- all work the same. The PRD's directory structure is fully valid.

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

**Note on Supabase key migration:** Supabase is transitioning to new key formats (`sb_publishable_xxx` replacing anon key, `sb_secret_xxx` replacing service_role key). New Supabase projects created after Nov 2025 use the new format. The client libraries accept both formats transparently -- no code changes needed, just use whichever key format your project provides.

**Confidence: MEDIUM** -- Key migration timeline verified via GitHub discussion, but exact enforcement dates for existing projects are unclear.

## Sources

- [Next.js endoflife.date](https://endoflife.date/nextjs) -- v14 EOL Oct 2025, v15 supported until Oct 2026, v16.1.6 latest (HIGH confidence)
- [Next.js v15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15) -- Breaking changes, async APIs, caching (HIGH confidence)
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.97.0 latest (HIGH confidence)
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) -- v0.8.0 latest (HIGH confidence)
- [Supabase Auth SSR setup for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- Client patterns, middleware (HIGH confidence)
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) -- Subscription patterns (HIGH confidence)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- Filter limitations (HIGH confidence)
- [Tailwind CSS v4 Next.js guide](https://tailwindcss.com/docs/guides/nextjs) -- Setup with @tailwindcss/postcss (HIGH confidence)
- [Tailwind CSS v4 releases](https://github.com/tailwindlabs/tailwindcss/releases) -- v4.2.0 latest (HIGH confidence)
- [TypeScript releases](https://github.com/microsoft/typescript/releases) -- v5.9 stable, v6.0 beta (HIGH confidence)
- [Supabase API key migration discussion](https://github.com/orgs/supabase/discussions/29260) -- New key format timeline (MEDIUM confidence)
- [Next.js 15 vs 16 comparison](https://www.descope.com/blog/post/nextjs15-vs-nextjs16) -- Feature differences (MEDIUM confidence)

---
*Stack research for: Buss 2028 Fellesmote-appen -- real-time group discussion webapp*
*Researched: 2026-02-19*
