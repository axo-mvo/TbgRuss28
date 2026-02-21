import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UserTable from '@/components/admin/UserTable'

export default async function UsersPage() {
  const supabase = await createClient()

  // Fetch all profiles with parent-child links using FK disambiguation
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id, full_name, email, phone, role, attending, created_at,
      parent_youth_links!parent_youth_links_parent_id_fkey(
        id,
        youth:profiles!parent_youth_links_youth_id_fkey(id, full_name)
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch all youth users for ParentLinkSheet dropdown
  const { data: allYouth } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'youth')
    .order('full_name')

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-4xl mx-auto pt-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake
        </Link>

        <h1 className="text-2xl font-bold text-text-primary mb-6">Brukere</h1>

        <UserTable users={users ?? []} allYouth={allYouth ?? []} />
      </div>
    </div>
  )
}
