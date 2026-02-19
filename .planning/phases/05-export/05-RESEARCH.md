# Phase 5: Export - Research

**Researched:** 2026-02-19
**Domain:** Markdown file generation, Next.js Route Handler file download, Supabase admin queries with joins
**Confidence:** HIGH

## Summary

Phase 5 is the simplest phase in the roadmap. It adds a single admin-only feature: export all meeting conversations as a structured Markdown file, organized by station (1-6), then by group within each station, with timestamps and author information. The data already exists in the `messages` table (joined to `profiles` for author info and `station_sessions`/`stations`/`groups` for organization). No new database schema or migrations are needed.

The implementation requires two parts: (1) a Next.js Route Handler (`GET`) that queries all messages via the Supabase admin client (bypasses RLS), builds a Markdown string, and returns it as a downloadable file with `Content-Disposition: attachment` header; and (2) a button on the admin dashboard page that triggers the download. The admin client (`createAdminClient()` using the service role key) already exists at `src/lib/supabase/admin.ts` and is used throughout Phase 2 server actions. Admin authorization uses the same `verifyAdmin()` pattern from `src/lib/actions/admin.ts` -- but since Route Handlers cannot use the SSR cookie-based client in the same way as server actions, the Route Handler must read the user session via `createClient()` (from `@supabase/ssr`) to verify the caller is admin, then use `createAdminClient()` for the data query.

**Primary recommendation:** Use a Next.js 15 Route Handler at `src/app/api/export/route.ts` with a `GET` handler that verifies admin auth, queries all messages with joins via the admin client, builds a Markdown string organized by station then group, and returns a `Response` with `Content-Disposition: attachment; filename="eksport-fellesmote.md"` and `Content-Type: text/markdown; charset=utf-8`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPT-01 | Admin can export all conversations as a Markdown file | Route Handler at `/api/export` returns Markdown as file download. Admin auth verified via `createClient()` + profiles query. Admin client queries all messages. Button on admin page triggers `window.location.href = '/api/export'` or `<a href="/api/export" download>`. |
| EXPT-02 | Export is grouped by station, then by group, with timestamps and author info | Query joins messages -> station_sessions -> stations (for station number/title) and station_sessions -> groups (for group name). Sort by station number ASC, group name ASC, message created_at ASC. Build Markdown with `# Station N: Title` > `## Group Name` > message lines with timestamp, author name, role, and content. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.97.0 | Admin client for querying all messages with joins (bypasses RLS) | Already installed. Admin client pattern established in `src/lib/supabase/admin.ts`. |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client for verifying admin auth in Route Handler | Already installed. Same cookie-based auth used in server actions and layout guards. |
| Next.js 15 | ^15.5.12 | Route Handler (`GET`) returning a `Response` with file download headers | Already installed. Route Handlers are the standard Next.js mechanism for non-UI responses (file downloads, APIs). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | No new dependencies. Markdown is plain string concatenation -- no library needed. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Route Handler (GET) | Server Action returning a string | Server Actions cannot set response headers (Content-Disposition). A Route Handler is the correct mechanism for file downloads. |
| Plain string concatenation | Markdown library (e.g., `markdown-it`, `remark`) | Those libraries parse or transform Markdown. We are generating Markdown, which is just string building. A library adds unnecessary dependency. |
| Admin client (service role) | SSR client with admin RLS policy | The SSR client would work because admin has `SELECT` RLS on messages. However, the admin client is simpler (no RLS complexity) and consistent with other admin operations. |
| Single GET Route Handler | Server Action + Blob download trick | The Blob trick (`URL.createObjectURL`) works but is more complex, less standard, and does not produce a clean browser download dialog. Route Handler is cleaner. |

**Installation:**
```bash
# No new packages needed. All dependencies already in package.json.
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── export/
│   │       └── route.ts          # GET Route Handler for Markdown export
│   └── admin/
│       └── page.tsx              # Add export button (modify existing)
└── lib/
    └── export/
        └── build-markdown.ts     # Pure function: data -> Markdown string
```

