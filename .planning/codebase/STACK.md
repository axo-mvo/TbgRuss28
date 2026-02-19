# Technology Stack

**Analysis Date:** 2026-02-19

## Languages

**Primary:**
- TypeScript 5 - All application code (React components, Next.js pages, utilities)

**Secondary:**
- SQL (PostgreSQL) - Database schema, functions, and migrations in Supabase

## Runtime

**Environment:**
- Node.js (implied by Next.js 14)

**Package Manager:**
- npm (assumed - typical for Next.js projects)
- Lockfile: Not yet created (project in planning phase)

## Frameworks

**Core:**
- Next.js 14 - Full-stack React framework with App Router for server and client components
- React 18+ - UI library (included with Next.js)

**Styling:**
- Tailwind CSS 3.4 - Utility-first CSS framework for responsive, mobile-first design

**Testing:**
- Not yet specified in PRD - recommend Jest + React Testing Library

**Build/Dev:**
- Next.js built-in build system - Dev server, production builds, code splitting

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2 - JavaScript/TypeScript client for Supabase API (Auth, Database, Realtime)
- `@supabase/ssr` ^0.5 - Server-side rendering utilities for Supabase Auth in Next.js App Router

**UI & Utilities:**
- `tailwindcss` ^3.4 - Styling framework
- System fonts (no additional font packages required)

## Configuration

**Environment:**
- Environment variables in `.env.local` (Next.js standard)
- Required vars:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public, safe in browser)
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only, sensitive)

**Build:**
- Next.js `next.config.js` (default configuration, no custom config specified)
- `tsconfig.json` for TypeScript configuration
- `tailwind.config.js` for Tailwind CSS customization

**Development:**
- `.env.local` for local development
- `.env.production` for production (handled by Vercel)

## Platform Requirements

**Development:**
- Node.js runtime (npm install dependencies)
- TypeScript knowledge
- Basic understanding of Next.js App Router
- Supabase project setup (free tier sufficient)

**Production:**
- Vercel hosting (specified in PRD, auto-deploy from Git)
- Supabase (PostgreSQL database, Auth, Realtime)
- Custom domain optional (Vercel provides `.vercel.app` subdomain)

## Key Implementation Details

**Authentication:**
- Supabase Auth with email/password method
- Auth middleware in `src/middleware.ts` for route protection
- User profiles extended in `profiles` table with `role` field (admin/youth/parent)

**Database:**
- PostgreSQL via Supabase
- 9 tables: `invite_codes`, `profiles`, `parent_youth_links`, `groups`, `group_members`, `stations`, `station_sessions`, `messages`, `meeting_status`
- Row Level Security (RLS) enabled on all tables for authorization
- Database functions for: `start_station_session()`, `validate_invite_code()`, `export_meeting_data()`

**Real-time Communication:**
- Supabase Realtime subscriptions on:
  - `messages` table - for live chat updates
  - `station_sessions` table - for station status changes
  - `meeting_status` table - for meeting start/end notifications

**Styling Approach:**
- Tailwind CSS utility classes (no separate CSS files)
- Mobile-first responsive design (< 640px primary, 640–1024px tablet, > 1024px desktop)
- Color palette: Teal (#1B4D5C, #2A7F8E), Coral (#E8734A), custom semantic colors

## Architecture Decisions

**No Backend Framework:**
- Next.js API routes handle server-side logic
- Supabase provides database + auth + realtime (no separate backend service)

**Monolithic Approach:**
- Single Next.js codebase for client + server
- Frontend and backend tightly integrated (typical for Next.js)

**No External Build Tools:**
- Next.js handles transpilation, bundling, and optimization
- No webpack, Babel, or rollup configuration required

---

*Stack analysis: 2026-02-19*
