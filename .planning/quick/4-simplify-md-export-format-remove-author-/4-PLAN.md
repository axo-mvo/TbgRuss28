---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/export/build-markdown.ts
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "Exported markdown shows only message text under each group, no author name or timestamp"
    - "Group headings use format 'Gruppe: {name}' (e.g., '## Gruppe: Nordlys')"
    - "Station headings, sorting, and overall structure remain unchanged"
  artifacts:
    - path: "src/lib/export/build-markdown.ts"
      provides: "Simplified markdown builder"
      contains: "Gruppe:"
  key_links: []
---

<objective>
Simplify the markdown export format by removing author name, role, and timestamp from each message. Messages should show only their text content, grouped under clearly labeled group headings using "Gruppe: {name}" format.

Purpose: Cleaner, more readable export that focuses on content rather than metadata.
Output: Updated build-markdown.ts with simplified format.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/export/build-markdown.ts
@src/app/api/export/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Simplify markdown message format and update group headings</name>
  <files>src/lib/export/build-markdown.ts</files>
  <action>
In `buildExportMarkdown()` function in `src/lib/export/build-markdown.ts`, make two changes:

1. **Change group heading format** (line 54): Change `## ${groupKey}` to `## Gruppe: ${groupKey}` so groups render as e.g. "## Gruppe: Nordlys".

2. **Remove author/role/timestamp line** (lines 56-63): Replace the message rendering loop body. Instead of:
   ```
   const time = new Date(msg.createdAt).toLocaleTimeString(...)
   const role = ROLE_LABELS[msg.authorRole] ?? msg.authorRole
   md += `**${msg.authorName}** (${role}) - ${time}\n`
   md += `${msg.content}\n\n`
   ```
   Simplify to just:
   ```
   md += `${msg.content}\n\n`
   ```

3. **Clean up unused code**: Since authorName, authorRole, and createdAt are no longer used in the markdown builder, remove the `ROLE_LABELS` constant (lines 21-25) and the `time`/`role` variable declarations. Also remove `authorName`, `authorRole`, and `createdAt` from the `ExportMessage` interface since they are no longer needed by the builder.

   IMPORTANT: The route handler (route.ts) still maps these fields. After removing them from the interface, also update `src/app/api/export/route.ts` to stop mapping the removed fields (authorName, authorRole, createdAt) in the transform section (lines 59-68). Keep only: content, stationNumber, stationTitle, groupName.

Do NOT change: station heading format, sorting logic (stations by number, groups alphabetically), the overall document structure (title, export date, horizontal rules), or the empty-state message.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no TypeScript errors after interface change.
Visually inspect the file to confirm:
- No author/role/timestamp in message output
- Group headings use "Gruppe: " prefix
- ROLE_LABELS constant removed
- ExportMessage interface has only: content, stationNumber, stationTitle, groupName
  </verify>
  <done>
The markdown builder outputs only message content text (no author, role, or timestamp) under group headings formatted as "## Gruppe: {name}". TypeScript compiles without errors. The ExportMessage interface and route handler are updated to match.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `build-markdown.ts` contains `## Gruppe: ${groupKey}` pattern
- `build-markdown.ts` does NOT contain `authorName`, `ROLE_LABELS`, `toLocaleTimeString`
- `route.ts` ExportMessage mapping does not include authorName, authorRole, or createdAt
</verification>

<success_criteria>
Exported markdown files show only plain message text under "Gruppe: {name}" headings, with no per-message author attribution or timestamps. TypeScript compiles cleanly.
</success_criteria>

<output>
After completion, create `.planning/quick/4-simplify-md-export-format-remove-author-/4-SUMMARY.md`
</output>
