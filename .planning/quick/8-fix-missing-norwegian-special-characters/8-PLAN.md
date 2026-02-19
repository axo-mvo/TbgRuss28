---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/actions/station.ts
  - src/lib/actions/admin.ts
  - src/components/station/ReopenDialog.tsx
  - src/components/station/ChatRoom.tsx
  - src/components/station/StationCard.tsx
  - src/components/station/StationHeader.tsx
  - src/components/admin/UserTable.tsx
  - src/components/admin/GroupBuilder.tsx
  - src/components/admin/ParentLinkSheet.tsx
  - src/components/dashboard/RegisteredUsersOverview.tsx
  - src/components/dashboard/ParentInviteBanner.tsx
  - src/app/admin/page.tsx
  - src/app/register/page.tsx
  - src/app/login/page.tsx
  - src/app/dashboard/page.tsx
autonomous: true
requirements: [QUICK-8]

must_haves:
  truths:
    - "All user-facing Norwegian text uses correct special characters (ae->ae is fine, but missing a/o/aa must be fixed to a/o/aa)"
    - "No ASCII approximations remain for Norwegian characters in UI strings or error messages"
  artifacts:
    - path: "src/lib/actions/station.ts"
      provides: "Corrected Norwegian error messages"
    - path: "src/components/station/ChatRoom.tsx"
      provides: "Corrected Norwegian UI labels"
    - path: "src/components/admin/GroupBuilder.tsx"
      provides: "Corrected lock/unlock group labels"
  key_links: []
---

<objective>
Fix all missing Norwegian special characters (ae->ae, oe->oe, a->aa / a->a, o->o, aa->a) across the entire codebase.

Purpose: Norwegian users see broken text without proper ae, oe, aa characters, making the app look unprofessional.
Output: All 15 files corrected with proper Norwegian characters.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Norwegian special characters in server actions</name>
  <files>src/lib/actions/station.ts, src/lib/actions/admin.ts</files>
  <action>
Fix all ASCII approximations of Norwegian special characters in these server action files:

**src/lib/actions/station.ts:**
- Line 70: `'Kunne ikke apne stasjonen'` -> `'Kunne ikke åpne stasjonen'`
- Line 96: `'Meldingen kan ikke vaere tom'` -> `'Meldingen kan ikke være tom'`
- Line 130: `'Okt ikke funnet'` -> `'Økt ikke funnet'`
- Line 182: `'Okt ikke funnet'` -> `'Økt ikke funnet'`
- Line 202: `'Kunne ikke gjenapne stasjonen'` -> `'Kunne ikke gjenåpne stasjonen'`

**src/lib/actions/admin.ts:**
- Line 247: `'Kunne ikke lase gruppene'` -> `'Kunne ikke låse gruppene'`
- Line 247: `'Kunne ikke lase opp gruppene'` -> `'Kunne ikke låse opp gruppene'`
  </action>
  <verify>Run `grep -rn "apne\|vaere\|Okt ikke\|gjenapne\|lase " src/lib/actions/` and confirm zero matches.</verify>
  <done>All error messages in server actions use correct Norwegian special characters.</done>
</task>

<task type="auto">
  <name>Task 2: Fix Norwegian special characters in all components and pages</name>
  <files>
    src/components/station/ReopenDialog.tsx,
    src/components/station/ChatRoom.tsx,
    src/components/station/StationCard.tsx,
    src/components/station/StationHeader.tsx,
    src/components/admin/UserTable.tsx,
    src/components/admin/GroupBuilder.tsx,
    src/components/admin/ParentLinkSheet.tsx,
    src/components/dashboard/RegisteredUsersOverview.tsx,
    src/components/dashboard/ParentInviteBanner.tsx,
    src/app/admin/page.tsx,
    src/app/register/page.tsx,
    src/app/login/page.tsx,
    src/app/dashboard/page.tsx
  </files>
  <action>
Fix all ASCII approximations of Norwegian special characters in component/page files:

**src/components/station/ReopenDialog.tsx:**
- Line 40: `Gjenapne stasjon?` -> `Gjenåpne stasjon?`
- Line 43: `gruppen far.` -> `gruppen får.`
- Line 75: `'Apner...'` -> `'Åpner...'` and `'Gjenapne'` -> `'Gjenåpne'`

