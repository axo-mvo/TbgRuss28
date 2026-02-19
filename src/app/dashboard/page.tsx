import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import StationSelector from '@/components/station/StationSelector'

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
    .select('full_name, role')
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
              Du er tildelt denne gruppen for fellesmote-diskusjonene
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
          <p className="text-text-muted mb-8">
            {!membership
              ? 'Du er ikke tildelt en gruppe enna. Kontakt admin.'
              : 'Dashbordet er under utvikling. Stasjoner og gruppechat kommer snart.'}
          </p>
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
