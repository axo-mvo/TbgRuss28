# Buss 2028 Fellesmote-appen

## What This Is

A webapp for structured group discussions during a "fellesmote" (joint meeting) between parents and youth in the Buss 2028 project. 25 boys and their parents are divided into groups that rotate between 6 discussion stations, each with a topic, guiding questions, and a 15-minute countdown timer. Real-time chat lets groups capture their discussions. Admin controls group assignment, meeting flow, and data export.

## Core Value

Groups can have real-time discussions at stations with a visible timer and see each other's messages instantly — the meeting-day experience must work flawlessly on mobile.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Invite-code-based registration with youth/parent roles
- [ ] Parent registration with child-linking (dropdown of registered youth)
- [ ] Email/password login with role-based routing (admin/participant)
- [ ] Admin panel: user management, invite codes, group assignment, meeting control, export
- [ ] Group assignment with parent-follows-child logic and admin override
- [ ] Station selector dashboard showing 6 stations with per-group status (available/active/completed)
- [ ] Real-time group chat per station via Supabase Realtime
- [ ] 15-minute countdown timer per station per group (starts on first member entry)
- [ ] Collapsible question panel with 4 discussion questions + tip per station
- [ ] End-station flow: confirmation, mark completed, redirect all group members
- [ ] Completed stations viewable in read-only mode
- [ ] Markdown export of all conversations grouped by station and group
- [ ] Mobile-optimized UI (primary device is phone)
- [ ] Norwegian (bokmal) UI throughout
- [ ] Specific color palette: dark teal primary (#1B4D5C), coral accent (#E8734A), warm white bg (#FBF8F4)

### Out of Scope

- Email verification — invite code is sufficient barrier
- Push notifications — all participants are in the same room
- Image uploads in chat — text-only discussion notes
- Message editing/deletion — preserve full discussion history
- Offline support — mobile coverage assumed in meeting venue
- OAuth/social login — email/password via Supabase Auth is sufficient
- PDF export — Markdown ideal for downstream processing with Claude

## Context

**Domain:** Norwegian "russ" culture — high school graduation celebration involving buses, groups, and organized activities. This is a parent-organized meeting to discuss topics like community, inclusion, substance prevention, and budgeting before the 2028 celebration.

**Scale:** ~25 youth + ~30-50 parents + 1-3 admins. Small-scale, single-event use. Meeting happens in-person in one room — the app supplements face-to-face discussion.

**Existing code:** Starting fresh. Existing codebase files are GSD tooling only, no app code yet.

**PRD:** Comprehensive PRD exists at `Buss2028_Fellesmote_App_PRD.md` with complete database schema, RLS policies, SQL functions, seed data, component structure, and design specs.

**6 hardcoded stations:** Fixed content with Norwegian discussion topics covering community, inclusion, substance prevention, budgeting, financing, and regulation changes. Seeded into database.

## Constraints

- **Tech stack**: Next.js 14 (App Router), Supabase (Auth + Database + Realtime), Tailwind CSS, TypeScript — as specified in PRD
- **Timeline**: Days away from the meeting — must ship core meeting-day flow ASAP
- **Deployment**: Vercel (auto-deploy from git), Supabase free tier
- **Language**: All UI text in Norwegian (bokmal)
- **Database**: Full schema specified in PRD sections 7.1-7.5 including RLS, functions, seed data
- **Design**: Color palette and responsive breakpoints specified in PRD section 9

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + DB + realtime | Single platform for all backend needs, free tier sufficient for scale | — Pending |
| Invite codes instead of email verification | Simpler registration, closed group already known | — Pending |
| Soft timer (chat stays open at 0:00) | Groups self-manage pace, timer is guidance not enforcement | — Pending |
| Markdown export (not PDF) | Downstream processing with Claude for meeting summaries | — Pending |
| No message edit/delete | Preserves complete discussion history for export | — Pending |
| Mobile-first design | Most participants will use phones during the meeting | — Pending |
| Hardcoded 6 stations | Fixed content, seed data sufficient, no CMS needed | — Pending |
| Fresh build over existing code | Clean start aligned with comprehensive PRD | — Pending |

---
*Last updated: 2026-02-19 after initialization*
