# Phase 1: Foundation and Authentication - Research

**Researched:** 2026-02-19
**Domain:** Next.js 15 + Supabase Auth + Tailwind CSS v4 project setup with invite-code registration, role-based routing, and Norwegian mobile-first UI
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire project foundation: a Next.js 15 App Router application with Supabase for authentication and database, Tailwind CSS v4 for styling, and a complete invite-code registration flow with role-based routing. This phase has zero code dependencies (greenfield) but every subsequent phase depends on the patterns established here -- the Supabase client setup, auth middleware, RLS policies, and UI primitives.

The core technical challenge is getting the Supabase three-client pattern correct (browser singleton, per-request server client, service-role admin client) with proper auth middleware using `getClaims()` (not `getSession()`, not even `getUser()` -- see State of the Art below). The registration flow is straightforward but requires a specific sequence: validate invite code server-side, create auth user, create profile row with role from invite code, and optionally link parent to youth. All mutations must go through Server Actions, never direct client inserts.

A critical finding from this research: Supabase's official docs now recommend `getClaims()` over `getUser()` for server-side auth verification in middleware. The `getClaims()` method validates the JWT signature locally against the project's published JWKS endpoint, avoiding a round-trip to the Supabase Auth server on every request. This is faster and equally secure for authorization checks. The prior decision to "use `getUser()` not `getSession()`" should be updated to "use `getClaims()` not `getSession()`" -- `getClaims()` is the current best practice, `getUser()` remains acceptable but slower.

