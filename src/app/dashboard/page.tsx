import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import StationSelector from '@/components/station/StationSelector'
import RegisteredUsersOverview from '@/components/dashboard/RegisteredUsersOverview'
import ParentInviteBanner from '@/components/dashboard/ParentInviteBanner'

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
    .select('full_name, role, parent_invite_code')
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
    .select('id, full_name')
    .eq('role', 'youth')
    .order('full_name')

  const { data: allLinks } = await adminClient
    .from('parent_youth_links')
    .select(`
      youth_id,
      parent:profiles!parent_youth_links_parent_id_fkey(id, full_name)
    `)

  const youthWithParents = (allYouth ?? []).map((y) => ({
    id: y.id,
    full_name: y.full_name,
    parents: (allLinks ?? [])
      .filter((l) => l.youth_id === y.id)
      .map((l) => l.parent as unknown as { id: string; full_name: string })
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

        <p className="text-text-muted mb-2">
          Du er logget inn som {roleLabels[role]?.toLowerCase() || role}.
        </p>

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
            {!membership && (
              <p className="text-text-muted mb-4">
                Du er ikke tildelt en gruppe ennå. Kontakt admin.
              </p>
            )}
            <RegisteredUsersOverview youth={youthWithParents} />
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
