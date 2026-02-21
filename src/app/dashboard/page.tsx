import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import StationSelector from '@/components/station/StationSelector'
import RegisteredUsersOverview from '@/components/dashboard/RegisteredUsersOverview'
import ParentInviteBanner from '@/components/dashboard/ParentInviteBanner'
import AttendingToggle from '@/components/dashboard/AttendingToggle'

const roleLabels: Record<string, string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
  admin: 'Admin',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, parent_invite_code, attending')
    .eq('id', user.id)
    .single()

  // Query group membership with group details
  const { data: membership } = await supabase
    .from('group_members')
    .select(`
      group:groups!inner(id, name, locked)
    `)
    .eq('user_id', user.id)
    .maybeSingle()

  // Fetch all 6 stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, number, title, description')
    .order('number')

  // Fetch station sessions for user's group (if they have a group)
  const group = membership?.group as unknown as { id: string; name: string; locked: boolean } | null
  let sessions: Array<{ station_id: string; id: string; status: string; end_timestamp: string | null }> = []
  if (group?.id) {
    const { data } = await supabase
      .from('station_sessions')
      .select('station_id, id, status, end_timestamp')
      .eq('group_id', group.id)
    sessions = data || []
  }

  // Fetch all youth with their linked parents (admin client bypasses RLS)
  const adminClient = createAdminClient()

  const { data: allYouth } = await adminClient
    .from('profiles')
    .select('id, full_name, attending')
    .eq('role', 'youth')
    .order('full_name')

  const { data: allLinks } = await adminClient
    .from('parent_youth_links')
    .select(`
      youth_id,
      parent:profiles!parent_youth_links_parent_id_fkey(id, full_name, attending)
    `)

  // Fetch all profiles for summary counts
  const { data: allProfiles } = await adminClient
    .from('profiles')
    .select('id, role, attending')
    .in('role', ['youth', 'parent', 'admin'])

  const youthCount = (allProfiles ?? []).filter((p) => p.role === 'youth').length
  const parentCount = (allProfiles ?? []).filter((p) => p.role === 'parent' || p.role === 'admin').length
  const attendingCount = (allProfiles ?? []).filter((p) => p.attending === true).length
  const notRespondedCount = (allProfiles ?? []).filter((p) => p.attending === null).length

  const youthWithParents = (allYouth ?? []).map((y) => ({
    id: y.id,
    full_name: y.full_name,
    attending: y.attending as boolean | null,
    parents: (allLinks ?? [])
      .filter((l) => l.youth_id === y.id)
      .map((l) => l.parent as unknown as { id: string; full_name: string; attending: boolean | null })
      .filter(Boolean),
  }))

  // Check if current user is a youth with no linked parent
  const hasParent = (allLinks ?? []).some((l) => l.youth_id === user.id)
  const showParentInvite =
    profile?.role === 'youth' &&
    !hasParent &&
    !!profile?.parent_invite_code

  const fullName = profile?.full_name || 'Bruker'
  const role = profile?.role || 'youth'
  const badgeVariant = (role === 'youth' || role === 'parent' || role === 'admin')
    ? role as 'youth' | 'parent' | 'admin'
    : 'youth'

  const isGroupLocked = group?.locked === true

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            Velkommen, {fullName}!
          </h1>
          <Badge variant={badgeVariant}>{roleLabels[role] || role}</Badge>
        </div>

        <p className="text-text-muted mb-4">
          Du er logget inn som {roleLabels[role]?.toLowerCase() || role}.
        </p>

        <AttendingToggle initialAttending={profile?.attending ?? null} />

        {role === 'admin' && (
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

        {/* Group assignment card -- shown when groups are locked */}
        {isGroupLocked && group && (
          <div className="mb-6 p-5 rounded-xl border-2 border-teal-primary/30 bg-teal-primary/5">
            <p className="text-sm text-text-muted mb-1">Din gruppe</p>
            <p className="text-xl font-bold text-text-primary">{group.name}</p>
            <p className="text-sm text-text-muted mt-2">
              Du er tildelt denne gruppen for fellesmøte-diskusjonene
            </p>
          </div>
        )}

        {isGroupLocked && group && stations ? (
          <div className="mb-8">
            <StationSelector
              stations={stations}
              sessions={sessions}
              groupId={group.id}
            />
          </div>
        ) : (
          <div className="mb-8">
            {showParentInvite && (
              <ParentInviteBanner inviteCode={profile!.parent_invite_code!} />
            )}
            {!membership ? (
              <p className="text-text-muted mb-4">
                Du er ikke tildelt gruppe ennå. Tildelingen skjer før møtet.
              </p>
            ) : group && !isGroupLocked ? (
              <div className="mb-4 p-4 rounded-xl border border-teal-primary/20 bg-teal-primary/5">
                <p className="text-sm text-text-muted mb-1">Din gruppe</p>
                <p className="text-lg font-semibold text-text-primary">{group.name}</p>
              </div>
            ) : null}
            <RegisteredUsersOverview
              youth={youthWithParents}
              summary={{ youthCount, parentCount, attendingCount, notRespondedCount }}
            />
          </div>
        )}

        <form action={logout}>
          <Button variant="secondary" type="submit">
            Logg ut
          </Button>
        </form>
      </div>
    </div>
  )
}
