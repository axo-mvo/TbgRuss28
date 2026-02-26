import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import Badge from '@/components/ui/Badge'
import MeetingTabs from '@/components/admin/MeetingTabs'
import type { WordCloudMessage } from '@/components/admin/WordCloud'

const statusLabels: Record<string, string> = {
  upcoming: 'Kommende',
  active: 'Aktivt',
  completed: 'Fullført',
}

function formatDate(date: string | null): string {
  if (!date) return 'Ikke satt'
  return new Date(date).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const admin = createAdminClient()

  // Fetch all data in parallel
  const [
    meetingResult,
    stationsResult,
    groupsDataResult,
    usersResult,
    parentLinksResult,
    messagesResult,
  ] = await Promise.all([
    // Meeting
    admin.from('meetings').select('*').eq('id', id).single(),
    // Stations
    admin.from('stations').select('*').eq('meeting_id', id).order('number'),
    // Groups with members (for Grupper tab)
    admin
      .from('groups')
      .select('id, name, locked, group_members(user_id)')
      .eq('meeting_id', id)
      .order('created_at'),
    // Users (for Grupper tab)
    admin
      .from('profiles')
      .select('id, full_name, role, attending')
      .in('role', ['youth', 'parent', 'admin'])
      .order('full_name'),
    // Parent-child links (for Grupper tab)
    admin.from('parent_youth_links').select('parent_id, youth_id'),
    // Messages for Resultat tab (joined through station_sessions)
    admin
      .from('messages')
      .select(`
        id, content,
        station_sessions:session_id (
          station_id,
          stations:station_id ( id, number, title, meeting_id ),
          groups:group_id ( id, name )
        )
      `)
      .order('created_at', { ascending: true }),
  ])

  if (meetingResult.error || !meetingResult.data) {
    notFound()
  }

  const meeting = meetingResult.data
  const stations = stationsResult.data ?? []
  const allGroups = groupsDataResult.data ?? []
  const allUsers = usersResult.data ?? []
  const parentChildLinks = parentLinksResult.data ?? []

  // ---------- Transform groups data (same pattern as /admin/groups/page.tsx) ----------
  const assignedUserIds = new Set<string>()
  const initialGroups: Record<string, string[]> = {}
  const groupNames: Record<string, string> = {}

  for (const group of allGroups) {
    const memberIds =
      group.group_members?.map(
        (m: { user_id: string }) => m.user_id
      ) ?? []
    initialGroups[group.id] = memberIds
    groupNames[group.id] = group.name
    for (const uid of memberIds) {
      assignedUserIds.add(uid)
    }
  }

  // Users not assigned to any group in this meeting
  initialGroups.unassigned = allUsers
    .filter((u) => !assignedUserIds.has(u.id))
    .map((u) => u.id)

  const groupsLocked = allGroups.some((g) => g.locked)
  const groupCount = allGroups.length
  const stationCount = stations.length

  // ---------- Transform messages for WordCloud (scoped to this meeting) ----------
  const rawMessages = messagesResult.data ?? []

  const meetingMessages: WordCloudMessage[] = []
  for (const msg of rawMessages) {
    const sessionData = Array.isArray(msg.station_sessions)
      ? msg.station_sessions[0]
      : msg.station_sessions

    if (!sessionData) continue

    const stationData = Array.isArray((sessionData as Record<string, unknown>).stations)
      ? ((sessionData as Record<string, unknown>).stations as Record<string, unknown>[])[0]
      : (sessionData as Record<string, unknown>).stations

    const groupData = Array.isArray((sessionData as Record<string, unknown>).groups)
      ? ((sessionData as Record<string, unknown>).groups as Record<string, unknown>[])[0]
      : (sessionData as Record<string, unknown>).groups

    const station = stationData as { id?: string; number?: number; title?: string; meeting_id?: string } | null
    const group = groupData as { id?: string; name?: string } | null

    // Filter: only include messages from this meeting's stations
    if (station?.meeting_id !== id) continue

    meetingMessages.push({
      content: msg.content,
      groupId: group?.id ?? '',
      groupName: group?.name ?? 'Ukjent gruppe',
      stationId: station?.id ?? '',
      stationNumber: station?.number ?? 0,
      stationTitle: station?.title ?? 'Ukjent stasjon',
    })
  }

  // Groups and stations for wordcloud filters (scoped to this meeting)
  const wordcloudGroups = allGroups.map((g) => ({
    id: g.id as string,
    name: g.name as string,
  }))

  const wordcloudStations = stations.map((s) => ({
    id: s.id as string,
    number: s.number as number,
    title: s.title as string,
  }))

  const badgeVariant =
    meeting.status === 'upcoming' ||
    meeting.status === 'active' ||
    meeting.status === 'completed'
      ? (meeting.status as 'upcoming' | 'active' | 'completed')
      : 'upcoming'

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link
          href="/admin/meetings"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          {`\u2190 Tilbake til m\u00f8ter`}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            {meeting.title}
          </h1>
          <Badge variant={badgeVariant}>
            {statusLabels[meeting.status] ?? meeting.status}
          </Badge>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <div className="flex flex-col gap-3">
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
                <span className="ml-1">kl. {formatTime(meeting.time)}</span>
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

        <MeetingTabs
          meeting={meeting}
          stations={stations}
          initialGroups={initialGroups}
          users={allUsers}
          parentChildLinks={parentChildLinks}
          groupNames={groupNames}
          groupsLocked={groupsLocked}
          groupCount={groupCount}
          stationCount={stationCount}
          messages={meetingMessages}
          wordcloudGroups={wordcloudGroups}
          wordcloudStations={wordcloudStations}
        />
      </div>
    </div>
  )
}
