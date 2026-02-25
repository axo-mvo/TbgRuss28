# Stack Research: v1.1 Multi-Meeting Platform

**Domain:** Multi-meeting platform additions to existing real-time group discussion webapp
**Researched:** 2026-02-25
**Confidence:** HIGH

## Critical Finding: No New Dependencies Required

After analyzing the v1.1 feature set against the existing codebase, **zero new npm packages are needed.** The existing stack -- Next.js 15.5, Supabase JS 2.97, Tailwind CSS 4, React 19 -- already provides every capability required for meeting CRUD, admin-configurable stations, searchable contact directory, meeting history, and data migration.

This is not a laziness finding. Each v1.1 feature was evaluated individually. The stack additions needed are purely **Supabase schema changes (SQL migrations)**, **new Next.js routes**, and **new React components** -- all using tools already installed.

## Existing Stack (DO NOT CHANGE)

These are validated in production. Listed here for reference only.

| Technology | Version | Status |
|------------|---------|--------|
| Next.js (App Router) | ^15.5.12 | Active, supported until Oct 2026 |
| React | ^19.2.4 | Required by Next.js 15 |
| TypeScript | ^5 | Working, no upgrade needed |
| @supabase/supabase-js | ^2.97.0 | Latest stable v2 |
| @supabase/ssr | ^0.8.0 | Latest, handles cookie-based auth |
| Tailwind CSS | ^4 | Stable, CSS-first config |
| @dnd-kit/react | ^0.3.2 | Group builder drag-and-drop (reused per-meeting) |
| ESLint + eslint-config-next | ^9 / ^15.5.12 | Working |

## Feature-by-Feature Stack Analysis

### 1. Meeting Entity CRUD (Create, Read, Update, Delete)

**What's needed:** Admin creates meetings with title, date, time, venue. Admin edits/deletes meetings. All users see upcoming meeting info.

**Stack answer:** This is standard Supabase CRUD. The app already does CRUD for groups, invite codes, and user profiles using the exact same pattern:
- Server Actions (`'use server'`) calling `createAdminClient()` or `createClient()`
- Supabase `.insert()`, `.update()`, `.delete()`, `.select()` queries
- `revalidatePath()` for cache invalidation
- RLS policies for access control

**New SQL:** A `meetings` table with columns: `id UUID`, `title TEXT`, `date DATE`, `time TIME`, `venue TEXT`, `status TEXT`, `created_at TIMESTAMPTZ`. Plus foreign keys from `groups`, `stations`, `station_sessions` to `meetings.id`.

**No new libraries.** The existing Supabase client handles all query types. Server Actions handle mutation. No form library needed -- the app already uses plain HTML forms with server actions (see `RegisterForm.tsx`, `AttendingToggle.tsx`).

**Confidence: HIGH** -- Same patterns as existing admin.ts actions.

### 2. Date/Time Input for Meeting Creation

**What's needed:** Admin enters date, time, and venue when creating a meeting.

**Stack answer:** Use native HTML `<input type="date">` and `<input type="time">`. The admin creates meetings manually (per PROJECT.md: "admin creates each meeting manually"), and the form only needs a date picker and time picker -- not a complex calendar.

**Why NOT react-datepicker or date-fns:**
- The app is mobile-first. Native date/time inputs on iOS and Android render as native OS pickers, which are more accessible and familiar than any JS widget.
- At most 4-6 meetings per year. This is not a calendaring app.
- The existing codebase already formats dates with `new Date(dateStr).toLocaleDateString('nb-NO')` (in `UserTable.tsx` line 232) and `new Date().toLocaleString('nb-NO')` (in `build-markdown.ts` line 70). The native `Intl.DateTimeFormat` API handles Norwegian locale formatting. No date library needed.
- Adding `date-fns` (18kb gzipped) or `dayjs` (6kb) for what amounts to `toLocaleDateString('nb-NO')` in 3-4 places is unjustifiable overhead.

