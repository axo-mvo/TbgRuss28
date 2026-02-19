import Link from 'next/link'
import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export default function AdminPage() {
  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Adminpanel</h1>
          <Badge variant="admin">Admin</Badge>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <Link
            href="/admin/users"
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm
              hover:border-teal-primary hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-6 w-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary">Brukere</h2>
            </div>
            <p className="text-sm text-text-muted">
              Administrer brukere, roller og forelder-barn-koblinger
            </p>
          </Link>

          <Link
            href="/admin/groups"
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm
              hover:border-teal-primary hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-6 w-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary">Grupper</h2>
            </div>
            <p className="text-sm text-text-muted">
              Opprett grupper, tildel medlemmer og las gruppene
            </p>
          </Link>
        </div>

        <form action={logout}>
          <Button variant="secondary" type="submit">
            Logg ut
          </Button>
        </form>
      </div>
    </div>
  )
}
