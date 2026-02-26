import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/lib/actions/auth'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import StationSelector from '@/components/station/StationSelector'
import ParentInviteBanner from '@/components/dashboard/ParentInviteBanner'
import AttendingToggle from '@/components/dashboard/AttendingToggle'
import ContactDirectory from '@/components/dashboard/ContactDirectory'
import UpcomingMeetingCard from '@/components/dashboard/UpcomingMeetingCard'
import PreviousMeetingsList from '@/components/dashboard/PreviousMeetingsList'

const roleLabels: Record<string, string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
  admin: 'Admin',
}

const audienceLabels: Record<string, string> = {
  youth: 'Kun for ungdom',
  parent: 'Kun for foreldre',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Parallel independent fetches (no waterfall)
  const [
    profileResult,
    upcomingResult,
    activeResult,
    previousResult,
    allYouthResult,
    allLinksResult,
    allMembersResult,
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, role, parent_invite_code, is_admin, avatar_url').eq('id', user.id).single(),
    supabase.from('meetings').select('id, title, date, time, venue, audience').eq('status', 'upcoming').order('date', { ascending: true }),
    supabase.from('meetings').select('id, title, audience').eq('status', 'active').maybeSingle(),
    supabase.from('meetings').select('id, title, date, venue, audience').eq('status', 'completed').order('date', { ascending: false }),
    adminClient.from('profiles').select('id, full_name, phone, email').eq('role', 'youth').order('full_name'),
    adminClient.from('parent_youth_links').select('youth_id, parent:profiles!parent_youth_links_parent_id_fkey(id, full_name, phone, email)'),
    adminClient.from('profiles').select('id, full_name, role, phone, email').in('role', ['youth', 'parent', 'admin']).order('full_name'),
  ])

  const profile = profileResult.data
  const upcomingMeetings = upcomingResult.data ?? []
  const activeMeeting = activeResult.data
  const previousMeetings = previousResult.data ?? []

  const fullName = profile?.full_name || 'Bruker'
  const role = profile?.role || 'youth'
  const isAdmin = profile?.is_admin === true
  const avatarUrl = profile?.avatar_url ?? null
  const badgeVariant = (role === 'youth' || role === 'parent' || role === 'admin')
    ? role as 'youth' | 'parent' | 'admin'
    : 'youth'

  // Helper: check if a meeting targets the current user's role
  const isTargeted = (audience: string) => audience === 'everyone' || audience === role

  // Active meeting: check targeting
  const activeMeetingTargeted = activeMeeting ? isTargeted(activeMeeting.audience ?? 'everyone') : false

  // Meeting-scoped group membership and stations (conditional on targeted active meeting)
  let group: { id: string; name: string; locked: boolean } | null = null
  let stations: Array<{ id: string; number: number; title: string; description: string | null }> = []
  let sessions: Array<{ station_id: string; id: string; status: string; end_timestamp: string | null }> = []
  let groupMembers: Array<{ full_name: string; role: string }> = []

  if (activeMeeting && activeMeetingTargeted) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('group:groups!inner(id, name, locked, meeting_id)')
      .eq('user_id', user.id)
      .eq('groups.meeting_id', activeMeeting.id)
      .maybeSingle()

    group = membership?.group as unknown as { id: string; name: string; locked: boolean } | null

    if (group?.id) {
      const [stationsResult, sessionsResult, membersResult] = await Promise.all([
        supabase.from('stations').select('id, number, title, description').eq('meeting_id', activeMeeting.id).order('number'),
        supabase.from('station_sessions').select('station_id, id, status, end_timestamp').eq('group_id', group.id),
        supabase.from('group_members').select('profile:profiles!inner(full_name, role)').eq('group_id', group.id),
      ])
      stations = stationsResult.data ?? []
      sessions = sessionsResult.data ?? []
      groupMembers = (membersResult.data ?? []).map(
        (m) => m.profile as unknown as { full_name: string; role: string }
      )
    }
  }

  // Batch attendance fetch for ALL upcoming meetings (avoid N+1)
  const upcomingIds = upcomingMeetings.map((m) => m.id)
  let allAttendanceRows: Array<{ meeting_id: string; user_id: string; attending: boolean }> = []
  let totalMembers = 0

  if (upcomingIds.length > 0) {
    const { data: attendanceData } = await adminClient
      .from('meeting_attendance')
      .select('meeting_id, user_id, attending')
      .in('meeting_id', upcomingIds)

    allAttendanceRows = attendanceData ?? []

    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['youth', 'parent', 'admin'])
    totalMembers = count ?? 0
  }

  // Helper: compute attendance stats for a specific meeting
  function getAttendanceStats(meetingId: string) {
    const rows = allAttendanceRows.filter((a) => a.meeting_id === meetingId)
    return {
      myAttendance: rows.find((a) => a.user_id === user!.id)?.attending ?? null,
      attendingCount: rows.filter((a) => a.attending === true).length,
      notAttendingCount: rows.filter((a) => a.attending === false).length,
    }
  }

  // Contact directory data
  const youthWithParents = (allYouthResult.data ?? []).map((y) => ({
    id: y.id,
    full_name: y.full_name,
    phone: y.phone as string | null,
    email: y.email as string,
    parents: (allLinksResult.data ?? [])
      .filter((l) => l.youth_id === y.id)
      .map((l) => l.parent as unknown as { id: string; full_name: string; phone: string | null; email: string })
      .filter(Boolean),
  }))

  const everyone = (allMembersResult.data ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role as 'youth' | 'parent' | 'admin',
    phone: m.phone as string | null,
    email: m.email as string,
  }))

  // Check if current user is a youth with no linked parent
  const hasParent = (allLinksResult.data ?? []).some((l) => l.youth_id === user.id)
  const showParentInvite =
    profile?.role === 'youth' &&
    !hasParent &&
    !!profile?.parent_invite_code

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pt-8">
        {/* Welcome header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">
              Velkommen, {fullName}!
            </h1>
            <Badge variant={badgeVariant}>{roleLabels[role] || role}</Badge>
            {isAdmin && <Badge variant="admin">Admin</Badge>}
          </div>
          <Link href="/dashboard/profil" aria-label="Min profil">
            <Avatar name={fullName} avatarUrl={avatarUrl} size="sm" role={role as 'youth' | 'parent'} />
          </Link>
        </div>

        <p className="text-text-muted mb-4">
          Du er logget inn som {roleLabels[role]?.toLowerCase() || role}{isAdmin ? ' (admin)' : ''}.
        </p>

        {/* Admin panel link */}
        {isAdmin && (
          <Link
            href="/admin"
            className="block mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm
              hover:border-teal-primary hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-1">
              <svg className="h-6 w-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary">Adminpanel</h2>
            </div>
            <p className="text-sm text-text-muted">
              Administrer brukere, grupper og eksport
            </p>
          </Link>
        )}

        {/* Active meeting with locked group: show group card + stations (only if targeted) */}
        {activeMeeting && activeMeetingTargeted && group?.locked && stations.length > 0 && (
          <>
            <div className="mb-6 p-5 rounded-xl border-2 border-teal-primary/30 bg-teal-primary/5">
              <p className="text-sm text-text-muted mb-1">Din gruppe</p>
              <p className="text-xl font-bold text-text-primary">{group.name}</p>
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {groupMembers.map((m) => (
                    <span
                      key={m.full_name}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.role === 'youth'
                          ? 'bg-teal-primary/10 text-teal-primary'
                          : 'bg-coral/10 text-coral'
                      }`}
                    >
                      {m.full_name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-8">
              <StationSelector
                stations={stations}
                sessions={sessions}
                groupId={group.id}
              />
            </div>
          </>
        )}

        {/* Active meeting NOT targeted: greyed-out card */}
        {activeMeeting && !activeMeetingTargeted && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm opacity-50">
            <h3 className="text-base font-semibold text-text-primary">
              {activeMeeting.title}
            </h3>
            <p className="text-sm text-text-muted mt-1">
              {audienceLabels[activeMeeting.audience ?? ''] ?? ''}
            </p>
          </div>
        )}

        {/* Upcoming meetings: show all, with audience-aware display */}
        {upcomingMeetings.length > 0 && !activeMeeting && (
          <>
            {upcomingMeetings.map((meeting) => {
              const targeted = isTargeted(meeting.audience ?? 'everyone')
              const stats = getAttendanceStats(meeting.id)

              if (targeted) {
                return (
                  <div key={meeting.id}>
                    <UpcomingMeetingCard
                      meeting={meeting}
                      audience={meeting.audience}
                      attendingCount={stats.attendingCount}
                      notAttendingCount={stats.notAttendingCount}
                      totalMembers={totalMembers}
                    />
                    <AttendingToggle
                      meetingId={meeting.id}
                      meetingTitle={meeting.title}
                      meetingDate={meeting.date}
                      meetingTime={meeting.time ?? '18:00'}
                      meetingVenue={meeting.venue ?? 'Ikke angitt'}
                      initialAttending={stats.myAttendance}
                    />
                  </div>
                )
              }

              // Non-targeted: greyed-out card, no RSVP
              return (
                <div key={meeting.id} className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm opacity-50">
                  <h3 className="text-base font-semibold text-text-primary">
                    {meeting.title}
                  </h3>
                  <p className="text-sm text-text-muted mt-1">
                    {meeting.date
                      ? new Date(meeting.date + 'T00:00:00').toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
                      : ''
                    }
                    {meeting.time ? ` kl. ${meeting.time}` : ''}
                  </p>
                  {meeting.venue && (
                    <p className="text-sm text-text-muted">{meeting.venue}</p>
                  )}
                  <p className="text-xs font-medium mt-2 text-text-muted italic">
                    {audienceLabels[meeting.audience ?? ''] ?? ''}
                  </p>
                </div>
              )
            })}
          </>
        )}

        {/* Both upcoming and active meeting: show attendance toggles for targeted upcoming meetings */}
        {upcomingMeetings.length > 0 && activeMeeting && (
          <>
            {upcomingMeetings.map((meeting) => {
              const targeted = isTargeted(meeting.audience ?? 'everyone')
              const stats = getAttendanceStats(meeting.id)

              if (targeted) {
                return (
                  <AttendingToggle
                    key={meeting.id}
                    meetingId={meeting.id}
                    meetingTitle={meeting.title}
                    meetingDate={meeting.date}
                    meetingTime={meeting.time ?? '18:00'}
                    meetingVenue={meeting.venue ?? 'Ikke angitt'}
                    initialAttending={stats.myAttendance}
                  />
                )
              }

              // Non-targeted: small greyed-out info
              return (
                <div key={meeting.id} className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm opacity-50">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {meeting.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 italic">
                    {audienceLabels[meeting.audience ?? ''] ?? ''}
                  </p>
                </div>
              )
            })}
          </>
        )}

        {/* Parent invite banner */}
        {showParentInvite && (
          <ParentInviteBanner inviteCode={profile!.parent_invite_code!} />
        )}

        {/* Group preview when assigned but not locked (targeted active meeting) */}
        {activeMeeting && activeMeetingTargeted && group && !group.locked && (
          <div className="mb-4 p-4 rounded-xl border border-teal-primary/20 bg-teal-primary/5">
            <p className="text-sm text-text-muted mb-1">Din gruppe</p>
            <p className="text-lg font-semibold text-text-primary">{group.name}</p>
            {groupMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {groupMembers.map((m) => (
                  <span
                    key={m.full_name}
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.role === 'youth'
                        ? 'bg-teal-primary/10 text-teal-primary'
                        : 'bg-coral/10 text-coral'
                    }`}
                  >
                    {m.full_name.split(' ')[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Not assigned to group yet (targeted active meeting) */}
        {activeMeeting && activeMeetingTargeted && !group && (
          <p className="text-text-muted mb-4">
            Du er ikke tildelt gruppe enna. Tildelingen skjer for motet.
          </p>
        )}

        {/* Contact Directory -- ALWAYS shown */}
        <ContactDirectory youth={youthWithParents} everyone={everyone} />

        {/* Previous meetings */}
        <PreviousMeetingsList meetings={previousMeetings} userRole={role} />

        <form action={logout} className="mt-6">
          <Button variant="secondary" type="submit">
            Logg ut
          </Button>
        </form>
      </div>
    </div>
  )
}
