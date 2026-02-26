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
> - Closing summary slide: "Hva ble vi enige om?" — consensus per station across all groups
>
> **Layout – group slide:**
> - Light background (\`F4F6FA\`), full-width header bar in the group's accent color
> - Group name in header (white, bold, 20pt)
> - One card per station in a 2-column grid
> - Each card: thin colored top accent (same as header color), bold station label (13pt), 2–3 sentence summary (11.5pt)
> - Cards have white background, light border (\`E0E6F0\`), subtle drop shadow
> - Assign each group a distinct accent color (cycle through: \`2D7DD2\`, \`E85D4A\`, \`2CA58D\`, \`F0A500\`, \`7B5EA7\`, \`C94040\`)
>
> **Layout – closing summary slide ("Hva ble vi enige om?"):**
> - Dark navy background (\`1B2E4B\`), full-width coral header bar (\`E85D4A\`)
> - Title: "Hva ble vi enige om?"
> - Subtitle in muted grey: "Konklusjoner fra hver stasjon — basert på alle gruppenes diskusjoner"
> - 6 cards in a 2-column grid (3 rows): 5 station cards + 1 "Veien videre" card
> - Each card: slightly lighter navy background (\`2A4A72\`), distinct colored left accent bar, bold white label (12pt), 2–3 sentences in muted grey (10.5pt)
> - Use a different accent color per card (cycle through: \`2D7DD2\`, \`E85D4A\`, \`2CA58D\`, \`F0A500\`, \`7B5EA7\`, \`C94040\`)
> - The 6th card (bottom-right) has label "Veien videre" and suggests 3–5 concrete next steps based on the discussions (e.g. schedule a follow-up meeting on topic X, draft a new contract, set up shared budget tool). Only actionable items — no generic advice.
>
> **Content – closing summary:**
> - Structure the summary around the 5 stations, not abstract themes
> - For each station: extract the clearest consensus position that emerged across groups. What did most groups agree on? Where was there disagreement?
> - Be concrete and actionable: "Flertallet mener foreldrene bør ha innsyn i regnskapet" is good. "Inkludering er viktig" is too vague.
> - For each station card, answer: "If we had to make a decision based on tonight's discussion, what would it be?"
> - Flag any station where groups clearly disagreed — note both positions without resolving them
> - Use the original station questions as a checklist: did the groups actually answer them? Highlight unanswered questions as "[Ikke avklart – bør følges opp]"
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
> - Summary slide: synthesize across all groups per station — extract concrete consensus, flag disagreements, and mark unanswered questions. Observational tone only. No new opinions — only what's in the notes.
>
> **Output:** A \`.pptx\` file using PptxGenJS.`

export function buildExportMarkdown(
  messages: ExportMessage[],
  meetingInfo?: { title: string; date: string | null; venue: string | null }
): string {
  let md = ''

  if (meetingInfo) {
    md += `# ${meetingInfo.title} - Eksport\n\n`
    if (meetingInfo.date) {
      const dateStr = new Date(meetingInfo.date).toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      md += `Dato: ${dateStr}\n`
    }
    if (meetingInfo.venue) {
      md += `Sted: ${meetingInfo.venue}\n`
    }
    md += '\n'
  } else {
    md += '# Fellesmøte - Eksport\n\n'
  }

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
