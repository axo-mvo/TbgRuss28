import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import GroupBuilder from '@/components/admin/GroupBuilder'

export default async function GroupsPage() {
  const supabase = await createClient()

  // Fetch all non-admin users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .neq('role', 'admin')
    .order('full_name')

  // Fetch all groups with their members
  const { data: groupsData } = await supabase
    .from('groups')
    .select('id, name, locked, group_members(user_id)')
    .order('created_at')

  // Fetch all parent-youth links
  const { data: links } = await supabase
    .from('parent_youth_links')
    .select('parent_id, youth_id')

  // Transform data into initial state
  const allUsers = users ?? []
  const allGroups = groupsData ?? []
  const parentChildLinks = links ?? []

  // Build groups state: Record<groupId | 'unassigned', userId[]>
  const assignedUserIds = new Set<string>()
  const initialGroups: Record<string, string[]> = {}
  const groupNames: Record<string, string> = {}

  for (const group of allGroups) {
    const memberIds =
      group.group_members?.map(
        (m: { user_id: string }) => m.user_id
      ) ?? []
    initialGroups[group.id] = memberIds
    groupNames[group.id] = group.name
    for (const id of memberIds) {
      assignedUserIds.add(id)
    }
  }

  // Users not assigned to any group
  initialGroups.unassigned = allUsers
    .filter((u) => !assignedUserIds.has(u.id))
    .map((u) => u.id)

  // Determine if groups are locked (any group locked = all locked)
  const groupsLocked = allGroups.some((g) => g.locked)

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-6xl mx-auto pt-4">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            aria-label="Tilbake til admin"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Grupper</h1>
        </div>

        <GroupBuilder
          initialGroups={initialGroups}
          users={allUsers}
          parentChildLinks={parentChildLinks}
          groupNames={groupNames}
          initialLocked={groupsLocked}
        />
      </div>
    </div>
  )
}