**Primary recommendation:** Set up the three Supabase client utilities, auth middleware with `getClaims()`, and the complete database schema (tables + RLS + functions + seed) before writing any UI code. Then build registration and login flows using Server Actions. Wrap up with the design system (custom Tailwind theme) and Norwegian-language UI shell.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can register with a shared invite code, providing name, email, and password | Server Action validates invite code via `validate_invite_code()` DB function, then calls `supabase.auth.signUp()` with user metadata, then inserts profile row. See Code Examples: Registration Flow. |
| AUTH-02 | Invite code determines user role (youth or parent) | `invite_codes` table has a `role` column. The `validate_invite_code()` function returns the role. Server Action uses this role when creating the profile row. |
| AUTH-03 | Parent can select their child(ren) from registered youth during registration | Server Action queries `profiles` table where `role = 'youth'` to populate dropdown. After parent profile creation, inserts rows into `parent_youth_links`. Must use service-role client for the profile insert (new user has no session yet during registration). |
| AUTH-04 | User can log in with email/password | Server Action calls `supabase.auth.signInWithPassword()`. On success, `revalidatePath()` and redirect. See Code Examples: Login Action. |
| AUTH-05 | User is routed to admin dashboard or participant dashboard based on role | Middleware calls `getClaims()` to get user, then queries profile role (or reads from JWT custom claims if configured). Redirects: admin -> `/admin`, youth/parent -> `/dashboard`. Layout guards provide defense-in-depth. |
| DSGN-01 | Mobile-first responsive layout (primary device is phone) | Tailwind CSS v4 with mobile-first breakpoints. Use `h-dvh` not `h-screen` (mobile keyboard safe). Touch targets min 44x44px. Single-column layouts at mobile breakpoint. |
| DSGN-02 | Norwegian (bokmal) UI text throughout | Hardcode Norwegian strings directly in components. No i18n framework (single-audience app). Set `<html lang="nb">` in root layout. |
| DSGN-03 | Color palette: dark teal primary (#1B4D5C), coral accent (#E8734A), warm white bg (#FBF8F4) | Define custom colors in Tailwind CSS v4 `@theme` directive using `--color-*` CSS variables. See Code Examples: Tailwind Theme. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5 | Full-stack React framework (App Router) | Actively supported until Oct 2026. Same App Router paradigm as v14 but with security patches. Async APIs (`cookies()`, `params`, `searchParams` must be awaited) and explicit caching are the main changes from v14. Vercel deployment is seamless. |
| React | ^19 | UI library | Required by Next.js 15. Includes `useActionState` for forms (replaces deprecated `useFormState`). |
| TypeScript | ^5.9 | Type safety | Latest stable. Full Next.js 15 integration. Catches bugs at compile time. |
| Tailwind CSS | ^4.2 | Utility-first styling | v4 stable since Jan 2025. CSS-first config (`@theme` directive, no `tailwind.config.js`), 70% smaller output, automatic content detection. |
| @supabase/supabase-js | ^2.97 | Core Supabase client | Stable v2 API. Handles Auth, DB queries, Realtime. Includes `getClaims()` method for JWT verification. |
| @supabase/ssr | ^0.8 | SSR auth helpers for Next.js | Official replacement for deprecated `@supabase/auth-helpers-nextjs`. Provides `createBrowserClient()` and `createServerClient()` for cookie-based auth in App Router. |

**Confidence: HIGH** -- Versions verified via Context7, npm registry, and official docs (2026-02-19).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/postcss | ^4.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 integration with Next.js. Replaces old `tailwindcss` PostCSS plugin. |
| postcss | ^8.5 | CSS transformation pipeline | Required peer dependency for @tailwindcss/postcss. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Tailwind utilities | shadcn/ui component library | shadcn/ui adds pre-built components but requires installation/configuration overhead. For ~10 pages with straightforward forms and layouts, raw Tailwind is faster to set up and avoids dependency on a component library's Tailwind v4 compatibility. |
| `getClaims()` in middleware | `getUser()` in middleware | `getUser()` always makes a network request to the Supabase Auth server. `getClaims()` validates the JWT locally (using JWKS cache) and is faster. Both are secure; `getClaims()` is now the officially recommended approach. |
| Hardcoded Norwegian strings | i18n framework (next-intl, react-i18next) | i18n adds infrastructure for a single-language, single-event app. Hardcoding is faster and eliminates complexity. Extract strings later if needed (YAGNI). |

**Installation:**
```bash
# Create project
npx create-next-app@latest tbg-russ28 --typescript --eslint --app --tailwind

# Pin to Next.js 15 (create-next-app may install v16)
npm install next@15 react@19 react-dom@19

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Tailwind v4 (if not already set up by create-next-app)
npm install tailwindcss@latest @tailwindcss/postcss postcss
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── app/
│   ├── layout.tsx               # Root layout: <html lang="nb">, fonts, Tailwind import
│   ├── page.tsx                 # Landing page (redirect to /login or /dashboard)
│   ├── login/
│   │   └── page.tsx             # Login page (Server Component shell + Client form)
│   ├── register/
│   │   └── page.tsx             # Registration page (invite code -> form)
│   ├── dashboard/
│   │   ├── layout.tsx           # Auth guard: redirect if not authenticated
│   │   └── page.tsx             # Participant dashboard (placeholder for Phase 2+)
│   ├── admin/
│   │   ├── layout.tsx           # Admin guard: redirect if not admin role
│   │   └── page.tsx             # Admin dashboard (placeholder for Phase 2+)
│   └── auth/
│       └── callback/
│           └── route.ts         # Auth callback handler (if needed for email confirm)
├── components/
│   ├── ui/                      # Reusable primitives: Button, Input, Card, Badge, Label
│   └── auth/
│       ├── LoginForm.tsx        # 'use client' - email/password form
│       └── RegisterForm.tsx     # 'use client' - invite code + registration + parent child-linking
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # createBrowserClient singleton
│   │   ├── server.ts            # createServerClient factory (per-request, uses await cookies())
│   │   └── admin.ts             # Service role client (for Server Actions that bypass RLS)
│   ├── actions/
│   │   └── auth.ts              # Server Actions: validateInviteCode, register, login, logout
│   └── types/
│       └── database.ts          # Generated types from supabase gen types typescript
├── middleware.ts                 # Auth token refresh + role-based redirects (getClaims)
└── supabase/
    └── migrations/
        ├── 001_schema.sql       # Tables + indexes
        ├── 002_rls.sql          # RLS policies
        ├── 003_functions.sql    # Database functions (validate_invite_code, is_admin)
        └── 004_seed.sql         # 6 stations + meeting_status + initial invite codes
```

### Pattern 1: Three Supabase Client Utilities

**What:** Separate client factories for browser, server, and admin contexts. Each has different cookie handling and security properties.
**When to use:** Every Supabase operation in the app.
**Why critical for Phase 1:** Getting this wrong causes auth token desynchronization, silent auth failures, or security vulnerabilities. Must be correct before any feature code.

```typescript
// lib/supabase/client.ts -- Browser client (singleton)
// Source: @supabase/ssr official docs (Context7)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts -- Server client (per-request)
// Source: Supabase official Next.js SSR docs (Context7)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // MUST await in Next.js 15

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can throw in Server Components (read-only context)
            // This is expected -- middleware handles token refresh
          }
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/admin.ts -- Service role client (bypasses RLS)
// Use ONLY in Server Actions for privileged operations
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### Pattern 2: Auth Middleware with getClaims()

**What:** Next.js middleware that refreshes auth tokens on every request and redirects based on auth state and role.
**When to use:** Runs on every matching request.
**Critical Note:** In Next.js 15, the file is `middleware.ts` with `export function middleware()`. The rename to `proxy.ts` is a Next.js 16 change -- do NOT use `proxy.ts` in Next.js 15.

```typescript
// middleware.ts (project root or src/)
// Source: Supabase official Next.js SSR docs + getClaims() recommendation
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Use getClaims() -- validates JWT signature locally
  // Do NOT use getSession() -- reads cookies without validation
  // getUser() is acceptable but makes a network request every time
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/auth']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based routing (query profile for role)
  // Note: For Phase 1, role check happens in layout guards
  // Middleware primarily handles auth token refresh

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Server Action for Mutations

**What:** All write operations go through Server Actions, never direct client-side Supabase calls.
**When to use:** Registration, login, invite code validation, profile creation, parent-youth linking.
**Why:** Server Actions validate business logic, handle errors with meaningful messages, and use the server Supabase client (which can set cookies for auth state changes).

### Pattern 4: Layout Guards (Defense-in-Depth)

**What:** `dashboard/layout.tsx` and `admin/layout.tsx` independently verify auth and role, in addition to middleware.
**When to use:** Every protected route group.
**Why:** Middleware is the first line of defense, but it should not be the only one. Layout guards catch edge cases where middleware is bypassed (e.g., the March 2025 CVE-2025-29927 Next.js middleware bypass).

```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` in server code:** Reads cookies without JWT validation. Can be spoofed. Use `getClaims()` in middleware and `getUser()` in Server Components/Actions.
- **Creating multiple browser Supabase clients:** Each creates a new Realtime connection. Use the singleton from `lib/supabase/client.ts`.
- **Calling `cookies()` without `await` in Next.js 15:** `cookies()` returns a Promise in Next.js 15. Forgetting `await` causes cryptic type errors.
- **Using `useFormState` (React 18):** Deprecated. Use `useActionState` (React 19).
- **Putting `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_` prefix:** The service role key bypasses all RLS. Never expose it to the client.
- **Direct client-side INSERTs for registration:** The registration flow involves multiple steps (validate code, create auth user, create profile, link parent-youth). This must be atomic and server-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session management | Custom JWT handling, cookie parsing, token refresh | `@supabase/ssr` createServerClient with cookie handlers | Session refresh, cookie chunking, PKCE flow are complex and security-critical. The library handles all edge cases. |
| Password hashing | bcrypt in Server Actions | Supabase Auth `signUp()` / `signInWithPassword()` | Supabase Auth handles hashing, rate limiting, and credential storage. Rolling your own auth is a security risk. |
| Invite code validation | Client-side code check | PostgreSQL function `validate_invite_code()` with atomic increment | Race condition: two users could validate the same code simultaneously and exceed max_uses. The DB function uses atomic UPDATE. |
| CSS design system | Custom CSS variables, media queries | Tailwind CSS v4 `@theme` directive with custom `--color-*` variables | Tailwind generates only the CSS used, handles responsive breakpoints, and provides a consistent utility API. |
| Form validation | Custom validation logic | Native HTML5 validation + Server Action validation | HTML5 gives client-side feedback (required, minlength, type="email"). Server Action is the source of truth. No need for Zod/Yup at this scale. |

**Key insight:** The registration flow looks simple but has a multi-step atomic requirement: validate code -> increment uses -> create auth user -> create profile -> link parent. Any failure mid-flow must not leave partial state. Use a Server Action that orchestrates all steps, with the admin client for profile creation (since the user doesn't have a session yet during signup).

## Common Pitfalls

### Pitfall 1: `cookies()` Not Awaited in Next.js 15

**What goes wrong:** `cookies()` returns a `Promise` in Next.js 15 (changed from sync in v14). Calling `.getAll()` on the Promise object returns undefined. Auth silently fails -- no error, just no user.
**Why it happens:** Every Next.js 14 tutorial and most AI training data shows `const cookieStore = cookies()` without `await`. The v15 migration is mechanical but easy to miss.
**How to avoid:** Always `const cookieStore = await cookies()` in the server client factory. The `middleware.ts` pattern does NOT need `await cookies()` because it uses `request.cookies` directly.
**Warning signs:** `supabase.auth.getUser()` returns `{ data: { user: null } }` in Server Components despite the user being logged in.

### Pitfall 2: Registration Partial State on Failure

**What goes wrong:** Auth user is created in Supabase Auth, but the profile INSERT fails (e.g., RLS blocks it). The user exists in `auth.users` but has no profile row. They can log in but the app crashes when querying their profile.
**Why it happens:** `signUp()` and the profile INSERT are separate operations. If the second fails, the first is not rolled back (Supabase Auth and the database are separate systems).
**How to avoid:** Use the admin client (service role) for the profile INSERT during registration -- this bypasses RLS and cannot be blocked by policy misconfiguration. Add error handling: if profile creation fails, delete the auth user. Alternatively, use a Postgres trigger on `auth.users` to auto-create the profile row, but this is harder to debug.
**Warning signs:** Users report "blank page" after registration. The `profiles` table has fewer rows than `auth.users`.

### Pitfall 3: RLS Policies Blocking Registration Read Operations

**What goes wrong:** Parent registration needs to query `profiles` where `role = 'youth'` to populate the child dropdown. If the RLS SELECT policy on `profiles` requires `authenticated`, and the parent hasn't completed registration yet, the query returns empty.
**Why it happens:** The parent is filling out the registration form (not yet authenticated). The Supabase client uses the anon key, which doesn't satisfy `to authenticated` policies.
**How to avoid:** Two options: (1) Use the admin client (service role) in the Server Action that fetches youth profiles for the dropdown. (2) Create a specific RLS policy that allows anon access to read youth names (but this exposes data). Option 1 is preferred for this use case.
**Warning signs:** Parent registration form shows an empty dropdown even though youth have registered.

### Pitfall 4: Invite Code Race Condition

**What goes wrong:** Two users submit the same invite code simultaneously. Both validate successfully (uses < max_uses), both increment uses. The code ends up with one more use than max_uses.
**Why it happens:** Check-then-act without atomicity: read `uses`, compare to `max_uses`, then increment. Between the read and increment, another request can pass the same check.
**How to avoid:** Use the `validate_invite_code()` PostgreSQL function which performs the check and increment in a single atomic operation. The function uses `UPDATE invite_codes SET uses = uses + 1 WHERE id = invite.id` after validation, all within one transaction.
**Warning signs:** `invite_codes.uses` exceeds `invite_codes.max_uses` in the database.

### Pitfall 5: Mobile Viewport Height with Keyboard

**What goes wrong:** On mobile, the virtual keyboard reduces the viewport height. Elements positioned with `h-screen` (100vh) overflow behind the keyboard. The registration form's submit button becomes unreachable.
**Why it happens:** CSS `100vh` includes the space behind the keyboard on iOS Safari. This is a well-known browser behavior.
**How to avoid:** Use `h-dvh` (dynamic viewport height) in Tailwind CSS instead of `h-screen`. `dvh` adjusts when the keyboard opens/closes. Test on actual iOS Safari.
**Warning signs:** Users on iPhone report they cannot see the submit button when typing in form fields.

## Code Examples

### Registration Flow (Server Action)

```typescript
// lib/actions/auth.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function validateInviteCode(code: string) {
  const supabase = createAdminClient() // Admin client -- no auth required
  const { data, error } = await supabase.rpc('validate_invite_code', {
    p_code: code,
  })

  if (error || !data?.valid) {
    return { valid: false, error: data?.error || 'Ugyldig invitasjonskode' }
  }

  return { valid: true, role: data.role as 'youth' | 'parent' }
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string
  const youthIds = formData.getAll('youthIds') as string[]

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role }, // Store in user_metadata
    },
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Registrering feilet' }
  }

  // 2. Create profile (use admin client to bypass RLS)
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role,
    })

  if (profileError) {
    // Rollback: delete the auth user if profile creation fails
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: 'Kunne ikke opprette profil' }
  }

  // 3. Link parent to youth (if parent role)
  if (role === 'parent' && youthIds.length > 0) {
    const links = youthIds.map((youthId) => ({
      parent_id: authData.user!.id,
      youth_id: youthId,
    }))

    const { error: linkError } = await adminClient
      .from('parent_youth_links')
      .insert(links)

    if (linkError) {
      // Non-fatal: profile exists, link can be added later by admin
      console.error('Failed to link parent to youth:', linkError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

### Login Action

```typescript
// Part of lib/actions/auth.ts
export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: 'Feil e-post eller passord' }
  }

  // Check role for redirect target
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Innlogging feilet' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  revalidatePath('/', 'layout')

  if (profile?.role === 'admin') {
    redirect('/admin')
  } else {
    redirect('/dashboard')
  }
}
```

### Tailwind CSS v4 Theme Configuration

```css
/* app/globals.css (or src/app/globals.css) */
@import "tailwindcss";

