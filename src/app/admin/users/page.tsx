import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import UserTable from '@/components/admin/UserTable'

export default async function UsersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Fetch all profiles with parent-child links using FK disambiguation
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id, full_name, email, phone, role, is_admin, created_at,
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

  // Fetch current upcoming/active meeting for attendance scoping
  const { data: currentMeeting } = await admin
    .from('meetings')
    .select('id')
    .in('status', ['upcoming', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Build meeting-scoped attendance map
  const attendanceMap = new Map<string, boolean>()
  if (currentMeeting) {
    const { data: attendanceRows } = await admin
      .from('meeting_attendance')
      .select('user_id, attending')
      .eq('meeting_id', currentMeeting.id)
    for (const row of attendanceRows ?? []) {
      attendanceMap.set(row.user_id, row.attending)
    }
  }

  // Merge per-meeting attendance into user data
  const usersWithAttendance = (users ?? []).map(u => ({
    ...u,
    attending: attendanceMap.get(u.id) ?? null,
  }))

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

        <UserTable users={usersWithAttendance} allYouth={allYouth ?? []} />
      </div>
    </div>
  )
}
