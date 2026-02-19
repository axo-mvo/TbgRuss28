# External Integrations

**Analysis Date:** 2026-02-19

## APIs & External Services

**Supabase (Primary Platform):**
- Supabase provides Auth, Database, Realtime, and Storage
  - SDK/Client: `@supabase/supabase-js` (v2+)
  - SSR utilities: `@supabase/ssr` (v0.5+)
  - Auth method: email/password via `auth.signUp()` and `auth.signInWithPassword()`

## Data Storage

**Databases:**
- PostgreSQL (hosted by Supabase)
  - Connection: Via `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser) and `SUPABASE_SERVICE_ROLE_KEY` (server)
  - ORM/Client: Supabase JavaScript client (no traditional ORM like Prisma used - direct SQL queries)
  - Tables: `invite_codes`, `profiles`, `parent_youth_links`, `groups`, `group_members`, `stations`, `station_sessions`, `messages`, `meeting_status`
  - Seed data: 6 hardcoded stations with questions and tips

**File Storage:**
- Not detected - Markdown export generated as in-memory string and downloaded directly to browser

**Caching:**
- None detected - real-time data via Supabase Realtime subscriptions

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: Email/password authentication via `signUp()` and `signInWithPassword()` in `@supabase/supabase-js`
  - Session storage: Via Supabase Auth JWT tokens (stored in browser localStorage or cookies via SSR)
  - User creation: Triggered during registration flow with `invite_codes` validation (server-side function `validate_invite_code()`)
  - Authorization: Role-based access control via `profiles.role` field (admin/youth/parent) and database Row Level Security (RLS) policies

**Invite Code Flow:**
- Stored in `invite_codes` table with: `code` (string), `role` (youth/parent), `is_active` (boolean), `max_uses` (integer), `uses` (integer counter)
- Validation function: `validate_invite_code(p_code text)` - checks code existence, activity status, and use count
- Multi-phase registration: Phase 1 (youth), Phase 2 (parent with child links)

## Monitoring & Observability

**Error Tracking:**
- None detected - error handling via try/catch in React components and Next.js error boundaries

**Logs:**
- None detected - application-level logging not specified
- Supabase provides database logs accessible via dashboard

## CI/CD & Deployment

**Hosting:**
- Vercel - deployment platform for Next.js (specified in PRD as "Vercel")
- Auto-deployment from Git repository on push
- Vercel provides free `.vercel.app` subdomain; custom domain optional

**CI Pipeline:**
- None detected - Vercel handles build and deploy automatically
- Next.js production builds: `next build` then `next start`

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, safe in browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, limited permissions)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only, full admin access)

**Optional env vars:**
- None specified

**Secrets location:**
- `.env.local` for local development (must be in `.gitignore`)
- Vercel Environment Variables dashboard for production
- No external secrets manager (e.g., Vault, AWS Secrets Manager) used

## Webhooks & Callbacks

**Incoming:**
- None detected - app is synchronous and real-time subscription based

**Outgoing:**
- None detected - no external service callbacks or notifications
- Markdown export is downloaded directly to browser; no email or external system integration

## Real-Time Communication

**Supabase Realtime:**
- Enabled on 3 tables:
  - `messages` - Live chat updates during station discussions
  - `station_sessions` - Status changes (started, completed) for auto-redirect
  - `meeting_status` - Meeting start/end notifications for all participants
- Implementation: WebSocket connections managed by `@supabase/supabase-js` client
- Client-side subscriptions in React components using `.on('*', callback)` listener pattern

## Data Export & Reporting

**Meeting Data Export:**
- Format: Markdown (.md file)
- Database function: `export_meeting_data()` - aggregates messages grouped by station and group
- Trigger: Admin panel "Eksporter samtaler" button
- Output: Markdown structure with timestamps, author names, roles, and message content
- Delivery: Direct browser download (not emailed or stored)

## Database Functions & Stored Procedures

**Key Functions:**

1. `validate_invite_code(p_code text)` - Returns JSON with `{valid: boolean, role?: string, error?: string}`
   - Checks code existence, active status, and use limits
   - Increments use counter on valid code

2. `start_station_session(p_station_id integer, p_group_id uuid)` - Returns `station_sessions` row
   - Upsert logic: sets `started_at` and `status = 'active'` on first call
   - Called when first group member opens a station

3. `export_meeting_data()` - Returns JSONB aggregation
   - Structures all messages by station → group → chronological order
   - Called by admin export endpoint

4. `is_admin()` - Helper function
   - Returns boolean: checks if current user has `role = 'admin'` in `profiles`
   - Used in RLS policies for admin-only operations

## Row Level Security (RLS) Policies

**Access Control (Database Layer):**

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `profiles` | All authenticated can read | Server-side function | User can update own | Admin only |
| `messages` | Only own group members | Only in own group | Not allowed | Not allowed |
| `groups` | All authenticated | Admin only | Admin only | Admin only |
| `group_members` | All authenticated | Admin only | Admin only | Admin only |
| `station_sessions` | Own group only | Admin only | Own group can update | Admin only |
| `stations` | All authenticated | Not allowed | Not allowed | Not allowed |
| `invite_codes` | All authenticated (validation) | Admin only | Admin only | Admin only |
| `meeting_status` | All authenticated | Not allowed | Admin only | Not allowed |
| `parent_youth_links` | All authenticated | Admin only | Admin only | Admin only |

## Third-Party Dependencies (Minimal)

- No external API integrations (Stripe, Sendgrid, Slack, etc.)
- No CDN or external image hosting
- No analytics platform (Google Analytics, Mixpanel, etc.)
- No payment processing

## Security Considerations

**Authentication:**
- Email/password only - no OAuth (Google, GitHub) configured
- Supabase Auth handles secure password storage and JWT generation
- Auth state managed via Supabase session tokens

**Authorization:**
- Role-based access control (RBAC) via `profiles.role`
- Row Level Security policies enforce data access at database level
- Admin operations protected by `is_admin()` function in RLS policies

**Data Protection:**
- `messages` table limits content length to 2000 characters (database constraint)
- Invitation codes validate before user creation (prevents unauthorized signups)
- Service role key must never be exposed to browser - only in `.env` on server

---

*Integration audit: 2026-02-19*
