import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import Badge from '@/components/ui/Badge'
import WordCloud from '@/components/admin/WordCloud'
import type { WordCloudMessage } from '@/components/admin/WordCloud'

export default async function WordCloudPage() {
  // ---------- Data query ----------
  const admin = createAdminClient()

  const [messagesResult, groupsResult, stationsResult] = await Promise.all([
    admin
      .from('messages')
      .select(`
        id, content,
        station_sessions:session_id (
          station_id,
          stations:station_id ( id, number, title ),
          groups:group_id ( id, name )
        )
      `)
      .order('created_at', { ascending: true }),
    admin.from('groups').select('id, name').order('name'),
    admin.from('stations').select('id, number, title').order('number'),
  ])

  // ---------- Transform messages ----------
  const messages: WordCloudMessage[] = (messagesResult.data ?? []).map((msg) => {
    // PostgREST joins may return object or array -- handle both defensively
    const sessionData = Array.isArray(msg.station_sessions)
      ? msg.station_sessions[0]
      : msg.station_sessions

    const stationData = sessionData
      ? Array.isArray((sessionData as Record<string, unknown>).stations)
        ? ((sessionData as Record<string, unknown>).stations as Record<string, unknown>[])[0]
        : (sessionData as Record<string, unknown>).stations
      : null
    const groupData = sessionData
      ? Array.isArray((sessionData as Record<string, unknown>).groups)
        ? ((sessionData as Record<string, unknown>).groups as Record<string, unknown>[])[0]
        : (sessionData as Record<string, unknown>).groups
      : null

    const station = stationData as { id?: string; number?: number; title?: string } | null
    const group = groupData as { id?: string; name?: string } | null

    return {
      content: msg.content,
      groupId: group?.id ?? '',
      groupName: group?.name ?? 'Ukjent gruppe',
      stationId: station?.id ?? '',
      stationNumber: station?.number ?? 0,
      stationTitle: station?.title ?? 'Ukjent stasjon',
    }
  })

  const groups = (groupsResult.data ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
  }))

  const stations = (stationsResult.data ?? []).map((s) => ({
    id: s.id as string,
    number: s.number as number,
    title: s.title as string,
  }))

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          &larr; Tilbake til admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Ordsky</h1>
          <Badge variant="admin">Admin</Badge>
        </div>

        <WordCloud messages={messages} groups={groups} stations={stations} />
      </div>
    </div>
  )
}
