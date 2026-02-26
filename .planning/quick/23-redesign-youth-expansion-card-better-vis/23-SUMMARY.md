---
phase: quick-23
plan: 01
subsystem: ui
tags: [tailwind, react, mobile-first, contact-directory]

requires:
  - phase: 08-dashboard
    provides: "YouthDirectoryView and ContactActions components"
provides:
  - "Redesigned youth directory cards with connected expansion and compact contact layout"
affects: [dashboard, contact-directory]

tech-stack:
  added: []
  patterns: ["compact ContactActions variant for inline name+phone layout", "wrapper div with overflow-hidden for connected details expansion"]

key-files:
  created: []
  modified:
    - src/components/dashboard/ContactActions.tsx
    - src/components/dashboard/YouthDirectoryView.tsx

key-decisions:
  - "Used wrapper div with overflow-hidden for connected card+expansion instead of styling details element directly"
  - "Compact variant uses text-text-muted (not teal) so phone reads as info, not action"

patterns-established:
  - "Compact ContactActions: inline phone display for name+phone same-line layouts"
  - "Connected details expansion: wrapper div provides border/bg, details has no styling"

requirements-completed: [QUICK-23]

duration: 1min
completed: 2026-02-26
---

# Quick Task 23: Redesign Youth Expansion Card Summary

**Cohesive youth directory cards with name+phone inline, email in summary, connected expansion, and parent section with 'Foreldre' label and mirrored layout**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T14:57:39Z
- **Completed:** 2026-02-26T14:59:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added compact ContactActions variant for inline phone display next to names
- Redesigned youth cards with name+phone on same line, email underneath in summary
- Connected expansion section shares card border as one cohesive unit
- Parent section has "Foreldre" heading with bg-gray-50 cards mirroring youth layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Add compact phone display variant to ContactActions** - `c765813` (feat)
2. **Task 2: Redesign YouthDirectoryView card layout with connected expansion** - `b0a689b` (feat)

## Files Created/Modified
- `src/components/dashboard/ContactActions.tsx` - Added 'compact' variant for tappable inline phone display with text-sm sizing and text-text-muted color
- `src/components/dashboard/YouthDirectoryView.tsx` - Redesigned card structure with wrapper div for shared border, name+phone inline, email in summary, connected expansion, Foreldre label, parent cards in bg-gray-50

## Decisions Made
- Used wrapper div with `overflow-hidden` around details element so both summary and expanded content share the same border/background, creating a visually connected card
- Compact variant uses `text-text-muted` instead of teal so the phone number reads as contact information rather than a call-to-action, keeping visual hierarchy clean
- Added `items-start` instead of `items-center` on summary so badge aligns with name line while email sits below

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Youth directory cards are fully redesigned with connected expansion
- ContactActions compact variant available for reuse in other directory views

---
*Quick Task: 23-redesign-youth-expansion-card-better-vis*
*Completed: 2026-02-26*