@theme {
  /* Primary colors from design spec */
  --color-teal-primary: #1B4D5C;
  --color-teal-secondary: #2A7F8E;
  --color-coral: #E8734A;
  --color-warm-white: #FBF8F4;

  /* Semantic colors */
  --color-text-primary: #1E2D3D;
  --color-text-muted: #3A4F5E;
  --color-success: #2D8A56;
  --color-warning: #E8A838;
  --color-danger: #D94040;

  /* Font families */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", "Fira Code", monospace;
}
```

Usage in components:
```html
<button class="bg-teal-primary text-white hover:bg-teal-secondary">
  Registrer deg
</button>
<div class="bg-warm-white text-text-primary min-h-dvh">
  <!-- Full-height mobile-safe container -->
</div>
```

### Root Layout with Norwegian Locale

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Buss 2028 Fellesmote',
  description: 'Diskusjonsapp for fellesmote',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb">
      <body className="bg-warm-white text-text-primary font-sans antialiased min-h-dvh">
        {children}
      </body>
    </html>
  )
}
```

### Fetching Youth List for Parent Registration (Server Action)

```typescript
// Part of lib/actions/auth.ts
export async function getRegisteredYouth() {
  const adminClient = createAdminClient() // Admin client -- anon users can't read profiles

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'youth')
    .order('full_name', { ascending: true })

  if (error) {
    return { youth: [], error: 'Kunne ikke hente ungdomsliste' }
  }

  return { youth: data, error: null }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getSession()` for auth checks | `getClaims()` for server-side auth | 2025 (asymmetric JWT support) | `getClaims()` validates JWT signature locally via JWKS. Faster and secure. `getSession()` reads unvalidated cookies. |
