export interface ExportMessage {
  content: string
  createdAt: string
  authorName: string
  authorRole: string
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

const ROLE_LABELS: Record<string, string> = {
  parent: 'forelder',
  youth: 'ungdom',
  admin: 'admin',
}

export function buildExportMarkdown(messages: ExportMessage[]): string {
  let md = '# Fellesmote - Eksport\n\n'
  md += `Eksportert: ${new Date().toLocaleString('nb-NO')}\n\n`
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
      md += `## ${groupKey}\n\n`

      for (const msg of groupMsgs) {
        const time = new Date(msg.createdAt).toLocaleTimeString('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const role = ROLE_LABELS[msg.authorRole] ?? msg.authorRole
        md += `**${msg.authorName}** (${role}) - ${time}\n`
        md += `${msg.content}\n\n`
      }
    }

    md += '---\n\n'
  }

  return md
}
