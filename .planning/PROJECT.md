# Buss 2028 Fellesmote-appen

## What This Is

A meeting-series webapp for the Buss 2028 project. Admin creates meetings with date, time, place, and custom discussion stations. Participants (youth and parents) rotate through stations in groups with real-time chat and countdown timers. Between meetings, the app serves as a searchable contact directory for all members. Previous meetings and their discussions are browsable in read-only mode. Admin manages meeting lifecycle, per-meeting groups, attendance tracking, and exports.

## Core Value

Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly — the meeting-day experience must work flawlessly on mobile.

## Requirements

### Validated

- ✓ Invite-code registration, parent-child linking, role-based routing — v1.0
- ✓ Admin user management, group builder with drag-and-drop, group locking — v1.0
- ✓ Real-time station chat via Supabase Broadcast, synchronized 15-min timer — v1.0
- ✓ Station lifecycle: end station, group redirect, read-only completed — v1.0
- ✓ Markdown export of all conversations — v1.0
- ✓ Mobile-first Norwegian UI with dark teal / coral / warm white palette — v1.0
- ✓ Meeting entity with date, time, place — admin creates meetings — v1.1
- ✓ Admin-configurable stations per meeting (title + questions + optional tip) — v1.1
- ✓ One upcoming meeting at a time (later relaxed: multiple upcoming with audience targeting) — v1.1
- ✓ Attendance list per meeting (who's coming / not coming) — v1.1
- ✓ Groups created fresh per meeting — v1.1
- ✓ All meeting-day features (chat, timer, station flow) scoped to a meeting — v1.1
- ✓ Previous meetings browsable with read-only discussion history — v1.1
- ✓ Searchable contact directory as main dashboard view — v1.1
- ✓ Two directory views: youth-centered (expand to see parents) and full everyone list — v1.1
- ✓ Contact info: name, phone, email with tap-to-call/email — v1.1
- ✓ Word cloud and export moved inside each meeting — v1.1
- ✓ Group admin and export moved under each meeting in admin section — v1.1
- ✓ No upcoming meeting state: directory + previous meetings — v1.1

### Active

(None — all current requirements shipped. Define new requirements via `/gsd:new-milestone`.)

### Out of Scope

- Email verification — invite code is sufficient barrier
- Push notifications — all participants are in the same room
- Image uploads in chat — text-only discussion notes
- Message editing/deletion — preserve full discussion history
- Offline support — mobile coverage assumed in meeting venue
- OAuth/social login — email/password via Supabase Auth is sufficient
- PDF export — Markdown ideal for downstream processing with Claude
- Recurring meeting templates — admin creates each meeting manually
- Station reuse from templates — admin writes stations fresh (simple title + questions)
- User-to-user messaging — directory exposes phone/email; Telegram for group chat

## Context

**Domain:** Norwegian "russ" culture — high school graduation celebration involving buses, groups, and organized activities. Parent-organized meetings to discuss topics before the 2028 celebration.

**Scale:** ~25 youth + ~30-50 parents + 1-3 admins. Small-scale, multi-meeting use. Meetings happen in-person — the app supplements face-to-face discussion and serves as contact directory between meetings.

**Current state:** Full v1.1 app shipped. 10,944 LOC TypeScript across 50+ files. 9 phases + 9 quick tasks completed. Meeting-series platform with admin-configurable meetings, contact directory, attendance tracking, and meeting history.

**Tech stack:** Next.js 15 (App Router), React 19, Supabase (Auth + Database + Realtime), Tailwind CSS v4, TypeScript. Deployed on Vercel.

**Database:** Meeting-scoped schema with meetings, stations, groups, station_sessions, messages tables. FK chains ensure all data is scoped to a meeting. Supabase Broadcast for real-time chat. Postgres RPC functions for station lifecycle.

**Quick tasks shipped (v1.1):** Nordic character fixes, editable meeting details, desktop layout improvements, youth expansion card redesign, attendance bug fix, is_admin flag, profile page with avatar, audience targeting for meetings.

## Constraints

- **Tech stack**: Next.js 15 (App Router), Supabase (Auth + Database + Realtime), Tailwind CSS v4, TypeScript
- **Deployment**: Vercel (auto-deploy from git), Supabase free tier
- **Language**: All UI text in Norwegian (bokmal)
- **Design**: Mobile-first, dark teal / coral / warm white palette
- **Database**: Meeting-scoped schema — all new features must respect FK chains
- **Realtime**: Supabase free tier limit of 200 concurrent connections

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + DB + realtime | Single platform for all backend needs, free tier sufficient for scale | ✓ Good |
| Invite codes instead of email verification | Simpler registration, closed group already known | ✓ Good |
| Soft timer (chat stays open at 0:00) | Groups self-manage pace, timer is guidance not enforcement | ✓ Good |
| Markdown export (not PDF) | Downstream processing with Claude for meeting summaries | ✓ Good |
| No message edit/delete | Preserves complete discussion history for export | ✓ Good |
| Mobile-first design | Most participants will use phones during the meeting | ✓ Good |
| Fresh build over existing code | Clean start aligned with comprehensive PRD | ✓ Good |
| Next.js 15 over 14 | v14 EOL Oct 2025, pinned to v15.5 | ✓ Good |
| Admin-configurable stations per meeting | Replaces hardcoded 6 stations from v1.0 | ✓ Good |
| Meeting-scoped schema migration | Nullable-then-backfill-then-NOT-NULL for safe FK migration | ✓ Good |
| UUID preservation during migration | All existing FK references remain valid | ✓ Good |
| Groups per-meeting (new UUIDs each time) | Eliminates Realtime compound filter limitation | ✓ Good |
| Zero new npm dependencies for v1.1 | Existing stack covers all v1.1 features | ✓ Good |
| @dnd-kit/react for station reordering | Consistent DnD UX matching group builder | ✓ Good |
| Inline MessageList for meeting history | Avoids h-dvh layout conflict with full ChatRoom | ✓ Good |
| URL-driven station/group picker state | Browser navigation support for meeting history | ✓ Good |
| is_admin boolean flag | Decouples admin access from role column | ✓ Good |
| Audience targeting on meetings | Allows youth-only and parent-only meetings | ✓ Good |

---
*Last updated: 2026-02-26 after v1.1 milestone*
