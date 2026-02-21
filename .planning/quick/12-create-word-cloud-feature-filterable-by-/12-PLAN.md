---
phase: quick-12
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/wordcloud/page.tsx
  - src/lib/wordcloud/build-word-frequencies.ts
  - src/components/admin/WordCloud.tsx
  - src/app/admin/page.tsx
autonomous: true
requirements: [QUICK-12]
must_haves:
  truths:
    - "Admin can see a word cloud visualization of all chat messages"
    - "Admin can filter word cloud by group, by station, or see all combined"
    - "Words are sized proportionally to their frequency"
    - "Common Norwegian stop words are excluded from the cloud"
  artifacts:
    - path: "src/lib/wordcloud/build-word-frequencies.ts"
      provides: "Word frequency calculation with Norwegian stop word filtering"
    - path: "src/components/admin/WordCloud.tsx"
      provides: "Client component rendering interactive word cloud with filter controls"
    - path: "src/app/admin/wordcloud/page.tsx"
      provides: "Admin page fetching messages and rendering word cloud"
  key_links:
    - from: "src/app/admin/wordcloud/page.tsx"
      to: "supabase messages table"
      via: "admin client query with station_sessions joins"
      pattern: "admin.*from.*messages.*select"
    - from: "src/app/admin/wordcloud/page.tsx"
      to: "src/components/admin/WordCloud.tsx"
      via: "passes messages, groups, and stations as props"
    - from: "src/components/admin/WordCloud.tsx"
      to: "src/lib/wordcloud/build-word-frequencies.ts"
      via: "calls buildWordFrequencies with filtered messages"
      pattern: "buildWordFrequencies"
---

<objective>
Create an admin word cloud page that visualizes the most frequently used words across all chat messages, with filters to view all messages, per group, or per station.

Purpose: Give admin a visual overview of discussion themes and most-talked-about topics across the meeting.
Output: New `/admin/wordcloud` page accessible from admin panel, with a CSS-based word cloud and filter controls.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/app/api/export/route.ts
@src/app/admin/page.tsx
@src/app/admin/layout.tsx
@src/lib/supabase/admin.ts
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create word frequency utility and word cloud component</name>
  <files>
    src/lib/wordcloud/build-word-frequencies.ts
    src/components/admin/WordCloud.tsx
  </files>
  <action>
**1. `src/lib/wordcloud/build-word-frequencies.ts`** — Pure utility function:

Create a `buildWordFrequencies(texts: string[]): { word: string; count: number }[]` function that:
- Joins all texts, lowercases, removes punctuation (keep Norwegian chars aaeoeaa)
- Splits by whitespace
- Filters out words < 3 characters
- Filters out a comprehensive list of Norwegian stop words (og, er, det, i, at, en, et, til, for, pa, med, har, som, av, de, den, var, vi, kan, om, fra, ikke, sa, seg, men, ble, da, skal, vil, nar, ut, sin, han, hun, hva, alle, noe, noen, dette, disse, oss, dem, jeg, du, han, hun, meg, deg, min, din, man, var, bare, her, der, over, under, etter, ved, hadde, hun, ham, sine, sitt, vart, bli, blitt, ma, far, mot, jo, ja, nei, ganske, veldig, svart, litt, fordi, hvis, eller, enten, bade, mens, siden, hvor, hvordan, hvilke, hvilket, hvilken, hvilke, kunne, skulle, ville, burde, matte, ha, vaere, blitt, vare, vart, fa, fikk, fatt, ga, gatt, nok, enda, opp, inn, gjennom, hele, hver, andre, annet, anna, anna, selv, kanskje, derfor, dessuten)
- Counts occurrences of remaining words
- Returns array sorted by count descending (top 80 words max)

**2. `src/components/admin/WordCloud.tsx`** — Client component ('use client'):

Props interface:
```ts
interface WordCloudMessage {
  content: string
  groupId: string
  groupName: string
  stationId: string
  stationNumber: number
  stationTitle: string
}

interface WordCloudProps {
  messages: WordCloudMessage[]
  groups: { id: string; name: string }[]
  stations: { id: string; number: number; title: string }[]
}
```

