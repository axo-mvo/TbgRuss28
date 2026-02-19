import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

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

  const fullName = profile?.full_name || 'Bruker'
  const role = profile?.role || 'youth'
  const badgeVariant = (role === 'youth' || role === 'parent' || role === 'admin')
    ? role as 'youth' | 'parent' | 'admin'
    : 'youth'

  // Type-safe access to group data (Supabase returns object for !inner join with maybeSingle)
  const group = membership?.group as unknown as { id: string; name: string; locked: boolean } | null
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

        <p className="text-text-muted mb-8">
          {isGroupLocked
            ? 'Stasjoner og gruppechat blir tilgjengelig nar fellesmotet starter.'
            : !membership
              ? 'Du er ikke tildelt en gruppe enna. Kontakt admin.'
              : 'Dashbordet er under utvikling. Stasjoner og gruppechat kommer snart.'}
        </p>

        <form action={logout}>
          <Button variant="secondary" type="submit">
            Logg ut
          </Button>
        </form>
      </div>
    </div>
  )
}
