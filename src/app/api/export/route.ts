import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildExportMarkdown, type ExportMessage } from '@/lib/export/build-markdown'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ---------- Auth check ----------
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Ikke autentisert', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return new Response('Ikke autorisert', { status: 403 })
  }

  // ---------- Meeting scope (optional) ----------
  const meetingId = request.nextUrl.searchParams.get('meetingId')

  const admin = createAdminClient()

  // Fetch meeting info if scoped
  let meetingInfo: { title: string; date: string | null; venue: string | null } | undefined
  if (meetingId) {
    const { data: meetingData } = await admin
      .from('meetings')
      .select('title, date, venue')
      .eq('id', meetingId)
      .single()

    if (meetingData) {
      meetingInfo = {
        title: meetingData.title,
        date: meetingData.date,
        venue: meetingData.venue,
      }
    }
  }

  // ---------- Data query ----------
  const { data, error } = await admin
    .from('messages')
    .select(`
      id, content,
      station_sessions:session_id (
        stations:station_id ( id, number, title, meeting_id ),
        groups:group_id ( name )
      )
    `)
    .order('created_at', { ascending: true })

  if (error) {
    return new Response('Eksport feilet', { status: 500 })
  }

  // ---------- Transform & filter data ----------
  const allMessages = (data ?? []).map((msg) => {
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

    const station = stationData as { id?: string; number?: number; title?: string; meeting_id?: string } | null
    const group = groupData as { name?: string } | null

    return {
      content: msg.content,
      stationNumber: station?.number ?? 0,
      stationTitle: station?.title ?? 'Ukjent stasjon',
      groupName: group?.name ?? 'Ukjent gruppe',
      meetingId: station?.meeting_id ?? null,
    }
  })

  // Filter by meeting if scoped
  const filtered = meetingId
    ? allMessages.filter((m) => m.meetingId === meetingId)
    : allMessages

  const messages: ExportMessage[] = filtered.map(({ content, stationNumber, stationTitle, groupName }) => ({
    content,
    stationNumber,
    stationTitle,
    groupName,
  }))

  // ---------- Build Markdown ----------
  const markdown = buildExportMarkdown(messages, meetingInfo)

  // ---------- Return download ----------
  const filename = meetingInfo
    ? `eksport-${meetingInfo.title.toLowerCase().replace(/\s+/g, '-')}.md`
    : 'eksport-fellesmote.md'

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