**Chrome nb-NO note:** There was a known Chrome issue with Norwegian locale support in `Intl` APIs (Chrome >= 92, reported 2021). This affected `formatjs` library specifically. The existing app already uses `toLocaleDateString('nb-NO')` in production without issues, confirming this is not a problem for raw `Intl.DateTimeFormat` usage. If edge cases arise, a simple fallback formatter (10 lines of code) is preferable to adding a dependency.

**Confidence: HIGH** -- Existing codebase proves pattern works.

### 3. Admin-Configurable Stations per Meeting

**What's needed:** Admin creates stations (title, questions array, optional tip) per meeting instead of hardcoded seed data. Admin can add/remove/reorder stations.

**Stack answer:** The existing `stations` table already has the right column structure: `title TEXT`, `description TEXT`, `questions JSONB`, `tip TEXT`. The change is:
1. Add `meeting_id UUID REFERENCES meetings(id)` to `stations`
2. Remove the `UNIQUE` constraint on `stations.number` (number is now unique per meeting, not globally)
3. Add `UNIQUE(meeting_id, number)` instead
4. Admin CRUD via new server actions (same pattern as `createGroup`, `deleteGroup` in `admin.ts`)

**For station reordering:** The `number` column already exists and represents order. Admin reordering is just updating `number` values. No drag-and-drop needed for stations -- the admin creates 3-7 stations manually and can number them. If drag-and-drop reordering is desired later, `@dnd-kit/react` is already installed.

**For JSONB questions editing:** A simple textarea-per-question UI with add/remove buttons. The existing `questions JSONB` column stores a string array. No JSON editor library needed -- this is a list of text inputs.

**No new libraries.** Server actions + Supabase queries + Tailwind form styling.

**Confidence: HIGH** -- Schema evolution, same query patterns.

### 4. Searchable Contact Directory

**What's needed:** Dashboard shows all members (youth + parents) with name, phone, email. Two views: youth-centered (expand to see parents) and flat list. Search by name.

**Stack answer:** The dashboard page (`page.tsx` lines 71-105) already fetches all youth with linked parents using the admin client. The `RegisteredUsersOverview` component already renders a youth-with-parents list. The contact directory is an evolution of this existing view, adding:
- `phone` column (already exists, added in migration 015)
- `email` column (already exists on `profiles` table)
- Client-side search filtering with `useState` and `Array.filter()`

**For search:** At ~80 users, client-side `String.includes()` filtering is instant. No search library needed. The app already has a `SearchInput` component (`src/components/ui/SearchInput.tsx`). Use it.

**For expandable youth-parent grouping:** A simple `useState` toggle per youth entry. The `ParentLinkSheet.tsx` already shows parent-youth relationships. This is pure React state + Tailwind styling.

**No new libraries.** The `SearchInput` component already exists. The data fetching pattern exists. Just new UI composition.

**Confidence: HIGH** -- Existing components and patterns cover this.

### 5. Meeting History Browsing

**What's needed:** Previous meetings shown in a list. Click to view read-only discussions from that meeting (stations, groups, messages).

**Stack answer:** This is read-only data fetching with nested relationships. Supabase's PostgREST client handles nested `select()` queries beautifully -- the app already uses them:
```typescript
// Existing pattern from dashboard/page.tsx
.select('station_id, id, status, end_timestamp')
.eq('group_id', group.id)
```

For meeting history:
```typescript
// Same pattern, scoped to meeting
.select('*, stations(*), station_sessions(*, messages(*))')
.eq('id', meetingId)
```

The station chat page (`station/[sessionId]/page.tsx`) already renders messages in read-only mode (when `isReadOnly` is true). The `ChatRoom` component has a `readOnly` prop. The `useRealtimeChat` hook skips subscription when `readOnly` is true. All of this exists.

**New routes needed:**
- `/dashboard/meetings` -- meeting list
- `/dashboard/meetings/[meetingId]` -- single meeting view with stations
- `/dashboard/meetings/[meetingId]/station/[sessionId]` -- read-only station chat (reuse existing component)