### Pattern 1: Route Handler for File Download
**What:** A GET Route Handler that returns a `Response` with `Content-Disposition: attachment` header to trigger a browser file download.
**When to use:** Whenever you need to generate and serve a file (Markdown, CSV, PDF) from the server.
**Example:**
```typescript
// Source: Next.js docs - Route Handlers (Context7 /vercel/next.js)
// src/app/api/export/route.ts

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildExportMarkdown } from '@/lib/export/build-markdown'

export const dynamic = 'force-dynamic' // Never cache -- always fresh data

export async function GET() {
  // Step 1: Verify admin auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Ikke autentisert', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response('Ikke autorisert', { status: 403 })
  }

  // Step 2: Query all data via admin client
  const admin = createAdminClient()
  // ... query messages with joins ...

  // Step 3: Build Markdown
  const markdown = buildExportMarkdown(data)

  // Step 4: Return as downloadable file
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="eksport-fellesmote.md"',
    },
  })
}
```

### Pattern 2: Supabase Query with Multi-Table Joins
**What:** Query messages and join to `station_sessions`, `stations`, `groups`, and `profiles` in a single Supabase query.
**When to use:** When you need related data from multiple tables in one round-trip.
**Example:**
```typescript
// Source: Supabase JS docs - Select with relations (Context7 /supabase/supabase-js)
const { data, error } = await admin
  .from('messages')
  .select(`
    id,
    content,
    created_at,
    profiles:user_id (
      full_name,
      role
    ),
    station_sessions:session_id (
      id,
      stations:station_id (
        number,
        title
      ),
      groups:group_id (
        name
      )
    )
  `)
  .order('created_at', { ascending: true })
```

### Pattern 3: Pure Markdown Builder Function
**What:** A pure function that takes structured data and returns a Markdown string. Separated from the Route Handler for testability.
**When to use:** Whenever generating text output from data. Pure functions are easier to test and reason about.
**Example:**
```typescript
// src/lib/export/build-markdown.ts

interface ExportMessage {
  content: string
  createdAt: string
  authorName: string
  authorRole: string
  stationNumber: number
  stationTitle: string
  groupName: string
}

export function buildExportMarkdown(messages: ExportMessage[]): string {
  // Group by station, then by group
  const byStation = groupBy(messages, (m) => m.stationNumber)

  let md = '# Fellesmote - Eksport\n\n'
  md += `Eksportert: ${new Date().toLocaleString('nb-NO')}\n\n---\n\n`

  for (const [stationNum, stationMsgs] of Object.entries(byStation)) {
    const title = stationMsgs[0].stationTitle
    md += `# Stasjon ${stationNum}: ${title}\n\n`

    const byGroup = groupBy(stationMsgs, (m) => m.groupName)
    for (const [groupName, groupMsgs] of Object.entries(byGroup)) {
      md += `## ${groupName}\n\n`
      for (const msg of groupMsgs) {
        const time = new Date(msg.createdAt).toLocaleTimeString('nb-NO', {
          hour: '2-digit', minute: '2-digit'
        })
        const role = msg.authorRole === 'parent' ? 'forelder' : 'ungdom'
        md += `**${msg.authorName}** (${role}) - ${time}\n`
        md += `${msg.content}\n\n`
      }
    }
    md += '---\n\n'
  }

  return md
}
```

### Pattern 4: Triggering Download from Admin Page
**What:** A simple anchor tag or button that navigates to the Route Handler URL.
**When to use:** For file downloads, the simplest approach is a direct link. No JavaScript fetch needed.
**Example:**
```tsx
// In admin page (client component or server component)
<a
  href="/api/export"
  download
  className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm
    hover:border-teal-primary hover:shadow-md transition-all"
>
  <div className="flex items-center gap-3 mb-2">
    {/* Download icon SVG */}
    <h2 className="text-lg font-semibold text-text-primary">Eksporter samtaler</h2>
  </div>
  <p className="text-sm text-text-muted">
    Last ned alle diskusjoner som Markdown-fil
  </p>
