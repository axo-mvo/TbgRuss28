import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export default function AdminPage() {
  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Adminpanel</h1>
          <Badge variant="admin">Admin</Badge>
        </div>

        <p className="text-text-muted mb-8">
          Adminpanelet er under utvikling.
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
