# Buss 2028 Fellesmote-appen

## What This Is

A meeting-series webapp for the Buss 2028 project. Admin creates meetings with date, time, place, and custom discussion stations. Participants (youth and parents) rotate through stations in groups with real-time chat and countdown timers. Between meetings, the app serves as a contact directory for all members. Previous meetings and their discussions are browsable in read-only mode.

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

### Active

- [ ] Meeting entity with date, time, place — admin creates meetings
- [ ] Admin-configurable stations per meeting (title + questions + optional tip)
- [ ] One upcoming meeting at a time, unlimited previous meetings
- [ ] Attendance list per meeting (who's coming / not coming)
- [ ] Groups created fresh per meeting
- [ ] All meeting-day features (chat, timer, station flow) scoped to a meeting
- [ ] Previous meetings browsable with read-only discussion history
- [ ] Searchable contact directory as main dashboard view
- [ ] Two directory views: youth-centered (expand to see parents) and full everyone list
- [ ] Contact info: name, phone, email
- [ ] Word cloud moved inside each meeting
- [ ] Group admin and export moved under each meeting in admin section
- [ ] No upcoming meeting state: directory + previous meetings

### Out of Scope

- Email verification — invite code is sufficient barrier
- Push notifications — all participants are in the same room
- Image uploads in chat — text-only discussion notes
- Message editing/deletion — preserve full discussion history
- Offline support — mobile coverage assumed in meeting venue
- OAuth/social login — email/password via Supabase Auth is sufficient
- PDF export — Markdown ideal for downstream processing with Claude
- Recurring meeting templates — admin creates each meeting manually
- Multiple concurrent upcoming meetings — one next meeting at a time
- Station reuse from templates — admin writes stations fresh (simple title + questions)

## Context

**Domain:** Norwegian "russ" culture — high school graduation celebration involving buses, groups, and organized activities. Parent-organized meetings to discuss topics before the 2028 celebration.

**Scale:** ~25 youth + ~30-50 parents + 1-3 admins. Small-scale, multi-meeting use. Meetings happen in-person — the app supplements face-to-face discussion and serves as contact directory between meetings.

**Existing code:** Full v1.0 app built with Next.js 15, Supabase, Tailwind CSS. All 5 phases + 18 quick tasks completed. Currently single-meeting model with hardcoded stations.

**PRD:** Original PRD at `Buss2028_Fellesmote_App_PRD.md` — covers v1.0 schema. v1.1 requires schema evolution (meeting entity, per-meeting stations/groups/sessions).

**Current stations:** 6 hardcoded stations seeded in DB. v1.1 makes stations admin-configurable per meeting.

## Constraints

- **Tech stack**: Next.js 15 (App Router), Supabase (Auth + Database + Realtime), Tailwind CSS, TypeScript
- **Deployment**: Vercel (auto-deploy from git), Supabase free tier
- **Language**: All UI text in Norwegian (bokmal)
- **Database**: Evolving from v1.0 schema — must migrate existing data (stations, groups, sessions, messages) into meeting-scoped structure
- **Design**: Existing color palette and responsive design preserved
- **Backwards compatibility**: Existing v1.0 meeting data should be preserved as the first "previous meeting"

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + DB + realtime | Single platform for all backend needs, free tier sufficient for scale | ✓ Good |
| Invite codes instead of email verification | Simpler registration, closed group already known | ✓ Good |
| Soft timer (chat stays open at 0:00) | Groups self-manage pace, timer is guidance not enforcement | ✓ Good |
| Markdown export (not PDF) | Downstream processing with Claude for meeting summaries | ✓ Good |
| No message edit/delete | Preserves complete discussion history for export | ✓ Good |
| Mobile-first design | Most participants will use phones during the meeting | ✓ Good |
| Hardcoded 6 stations | Fixed content, seed data sufficient, no CMS needed | ⚠️ Revisit — v1.1 makes stations admin-configurable per meeting |
| Fresh build over existing code | Clean start aligned with comprehensive PRD | ✓ Good |
| Next.js 15 over 14 | v14 EOL Oct 2025, pinned to v15.5 | ✓ Good |

## Current Milestone: v1.1 Multi-Meeting Platform

**Goal:** Evolve from a single-meeting app to a meeting-series platform with admin-configurable meetings, a contact directory, and browsable meeting history.

**Target features:**
- Meeting entity with date, time, place, and admin-configurable stations
- Per-meeting containers for attendance, groups, discussions, word cloud, export
- Searchable contact directory as the permanent dashboard
- Previous meetings browsable in read-only mode

---
*Last updated: 2026-02-25 after v1.1 milestone start*