</a>
```

### Anti-Patterns to Avoid
- **Fetching via client-side fetch then creating a Blob:** Overcomplicated. A direct `<a href>` to the Route Handler is simpler and triggers the native browser download dialog.
- **Using a server action for file generation:** Server actions cannot set HTTP response headers. They return data, not files. Use a Route Handler instead.
- **Querying messages table multiple times (per station, per group):** Inefficient. One query with joins retrieves everything. Group/sort in JavaScript.
- **Building Markdown inside the Route Handler:** Mix of concerns. Extract the Markdown builder as a pure function for clarity and testability.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown generation | Markdown AST builder or template engine | Plain string concatenation | Markdown output is simple text. String concatenation is clear, fast, and dependency-free. |
| File download | Custom Blob/URL.createObjectURL flow | Route Handler with Content-Disposition header | The browser natively handles file downloads when it receives the correct headers. No client-side JavaScript needed. |
| Admin auth check in Route Handler | Custom middleware or token parsing | `createClient()` from `@supabase/ssr` + profile role check | Same pattern used in admin layout and server actions. Consistent and proven. |
| Data grouping (by station, by group) | Complex SQL GROUP BY with string_agg | Fetch flat list, group in JavaScript | JavaScript grouping is simpler, more flexible for Markdown formatting, and the total message count for one meeting is small (hundreds, not millions). |

**Key insight:** This feature deals with small data volumes (a single meeting with ~80 users, 6 stations, maybe a few hundred messages total). Performance optimization is unnecessary. Simplicity and correctness are the priorities.

## Common Pitfalls

### Pitfall 1: Forgetting `export const dynamic = 'force-dynamic'`
**What goes wrong:** In Next.js 15, GET Route Handlers are not cached by default (changed from 14), but if someone adds caching config or the behavior changes, the export could serve stale data.
**Why it happens:** Next.js caching behavior has changed between versions and can be surprising.
**How to avoid:** Explicitly set `export const dynamic = 'force-dynamic'` in the route file. This ensures the handler always runs fresh.
**Warning signs:** Export shows old/missing messages that were added after first request.

### Pitfall 2: Not Handling Empty Export
**What goes wrong:** If no messages exist (meeting hasn't happened yet), the exported file could be empty or malformed.
**Why it happens:** Developer only tests with seeded data and doesn't consider the empty state.
**How to avoid:** Check if messages array is empty. If so, return a Markdown file with a "Ingen samtaler funnet" (No conversations found) message.
**Warning signs:** Empty file download or file with just headers and no content.

### Pitfall 3: Supabase PostgREST Join Returns Array vs Object
**What goes wrong:** Supabase foreign key joins (e.g., `profiles:user_id(...)`) can return an object or an array depending on cardinality. Assuming one form when the other is returned causes runtime errors.
**Why it happens:** PostgREST infers cardinality from FK constraints. Many-to-one returns object, one-to-many returns array.
**How to avoid:** Always handle both forms defensively, similar to what `loadMessages` in `station.ts` already does: `const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles`.
**Warning signs:** `Cannot read property 'full_name' of undefined` errors.

### Pitfall 4: Route Handler Auth with Cookies in App Router
**What goes wrong:** The `createClient()` function from `@supabase/ssr` reads cookies via `next/headers`. In Next.js 15 App Router, `cookies()` is async. If the server client setup doesn't match, auth fails silently.
**Why it happens:** Route Handlers in App Router have the same async cookie access as Server Components.
**How to avoid:** The existing `createClient()` in `src/lib/supabase/server.ts` already handles this correctly with `await cookies()`. Use it as-is in the Route Handler.
**Warning signs:** `getUser()` returns null even for authenticated requests.

### Pitfall 5: Timestamp Formatting for Norwegian Locale
**What goes wrong:** `toLocaleString('nb-NO')` formatting may vary across Node.js versions and server environments (Vercel Edge vs Node.js runtime).
**Why it happens:** `Intl` locale support depends on the ICU data compiled into the runtime.
**How to avoid:** Use simple manual formatting (e.g., extract hours/minutes from Date object) as a fallback, or verify `nb-NO` locale works on the deployment target. Vercel Node.js runtime includes full ICU data.
**Warning signs:** Timestamps showing in English format or throwing errors on production.

## Code Examples

Verified patterns from official sources:

### Next.js Route Handler Returning Custom Content-Type
```typescript
// Source: Context7 /vercel/next.js - Route Handlers, non-UI responses
// Verified: Route Handlers support arbitrary Content-Type and headers