| `getUser()` in middleware | `getClaims()` in middleware | 2025-2026 (Supabase docs update) | `getUser()` makes a network request to Auth server on every request. `getClaims()` caches JWKS locally. Both secure, but `getClaims()` is faster. Use `getUser()` only when you need fresh user data from the server. |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers is deprecated. `@supabase/ssr` is framework-agnostic and actively maintained. |
| `useFormState` (React 18) | `useActionState` (React 19) | Next.js 15 / React 19 | `useFormState` is deprecated. Import `useActionState` from `react`. |
| `cookies()` sync (Next.js 14) | `await cookies()` (Next.js 15) | Next.js 15 | All dynamic request APIs are async in v15. Must `await` cookies(), headers(), params, searchParams. |
| `tailwind.config.js` (v3) | `@theme` directive in CSS (v4) | Tailwind CSS v4 (Jan 2025) | No more JS config file. Colors, fonts, breakpoints defined in CSS with `--*` variables. |
| `h-screen` for full height | `h-dvh` for mobile-safe full height | Tailwind CSS v3.4+ | `100vh` doesn't account for mobile keyboard/address bar. `dvh` adjusts dynamically. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new projects) | Supabase Nov 2025 | New Supabase projects use `sb_publishable_*` key format. Client libraries accept both formats transparently. Use whichever your project provides. |
| `middleware.ts` (Next.js 15) | `proxy.ts` (Next.js 16) | Next.js 16 | In v15, use `middleware.ts` with `export function middleware()`. The rename to `proxy.ts` with `export function proxy()` is v16 only. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated. No bug fixes. Use `@supabase/ssr`.
- `useFormState`: Deprecated in React 19. Use `useActionState`.
- `@next/font`: Removed in Next.js 15. Use `next/font` (built-in).
- Next.js 14: EOL since Oct 2025. No security patches.

