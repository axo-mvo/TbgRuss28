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

const PRESENTATION_PROMPT = `> **Create a PowerPoint presentation from the attached meeting notes. All slide text must be in Norwegian.**
>
> **Structure:**
> - Title slide with event name and date
> - Section divider: "Del 1 – Gruppenes bidrag"
> - For each group: one slide summarizing that group's contributions across all stations
> - Closing summary slide: cross-cutting themes across all groups and all stations
>
> **Layout – group slide:**
> - Light background (\`F4F6FA\`), full-width header bar in the group's accent color
> - Group name in header (white, bold, 20pt)
> - One card per station in a 2-column grid (3 rows for 6 stations)
> - Each card: thin colored top accent (same as header color), bold station label (13pt), 2–3 sentence summary (11.5pt)
> - Cards have white background, light border (\`E0E6F0\`), subtle drop shadow
> - Assign each group a distinct accent color (cycle through: \`2D7DD2\`, \`E85D4A\`, \`2CA58D\`, \`F0A500\`, \`7B5EA7\`, \`C94040\`)
>
> **Layout – closing summary slide ("På tvers av alt"):**
> - Dark navy background (\`1B2E4B\`), full-width coral header bar (\`E85D4A\`)
> - Title: "På tvers av alt — hva gikk igjen?"
> - Subtitle in muted grey: "Tverrgående mønstre fra alle stasjoner og alle grupper"
> - 6 theme cards in 2-column grid (3 rows)
> - Each card: slightly lighter navy background (\`2A4A72\`), distinct colored left accent bar, bold white theme label (12pt), 2–3 sentences in muted grey (10.5pt)
> - Use a different accent color per card (cycle through the same 6 group colors)
>
> **Layout – title and section divider slides:**
> - Dark navy background (\`1B2E4B\`)
> - Left coral accent bar (\`E85D4A\`) full height
> - Section divider: small muted label ("Del 1") above large bold title, subtitle below in muted grey
>
> **Design requirements:**
> - Calibri throughout — bold titles, 18–20pt slide headers, 13pt card labels, 11.5pt body text
> - No decorative lines under titles
> - No bullet points — all text as prose in text boxes
> - Section divider: same navy style as title slide
>
> **Content tone:**
> - Group slides: faithful but condensed — preserve each group's voice, trim filler and test messages. No synthesis, just what that group said at each station.
> - Summary slide: synthesize across all groups and all stations — identify what appeared repeatedly, what connected themes across topics, what had zero dissent. Observational tone only. No new opinions — only what's in the notes.
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