export async function GET() {
  const content = 'Generated content here'

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="eksport-fellesmote.md"',
    },
  })
}
```

### Supabase Select with Nested Foreign Key Joins
```typescript
// Source: Context7 /supabase/supabase-js - Select with relations
// Verified: PostgREST supports nested joins via FK relationships

const { data, error } = await admin
  .from('messages')
  .select(`
    id,
    content,
    created_at,
    profiles:user_id (
      full_name,
      role
    ),
    station_sessions:session_id (
      stations:station_id (
        number,
        title
      ),
      groups:group_id (
        name
      )
    )
  `)
  .order('created_at', { ascending: true })
```

### Admin Auth Verification Pattern (Existing in Codebase)
```typescript
// Source: src/lib/actions/admin.ts - verifyAdmin() helper
// This same pattern applies in the Route Handler, but returns HTTP responses instead.

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Ikke autentisert', { status: 401 })

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'admin') return new Response('Ikke autorisert', { status: 403 })
```

### JavaScript Grouping Utility
```typescript
// Simple groupBy helper -- no library needed
function groupBy<T>(items: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = String(keyFn(item))
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API routes (`pages/api/`) | App Router Route Handlers (`app/api/.../route.ts`) | Next.js 13+ (stable in 14/15) | Route Handlers use Web Response API, support streaming, and integrate with App Router middleware. |
| GET Route Handlers cached by default | GET Route Handlers NOT cached by default | Next.js 15 | Must use `export const dynamic = 'force-static'` to opt into caching. For export, we want `force-dynamic`. |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 | Not relevant to this phase (no forms), but noted for consistency. |

**Deprecated/outdated:**
- `pages/api/` routes: Replaced by `app/api/.../route.ts` Route Handlers in App Router.
- `NextResponse.json()`: Still works but plain `Response.json()` is standard Web API and preferred.

## Open Questions

1. **Filename encoding for Norwegian characters**
   - What we know: The filename `eksport-fellesmote.md` uses only ASCII characters, so no encoding issues.
   - What's unclear: If the filename were to include Norwegian characters (e.g., "moter"), some browsers handle `Content-Disposition` encoding differently.
   - Recommendation: Keep the filename ASCII-only (`eksport-fellesmote.md`). No issue to resolve.

2. **Maximum message volume**
   - What we know: The app serves ~80 users across 6 stations with 15-minute sessions. Estimated max is a few hundred messages.
   - What's unclear: Exact message count is unknown until the meeting runs.
   - Recommendation: No pagination or streaming needed. A single query and in-memory string build will handle the volume easily. If needed in the future, streaming can be added via `ReadableStream` in the Route Handler, but this is unnecessary for v1.

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js` - Route Handlers, GET handler, Content-Type headers, `dynamic` config
- Context7 `/supabase/supabase-js` - Select with FK relations (nested joins), ordering
- Codebase: `src/lib/supabase/admin.ts` - Existing admin client pattern
- Codebase: `src/lib/actions/admin.ts` - Existing `verifyAdmin()` pattern
- Codebase: `src/lib/actions/station.ts` - Existing `loadMessages()` with PostgREST join handling
- Codebase: `supabase/migrations/001_schema.sql` - Full database schema (messages, station_sessions, stations, groups, profiles)
- Codebase: `supabase/migrations/002_rls.sql` - RLS policies confirming admin SELECT on all tables
- Codebase: `supabase/migrations/004_seed.sql` - 6 stations with Norwegian titles, numbers, descriptions

### Secondary (MEDIUM confidence)
- Next.js 15 upgrade notes (Context7): GET Route Handlers no longer cached by default

### Tertiary (LOW confidence)
- None. All findings verified via Context7 or codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies. All patterns already exist in codebase.
- Architecture: HIGH - Route Handler + admin client is standard Next.js + Supabase pattern. Verified via Context7.
- Pitfalls: HIGH - All pitfalls identified from existing codebase patterns and official docs.

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable phase, no fast-moving dependencies)