**src/components/station/ChatRoom.tsx:**
- Line 187: `Diskusjonssporsmal:` -> `Diskusjonsspørsmål:`
- Line 206: `Nar dere er klare, trykk start for a begynne` -> `Når dere er klare, trykk start for å begynne`
- Line 271: `Gjenapne` -> `Gjenåpne`
- Line 283: `sikker pa at` -> `sikker på at`

**src/components/station/StationCard.tsx:**
- Line 25: `Fullfort` -> `Fullført`
- Line 64: `'Apner...'` -> `'Åpner...'`

**src/components/station/StationHeader.tsx:**
- Line 67: `Fullfort` -> `Fullført`

**src/components/admin/UserTable.tsx:**
- Line 163: `Sok etter bruker...` -> `Søk etter bruker...`
- Line 180: `Sok etter bruker...` -> `Søk etter bruker...`
- Line 187: `Prov et annet sokeord` -> `Prøv et annet søkeord`
- Line 365: `Navarende rolle:` -> `Nåværende rolle:`
- Line 427: `sikker pa at` -> `sikker på at`

**src/components/admin/GroupBuilder.tsx:**
- Line 243: `'Las opp grupper'` -> `'Lås opp grupper'` and `'Las grupper'` -> `'Lås grupper'`
- Line 249: `Grupper er last` -> `Grupper er låst`
- Line 369: `'Las opp grupper?'` -> `'Lås opp grupper?'` and `'Las grupper?'` -> `'Lås grupper?'`
- Line 372: `last opp` -> `låst opp`, `pa dashbordet` -> `på dashbordet`
- Line 373: `pa dashbordet` -> `på dashbordet` (if separate occurrence)
- Line 375: `'Las opp'` -> `'Lås opp'` and `'Las grupper'` -> `'Lås grupper'`
- Line 387-388: `pa at du vil slette` -> `på at du vil slette`

**src/components/admin/ParentLinkSheet.tsx:**
- Line 58: `enna` -> `ennå` (in "Ingen ungdommer registrert enna")

**src/components/dashboard/RegisteredUsersOverview.tsx:**
- Line 24: `enna` -> `ennå` (in "Ingen ungdommer registrert enna")

**src/components/dashboard/ParentInviteBanner.tsx:**
- Line 12: `pa fellsmotet pa onsdag pa` -> `på fellesmøtet på onsdag på`

**src/app/admin/page.tsx:**
- Line 46: `las gruppene` -> `lås gruppene`

**src/app/register/page.tsx:**
- Line 9: `Fellesmote` -> `Fellesmøte`

**src/app/login/page.tsx:**
- Line 8: `Fellesmote` -> `Fellesmøte`

**src/app/dashboard/page.tsx:**
- Line 119: `fellesmote-diskusjonene` -> `fellesmøte-diskusjonene`
- Line 139: `enna` -> `ennå`
  </action>
  <verify>Run `grep -rn "Gjenapne\|Fullfort\|apne\|Fellesmote\|Las opp\|Las grupper\| last \|Navarende\| pa \|enna\b\|sporsmal\| far\.\|Sok \|sokeord\|fellsmotet" src/components/ src/app/` and confirm zero matches for ASCII-approximated Norwegian words. Note: some words like "far" may have valid uses -- verify only the specific broken instances are gone.</verify>
  <done>All UI labels, dialog text, empty states, and page titles across all 13 component/page files use correct Norwegian special characters.</done>
</task>

</tasks>

<verification>
After both tasks:
1. `grep -rn "vaere\|apne\b\|Gjenapne\|gjenapne\|Fullfort\|Fellesmote\b\|Las opp\|Las grupper\|Grupper er last\|Navarende\|Prov \|sokeord\|sporsmal\| enna\b\|Okt ikke\|lase " src/` should return zero results
2. `npm run build` passes without errors (confirms no syntax issues from edits)
</verification>

<success_criteria>
All 15 files contain correct Norwegian special characters. No ASCII approximations of ae, oe, aa remain in user-facing strings. Build passes clean.
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-missing-norwegian-special-characters/8-SUMMARY.md`
</output>
