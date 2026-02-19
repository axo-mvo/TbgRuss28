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

  const fullName = profile?.full_name || 'Bruker'
  const role = profile?.role || 'youth'
  const badgeVariant = (role === 'youth' || role === 'parent' || role === 'admin')
    ? role as 'youth' | 'parent' | 'admin'
    : 'youth'

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

        <p className="text-text-muted mb-8">
          Dashbordet er under utvikling. Stasjoner og gruppechat kommer snart.
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