## Open Questions

1. **Supabase project key format**
   - What we know: Supabase projects created after Nov 2025 use new key names (`sb_publishable_*` and `sb_secret_*`). The client libraries accept both formats.
   - What's unclear: Whether the user's Supabase project was created before or after this cutover. This affects env variable naming only.
   - Recommendation: Check the Supabase dashboard for the actual key names when setting up `.env.local`. Use whichever format the project provides.

2. **Email confirmation toggle**
   - What we know: Supabase Auth has "Confirm email" enabled by default. When enabled, `signUp()` returns a user but null session. The user must click a confirmation link before they can log in.
   - What's unclear: The PRD says "no email verification" and uses invite codes as the barrier.
   - Recommendation: Disable email confirmation in the Supabase dashboard (Authentication > Providers > Email > Confirm email = OFF). This allows immediate login after registration, which matches the PRD's intent.

3. **Admin user bootstrap**
   - What we know: The first admin user must be created manually. There's no invite code for admin role -- the PRD uses invite codes for youth and parent only.
   - What's unclear: How the first admin is created.
   - Recommendation: Register a normal account (using the youth invite code), then manually update their role to 'admin' in the Supabase dashboard SQL editor: `UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com'`. Or create a seed script that sets up the admin profile.

4. **`getClaims()` availability in current @supabase/supabase-js**
   - What we know: `getClaims()` is documented in official Supabase docs and recommended for server-side auth. It was introduced alongside asymmetric JWT signing keys support.
   - What's unclear: The exact minimum version of `@supabase/supabase-js` that includes `getClaims()`. It appears to be available in recent v2.x releases.
   - Recommendation: Use `@supabase/supabase-js@latest` (^2.97). If `getClaims()` is not available in the installed version, fall back to `getUser()` -- which is still secure, just slower. Test by calling `supabase.auth.getClaims()` after installation.

