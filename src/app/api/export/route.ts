import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildExportMarkdown, type ExportMessage } from '@/lib/export/build-markdown'

export const dynamic = 'force-dynamic'

export async function GET() {
  // ---------- Auth check ----------
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Ikke autentisert', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response('Ikke autorisert', { status: 403 })
  }

  // ---------- Data query ----------
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('messages')
    .select(`
      id, content, created_at,
      profiles:user_id ( full_name, role ),
      station_sessions:session_id (
        stations:station_id ( number, title ),
        groups:group_id ( name )
      )
    `)
    .order('created_at', { ascending: true })

  if (error) {
    return new Response('Eksport feilet', { status: 500 })
  }

  // ---------- Transform data ----------
  const messages: ExportMessage[] = (data ?? []).map((msg) => {
    // PostgREST joins may return object or array -- handle both defensively
    const profileData = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
    const sessionData = Array.isArray(msg.station_sessions)
      ? msg.station_sessions[0]
      : msg.station_sessions

    const stationData = sessionData
      ? Array.isArray(sessionData.stations) ? sessionData.stations[0] : sessionData.stations
      : null
    const groupData = sessionData
      ? Array.isArray(sessionData.groups) ? sessionData.groups[0] : sessionData.groups
      : null

    return {
      content: msg.content,
      createdAt: msg.created_at,
      authorName: profileData?.full_name ?? 'Ukjent',
      authorRole: profileData?.role ?? 'youth',
      stationNumber: stationData?.number ?? 0,
      stationTitle: stationData?.title ?? 'Ukjent stasjon',
      groupName: groupData?.name ?? 'Ukjent gruppe',
    }
  })

  // ---------- Build Markdown ----------
  const markdown = buildExportMarkdown(messages)

  // ---------- Return download ----------
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="eksport-fellesmote.md"',
    },
  })
}