**No new libraries.** Dynamic routes, Supabase queries, existing read-only components.

**Confidence: HIGH** -- Existing read-only mode proves the pattern.

### 6. Data Migration (Single-Meeting to Multi-Meeting)

**What's needed:** Existing v1.0 data (stations, groups, station_sessions, messages) must be preserved as the first "previous meeting." Tables need `meeting_id` foreign keys.

**Stack answer:** This is a SQL migration, not an application-level concern. The pattern is:

1. Create the `meetings` table
2. Insert a "Fellesmote 1" meeting row representing the existing data
3. Add `meeting_id` columns (nullable) to `stations`, `groups`, `station_sessions`
4. Backfill: `UPDATE stations SET meeting_id = [first-meeting-uuid]`
5. Add `NOT NULL` constraint after backfill
6. Add foreign key constraints
7. Update RLS policies to scope by meeting
8. Update Postgres functions (`open_station`, `complete_station`, `view_station`, `reopen_station`) to accept meeting context

This is standard Supabase migration workflow. The project already has 19 migrations following this pattern. No migration tool or ORM needed -- raw SQL in `supabase/migrations/` as established.

**Confidence: HIGH** -- Follows existing migration patterns exactly.

### 7. Per-Meeting Attendance

**What's needed:** Attendance tracking scoped to each meeting (currently a single `attending` boolean on `profiles`).

**Stack answer:** Move from `profiles.attending` (global) to a junction table `meeting_attendance(meeting_id, user_id, attending)`. The `AttendingToggle` component already exists -- it just needs to accept a `meetingId` prop and update the junction table instead of the profile column.

**No new libraries.** Same toggle UI, different table target.

**Confidence: HIGH** -- Minor refactor of existing component.

### 8. Per-Meeting Word Cloud and Export

**What's needed:** Word cloud and markdown export scoped to a specific meeting.

**Stack answer:** Both features already exist:
- `WordCloud.tsx` fetches all messages and builds word frequencies via `build-word-frequencies.ts`
- `build-markdown.ts` exports all station conversations

Both need a `meetingId` filter added to their Supabase queries. The components and logic remain unchanged.

**No new libraries.**

**Confidence: HIGH** -- Adding a `.eq('meeting_id', meetingId)` filter.

## Recommended Stack Changes

### New Dependencies: None

```bash
# No new packages to install
```

### New SQL Migrations Needed

| Migration | Purpose | Complexity |
|-----------|---------|------------|
| 020_meetings_table.sql | Create `meetings` table, insert first meeting, add `meeting_id` FK to `stations`, `groups`, `station_sessions`. Backfill existing data. | High -- most complex single migration |
| 021_meeting_attendance.sql | Create `meeting_attendance` junction table, migrate existing `profiles.attending` data, drop old column | Medium |
| 022_meeting_rls.sql | Update all RLS policies to scope by meeting. Update Postgres functions for meeting context. | Medium -- many policies to update |
| 023_meeting_stations_unique.sql | Change stations unique constraint from `UNIQUE(number)` to `UNIQUE(meeting_id, number)` | Low |

### New Next.js Routes Needed

| Route | Purpose | Type |
|-------|---------|------|
| `/admin/meetings` | Meeting list + create form | Server Component + Server Action |
| `/admin/meetings/[meetingId]` | Meeting detail: edit meeting, manage stations | Server Component + Server Action |
| `/admin/meetings/[meetingId]/groups` | Per-meeting group builder (moves from `/admin/groups`) | Server Component (reuses GroupBuilder) |
| `/admin/meetings/[meetingId]/export` | Per-meeting export | Route Handler |
| `/admin/meetings/[meetingId]/wordcloud` | Per-meeting word cloud | Server Component (reuses WordCloud) |
| `/dashboard/meetings` | Previous meetings list | Server Component |
| `/dashboard/meetings/[meetingId]` | Read-only meeting view | Server Component |