## Sources

### Primary (HIGH confidence)
- [Context7: @supabase/ssr] -- createBrowserClient, createServerClient patterns, cookie handling (verified 2026-02-19)
- [Context7: Supabase docs] -- Next.js SSR auth setup, signUp/signInWithPassword, getClaims vs getUser, middleware pattern (verified 2026-02-19)
- [Context7: Tailwind CSS docs] -- v4 @theme directive, custom colors, Next.js setup (verified 2026-02-19)
- [Supabase: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- getClaims() recommended over getSession()
- [Supabase: Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- Three-client pattern, middleware cookie handling
- [Supabase: getClaims() API Reference](https://supabase.com/docs/reference/javascript/auth-getclaims) -- JWT verification, JWKS caching
- [Next.js: middleware.ts file convention](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware) -- Still middleware.ts in v15
- [Next.js: Dynamic APIs are Asynchronous](https://nextjs.org/docs/messages/sync-dynamic-apis) -- cookies(), params, searchParams must be awaited in v15

### Secondary (MEDIUM confidence)
- [Supabase GitHub Issue #40985](https://github.com/supabase/supabase/issues/40985) -- getClaims vs getUser clarification discussion
- [Next.js: Upgrading to Version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) -- Async API changes, caching defaults
- [Supabase: Build a User Management App with Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs) -- login/signup Server Action patterns
- [Supabase: AI Prompt for Next.js Auth Bootstrap](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth) -- Complete middleware + client setup reference

### From Prior Project Research (HIGH confidence -- already verified)
- `.planning/research/STACK.md` -- Next.js 15 vs 14 EOL, version compatibility matrix
- `.planning/research/ARCHITECTURE.md` -- Three-client pattern, project structure, Server Component shell + Client Component island pattern
- `.planning/research/PITFALLS.md` -- Subscription leaks, getSession vulnerability, RLS policy gaps, mobile keyboard
- `.planning/research/FEATURES.md` -- Anti-features confirmed (no email verification, no i18n framework, no OAuth)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All versions verified via Context7 and npm registry
- Architecture: HIGH -- Patterns from official Supabase and Next.js documentation, verified via Context7
- Pitfalls: HIGH -- All critical pitfalls from official sources, cross-verified
- getClaims() recommendation: HIGH -- Verified via Supabase official docs, Context7, and GitHub issue #40985

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days -- stable ecosystem, no imminent breaking changes expected)
