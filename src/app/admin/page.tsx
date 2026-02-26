import Link from 'next/link'
import { logout } from '@/lib/actions/auth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export default function AdminPage() {
  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pt-8">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Adminpanel</h1>
          <Badge variant="admin">Admin</Badge>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          &larr; Tilbake til dashbord
        </Link>

        <div className="flex flex-col gap-4 mb-8">
          <Link
            href="/admin/meetings"
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm
              hover:border-teal-primary hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-6 w-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary">{`M\u00f8ter`}</h2>
            </div>
            <p className="text-sm text-text-muted">
              {`Opprett m\u00f8ter, konfigurer stasjoner og grupper`}
            </p>
          </Link>

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