### New/Modified Server Actions

| Action | File | Change |
|--------|------|--------|
| `createMeeting` | `src/lib/actions/meeting.ts` (new) | New -- insert into meetings table |
| `updateMeeting` | `src/lib/actions/meeting.ts` (new) | New -- update meeting details |
| `deleteMeeting` | `src/lib/actions/meeting.ts` (new) | New -- soft delete or hard delete |
| `createStation` | `src/lib/actions/meeting.ts` (new) | New -- insert station for meeting |
| `updateStation` | `src/lib/actions/meeting.ts` (new) | New -- edit station title/questions |
| `deleteStation` | `src/lib/actions/meeting.ts` (new) | New -- remove station from meeting |
| `createGroup` | `src/lib/actions/admin.ts` (modify) | Add `meetingId` parameter |
| `saveGroupMembers` | `src/lib/actions/admin.ts` (modify) | Scope to meeting |
| `toggleGroupsLock` | `src/lib/actions/admin.ts` (modify) | Scope to meeting |
| `openStation` | `src/lib/actions/station.ts` (modify) | Already scoped by station_id which will have meeting_id FK |
| `updateAttending` | `src/lib/actions/auth.ts` (modify) | Accept meetingId, write to junction table |

## Alternatives Considered

| Decision | Alternative | Why Not |
|----------|-------------|---------|
| Native `<input type="date/time">` | react-datepicker | 3-5 meetings/year, mobile-first. Native pickers are better UX on mobile, zero bundle cost. |
| Native `Intl.DateTimeFormat('nb-NO')` | date-fns | Already working in production (UserTable, build-markdown). Adding 18kb for 4 format calls is wasteful. |
| Client-side `Array.filter()` for search | Fuse.js / flexsearch | 80 users. `String.toLowerCase().includes()` is O(n) on n=80. Fuzzy search adds complexity for no benefit at this scale. |
| Raw SQL migrations | Supabase CLI `supabase db diff` | The project manually writes SQL files in `supabase/migrations/`. This works well and gives full control over data backfill. Continue the established pattern. |
| Single `meetings` table | Separate `meeting_templates` table | Out of scope per PROJECT.md: "No recurring meeting templates -- admin creates each meeting manually." |
| Junction table for attendance | Keep `profiles.attending` + add `meeting_id` | `profiles.attending` is not meeting-scoped. A junction table `meeting_attendance(meeting_id, user_id, attending)` properly models per-meeting RSVP. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `date-fns` or `dayjs` | Overkill for formatting 3-4 dates in Norwegian. `Intl.DateTimeFormat` is already working in the codebase. | `new Date(str).toLocaleDateString('nb-NO', options)` |
| `react-datepicker` or `react-day-picker` | Admin creates 4-6 meetings/year. Native HTML date input renders OS-native picker on mobile. | `<input type="date">` + `<input type="time">` |
| `Fuse.js` or `flexsearch` | 80 users. Client-side `filter()` + `includes()` is instant. | `users.filter(u => u.name.toLowerCase().includes(query))` |
| `react-hook-form` or `formik` | Meeting creation is a simple 4-field form. The app already uses uncontrolled forms with server actions. | Plain HTML form + server action (established pattern) |
| `zod` for validation | Server-side validation is already done imperatively in server actions (see `register()` in auth.ts). Adding zod for 2-3 new forms is overhead. | Inline validation in server actions |
| `react-query` / `tanstack-query` | Data is server-fetched in Server Components. Client mutations use server actions with `revalidatePath`. No client-side cache management needed. | Server Components + `revalidatePath()` |
| `uuid` package | Supabase generates UUIDs server-side with `gen_random_uuid()`. No client-side UUID generation needed for meetings/stations. | Supabase default column values |
| Supabase CLI migration tooling | The project writes raw `.sql` files and applies them via Supabase dashboard. This works. Don't change the workflow mid-project. | Manual SQL files in `supabase/migrations/` |

