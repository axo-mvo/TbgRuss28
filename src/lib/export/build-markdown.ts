export interface ExportMessage {
  content: string
  stationNumber: number
  stationTitle: string
  groupName: string
}

function groupBy<T>(items: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = String(keyFn(item))
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}

const PRESENTATION_PROMPT = `> **Create a PowerPoint presentation from the attached meeting notes.**
>
> **Structure:**
> - Title slide with event name and date
> - For each topic/station:
>   1. **Group overview slide** – all groups on one slide, quick snapshot only (2–3 sentences per group max). This is a supporting slide, not the main event.
>   2. **Nøkkelpunkter slide** – this is the primary slide. Elaborate synthesis of what the groups collectively said: 6–8 points, written as full, insightful sentences rather than short bullets. Draw out patterns, agreements, tensions, and notable themes across groups. This is what the audience will actually read and discuss.
> - Closing slide
>
> **Layout – group overview slide:**
> - Fit all groups in a compact grid (2–3 columns depending on group count)
> - Small cards with group name, thin colored top border, 2–3 sentence summary
> - Light background (\`F4F6FA\`), full-width navy header bar with station title
>
> **Layout – Nøkkelpunkter slide:**
> - Dark navy background (\`1B2E4B\`)
> - Full-width coral header bar (\`E85D4A\`) with "Stasjon X: Nøkkelpunkter"
> - 6–8 points displayed as cards or rows — each point is 1–2 full sentences, not a fragment
> - Coral dot or left-border accent per point
> - Cards in 2-column layout with white text on slightly lighter navy (\`2A4A72\`)
> - Subtitle under header showing the station topic name in muted grey
>
> **Design requirements:**
> - Calibri throughout — 40pt bold titles, 18–20pt headers, 13–14pt body
> - No decorative lines under titles
> - Left coral accent bar on title and closing slides
> - Assign each group a distinct accent color for their card border (cycle through: \`2D7DD2\`, \`E85D4A\`, \`2CA58D\`, \`F0A500\`, \`7B5EA7\`, \`C94040\`)
>
> **Content tone:**
> - Group overview: faithful but condensed — preserve voice, trim filler
> - Nøkkelpunkter: synthesize across groups — identify what they agreed on, where nuance differs, what the dominant themes are. Write in an observational, summary tone. No new opinions — only what's in the notes.
>
> **Output:** A \`.pptx\` file using PptxGenJS.`

export function buildExportMarkdown(messages: ExportMessage[]): string {
  let md = '# Fellesmøte - Eksport\n\n'
  md += `Eksportert: ${new Date().toLocaleString('nb-NO')}\n\n`
  md += PRESENTATION_PROMPT + '\n\n'
  md += '---\n\n'

  if (messages.length === 0) {
    md += 'Ingen samtaler funnet.\n'
    return md
  }

  const byStation = groupBy(messages, (m) => m.stationNumber)

  // Sort stations by number ascending
  const stationKeys = Object.keys(byStation).sort((a, b) => Number(a) - Number(b))

  for (const stationKey of stationKeys) {
    const stationMsgs = byStation[stationKey]
    const title = stationMsgs[0].stationTitle
    md += `# Stasjon ${stationKey}: ${title}\n\n`

    const byGroup = groupBy(stationMsgs, (m) => m.groupName)

    // Sort groups alphabetically
    const groupKeys = Object.keys(byGroup).sort((a, b) => a.localeCompare(b, 'nb-NO'))

    for (const groupKey of groupKeys) {
      const groupMsgs = byGroup[groupKey]
      md += `## Gruppe: ${groupKey}\n\n`

      for (const msg of groupMsgs) {
        md += `${msg.content}\n\n`
      }
    }

    md += '---\n\n'
  }

  return md
}
