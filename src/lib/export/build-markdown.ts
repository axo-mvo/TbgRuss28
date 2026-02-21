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

const PRESENTATION_PROMPT = `> **How to create a presentation from this export:**
>
> Create a PowerPoint presentation from the attached meeting notes.
>
> **Structure:**
> - Title slide with event name and date
> - For each topic/station: one slide showing each group's summary side by side (4–5 sentences per group), followed by one slide listing 4 key takeaways across all groups
> - Closing slide
>
> **Design requirements:**
> - Color palette: dark navy background (\`1B2E4B\`) for title/closing/key-point slides, light sand (\`F4F6FA\`) for group summary slides
> - Accent color: coral (\`E85D4A\`) for header bars, dividers, and dot markers
> - Group color coding: blue (\`2D7DD2\`) for Group A, coral for Group B — use a thin top border on each group card
> - White card layout for group summaries — two columns, subtle drop shadow, no border
> - Key points displayed as dark navy cards (\`2A4A72\`) with a coral dot accent and white text
> - Typography: Calibri throughout — 40pt bold titles, 20pt slide headers, 13–14pt body
> - Left-side coral accent bar on title and closing slides
> - No decorative lines under titles — use whitespace and background color instead
> - Every slide has a full-width colored header bar with the slide title in white
>
> **Content tone:**
> - Rewrite raw group notes into coherent, complete sentences
> - Stay faithful to the intent — don't add opinions or conclusions not present in the notes
> - Key takeaways should synthesize both groups, not just list one group's points
>
> **Output:** A \`.pptx\` file using PptxGenJS.
>
> *Swap in your own group names, station names, and color preferences as needed.*`

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