## Integration Points with Existing Code

### Dashboard Restructure

The current dashboard (`src/app/dashboard/page.tsx`) is a monolithic 237-line Server Component that mixes contact info, station selection, and group display. For v1.1:

- **Dashboard root** becomes the contact directory (always visible)
- **Upcoming meeting** section shows if one exists (meeting info + attendance toggle + station selector when locked)
- **Previous meetings** link/section at bottom

This is a component decomposition task, not a technology change.

### Existing Components to Reuse

| Component | Current Use | v1.1 Reuse |
|-----------|-------------|------------|
| `StationSelector` | Dashboard station grid | Same, but scoped to meeting |
| `ChatRoom` | Live station chat | Same, already has readOnly mode |
| `GroupBuilder` | Admin group drag-and-drop | Same, but per meeting |
| `WordCloud` | Admin word cloud | Same, but scoped to meeting |
| `SearchInput` | (exists but unused in dashboard) | Contact directory search |
| `AttendingToggle` | Dashboard RSVP | Same, scoped to meeting |
| `UserTable` | Admin user list | Reuse for contact directory |
| `Badge` | Role badges | Same |
| `Card`, `Button`, `Input` | UI primitives | Same |

### Supabase Realtime Changes

Realtime chat (`useRealtimeChat.ts`) subscribes to `station:{sessionId}` channels. Station sessions already have a unique ID. Adding `meeting_id` to the stations table does not change the realtime subscription pattern -- sessions are still identified by their own UUID.

**No realtime changes needed.** The channel naming convention is session-based, not meeting-based.

### RLS Policy Updates

Current RLS policies on `station_sessions` and `messages` check group membership. These remain valid because:
- Groups are scoped to meetings (via `groups.meeting_id`)
- Station sessions are scoped to stations (which are scoped to meetings)
- The existing RLS chain (user -> group_member -> group -> station_session -> message) still holds

The only RLS additions needed are:
- `meetings` table: All authenticated users can read, only admins can write
- `meeting_attendance` table: Users can read all, update own row
- Updated station/group policies to verify `meeting_id` context where needed

## Version Compatibility

No changes from v1.0 stack. All existing version constraints remain valid:

| Package | Version | Status |
|---------|---------|--------|
| next | ^15.5.12 | Current, supported |
| react / react-dom | ^19.2.4 | Current, required by Next.js 15 |
| @supabase/supabase-js | ^2.97.0 | Latest stable (verified 2026-02-25) |
| @supabase/ssr | ^0.8.0 | Latest stable |
| tailwindcss | ^4 | Stable |
| @dnd-kit/react | ^0.3.2 | Stable, reused for per-meeting group builder |
| typescript | ^5 | Stable |

## Sources

- [Supabase Database Migrations docs](https://supabase.com/docs/guides/deployment/database-migrations) -- Migration workflow patterns (HIGH confidence)
- [Supabase RLS docs](https://supabase.com/docs/guides/getting-started/ai-prompts/database-rls-policies) -- Policy creation patterns (HIGH confidence)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) -- `[meetingId]` route patterns (HIGH confidence)
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.97.0 confirmed latest (HIGH confidence)
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) -- Norwegian locale `nb-NO` support (HIGH confidence)
- [formatjs/formatjs#3066](https://github.com/formatjs/formatjs/issues/3066) -- Chrome nb-NO issue was formatjs-specific, not Intl API. Resolved July 2024 (MEDIUM confidence)
- Existing codebase analysis: `src/lib/actions/admin.ts`, `src/lib/actions/station.ts`, `src/app/dashboard/page.tsx`, `supabase/migrations/001_schema.sql` through `019_update_stations_5.sql` -- Established patterns verified (HIGH confidence)

---
*Stack research for: Buss 2028 Fellesmote v1.1 -- multi-meeting platform additions*
*Researched: 2026-02-25*