Implementation:
- State: `filterType: 'all' | 'group' | 'station'` and `filterValue: string` (the group_id or station_id)
- Filter controls at top: three segment-style buttons ("Alle", "Per gruppe", "Per stasjon"). When "Per gruppe" or "Per stasjon" is selected, show a row of pill buttons for each group name or station title below. Style the active pill with `bg-teal-primary text-white` and inactive with `bg-white border border-gray-200 text-text-muted`.
- Filter the messages array based on current selection, then call `buildWordFrequencies` on the filtered message contents
- Render the word cloud as a flexbox container with `flex-wrap justify-center items-center gap-2 p-4` — each word is a `<span>` with font-size computed proportionally: min font 14px, max font 56px, linearly scaled between min and max count. Apply random rotation to ~20% of words (either -6deg or 6deg, deterministic based on word index). Color words using a rotating palette from the theme: `text-teal-primary`, `text-coral`, `text-teal-secondary`, `text-text-primary`, `text-coral-light`.
- Show total message count and unique word count below the filter controls as small muted text
- If no messages match the filter, show an empty state: "Ingen meldinger funnet for dette filteret"
- The word cloud container should have a minimum height of 300px and a white background with rounded-xl and subtle shadow, matching the app's card style
  </action>
  <verify>
    Run `npx tsc --noEmit` — no type errors in new files. Verify `build-word-frequencies.ts` exports `buildWordFrequencies` and `WordCloud.tsx` exports default component.
  </verify>
  <done>
    Word frequency utility correctly tokenizes, filters stop words, and counts. WordCloud component renders sized words with filter controls.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create admin word cloud page and add navigation link</name>
  <files>
    src/app/admin/wordcloud/page.tsx
    src/app/admin/page.tsx
  </files>
  <action>
**1. `src/app/admin/wordcloud/page.tsx`** — Server component (NO 'use client'):

Follow the exact same auth pattern as `src/app/api/export/route.ts`:
- Auth check: `createClient()` -> `getUser()` -> check profile role is 'admin'
- If not admin, redirect to `/dashboard` (same as admin layout)

Data query using `createAdminClient()`:
```ts
const admin = createAdminClient()
const { data: messageData } = await admin
  .from('messages')
  .select(`
    id, content,
    station_sessions:session_id (
      station_id,
      stations:station_id ( id, number, title ),
      groups:group_id ( id, name )
    )
  `)
  .order('created_at', { ascending: true })
```

Also fetch groups and stations:
```ts
const { data: groups } = await admin.from('groups').select('id, name').order('name')
const { data: stations } = await admin.from('stations').select('id, number, title').order('number')
```

Transform `messageData` into `WordCloudMessage[]` using the same defensive PostgREST join handling as the export route (handle array-or-object for joins).

Page layout:
- Back link to `/admin` (same style as other admin pages: `&larr; Tilbake til admin`)
- Title: "Ordsky" with the admin badge
- Render `<WordCloud messages={messages} groups={groups} stations={stations} />`
- Wrap in same `min-h-dvh p-4` -> `max-w-lg mx-auto pt-8` container as other admin pages

**2. `src/app/admin/page.tsx`** — Add navigation card for word cloud:

Add a new card BEFORE the export card (between the Grupper card and Eksporter card). Use the same card styling as existing cards. Icon: a cloud or chart-bar SVG (simple bar chart icon works well). Title: "Ordsky". Description: "Visualiser de mest brukte ordene fra diskusjonene".
  </action>
  <verify>
    Run `npm run build` — successful build with no errors. Navigate to `/admin` and verify new "Ordsky" card appears. Navigate to `/admin/wordcloud` and verify page loads (with or without messages in DB).
  </verify>
  <done>
    Admin can navigate to `/admin/wordcloud` from admin panel, see word cloud of all messages, and filter by group or station. Page is protected by admin auth. Empty state shows when no messages exist.
  </done>
</task>

</tasks>

<verification>
- `npm run build` succeeds with no errors
- `/admin` page shows new "Ordsky" navigation card
- `/admin/wordcloud` loads and shows word cloud (or empty state if no messages)
- Filter controls switch between all/group/station views
- Non-admin users are redirected away from `/admin/wordcloud`
- Norwegian stop words are excluded from the cloud
- Word sizes scale proportionally to frequency
</verification>

<success_criteria>
- Admin can access word cloud page from admin panel
- Word cloud displays words sized by frequency from chat messages
- Three filter modes work: all messages, per group, per station
- Norwegian stop words excluded, words under 3 chars excluded
- Mobile-first layout (max-w-lg, responsive)
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/12-create-word-cloud-feature-filterable-by-/12-SUMMARY.md`
</output>
