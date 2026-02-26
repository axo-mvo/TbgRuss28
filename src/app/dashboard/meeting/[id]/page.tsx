import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Badge from '@/components/ui/Badge'
import MeetingStationPicker from '@/components/dashboard/MeetingStationPicker'
import MessageList from '@/components/station/MessageList'
import type { ChatMessage } from '@/lib/hooks/useRealtimeChat'

function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Ikke satt'
  const date = new Date(isoDate + 'T00:00:00')
  const formatted = date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export default async function MeetingHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ station?: string; group?: string }>
}) {
  const { id } = await params
  const { station: stationParam, group: groupParam } = await searchParams

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()

  // Fetch meeting -- must be completed
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, title, date, time, venue, status')
    .eq('id', id)
    .eq('status', 'completed')
    .single()

  if (meetingError || !meeting) {
    notFound()
  }

  // Fetch profile, stations, and groups in parallel
  const [profileResult, stationsResult, groupsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase
      .from('stations')
      .select('id, number, title, questions, tip')
      .eq('meeting_id', id)
      .order('number'),
    admin
      .from('groups')
      .select('id, name')
      .eq('meeting_id', id)
      .order('created_at'),
  ])

  const profile = profileResult.data
  const stations = stationsResult.data ?? []
  const groups = groupsResult.data ?? []

  // If station and group selected, load discussion messages
  let messages: ChatMessage[] = []
  let noSession = false
  let sessionId: string | null = null
  let selectedStation: typeof stations[number] | undefined
  let selectedGroupName: string | undefined

  if (stationParam && groupParam) {
    selectedStation = stations.find((s) => s.id === stationParam)
    selectedGroupName = groups.find((g) => g.id === groupParam)?.name

    // Query station_sessions for this station+group combo
    const { data: session } = await admin
      .from('station_sessions')
      .select('id, status')
      .eq('station_id', stationParam)
      .eq('group_id', groupParam)
      .maybeSingle()

    if (session) {
      sessionId = session.id

      // Load messages using admin client (bypasses RLS for cross-group access)
      const { data: messagesData } = await admin
        .from('messages')
        .select('id, user_id, content, created_at, profiles:user_id(full_name, role)')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })

      messages = (messagesData ?? []).map((msg) => {
        const profileData = Array.isArray(msg.profiles)
          ? msg.profiles[0]
          : msg.profiles
        return {
          id: msg.id,
          userId: msg.user_id,
          fullName: (profileData as { full_name: string } | null)?.full_name ?? 'Ukjent',
          role: ((profileData as { role: string } | null)?.role ?? 'youth') as 'youth' | 'parent',
          content: msg.content,
          createdAt: msg.created_at,
          status: 'sent' as const,
        }
      })
    } else {
      noSession = true
    }
  }

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          &larr; Tilbake
        </Link>

        {/* Meeting header */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-text-primary">
            {meeting.title}
          </h1>
          <Badge variant="completed">Fullfort</Badge>
        </div>

        {/* Meeting info card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span>{formatDate(meeting.date)}</span>
              {meeting.time ? (
                <span className="ml-1">kl. {meeting.time.slice(0, 5)}</span>
              ) : null}
            </div>
            {meeting.venue ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                <span>{meeting.venue}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Station and group picker */}
        <MeetingStationPicker
          meetingId={id}
          stations={stations.map((s) => ({ id: s.id, number: s.number, title: s.title }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          selectedStation={stationParam}
          selectedGroup={groupParam}
        />

        {/* Discussion display area */}
        {stationParam && groupParam && (
          <div className="mt-6">
            {noSession ? (
              <div className="p-4 rounded-xl border border-gray-200 bg-white text-center">
                <p className="text-sm text-text-muted">
                  Denne gruppen diskuterte ikke denne stasjonen
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Station context card */}
                {selectedStation && (selectedStation.questions || selectedStation.tip) && (
                  <div className="p-3 rounded-xl bg-teal-primary/5 border border-teal-primary/10">
                    {selectedStation.questions && (selectedStation.questions as string[]).length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-teal-primary mb-1">Diskuter:</p>
                        <ul className="space-y-1">
                          {(selectedStation.questions as string[]).map((q: string, i: number) => (
                            <li key={i} className="text-xs text-text-muted pl-2 border-l-2 border-teal-primary/20">
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedStation.tip && (
                      <p className="text-xs text-text-muted italic">
                        Tips: {selectedStation.tip}
                      </p>
                    )}
                  </div>
                )}

                {/* Group label */}
                {selectedGroupName && (
                  <p className="text-sm font-medium text-text-primary">
                    Gruppe: {selectedGroupName}
                  </p>
                )}

                {/* Messages */}
                {messages.length === 0 ? (
                  <div className="p-4 rounded-xl border border-gray-200 bg-white text-center">
                    <p className="text-sm text-text-muted">
                      Ingen meldinger i denne diskusjonen
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-3 max-h-[60vh] overflow-y-auto">
                    <MessageList messages={messages} currentUserId={user.id} />
                  </div>
                )}

                {/* Ended footer */}
                <div className="px-4 py-2 bg-text-muted/10 rounded-lg text-center">
                  <span className="text-sm text-text-muted">Diskusjonen er avsluttet</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
