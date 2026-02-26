'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { RUSS_GROUP_NAMES } from '@/lib/constants/group-names'

// ---------- Admin verification helper ----------
// Every admin action must verify the caller is an admin (defense-in-depth).

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.is_admin) return { error: 'Ikke autorisert' }

  return { userId: user.id }
}

// ---------- updateUserRole ----------
// Changes a user's role. Prevents admin from changing their own role.

export async function updateUserRole(
  userId: string,
  newRole: 'youth' | 'parent'
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  if (userId === auth.userId) {
    return { error: 'Du kan ikke endre din egen rolle' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: 'Kunne ikke oppdatere rolle' }

  revalidatePath('/admin/users')
  return {}
}

// ---------- deleteUser ----------
// Hard-deletes a user via auth.admin. Profile cascades via FK.

export async function deleteUser(
  userId: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  if (userId === auth.userId) {
    return { error: 'Du kan ikke slette din egen bruker' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) return { error: 'Kunne ikke slette brukeren' }

  // Profile row is cascade-deleted via FK on profiles.id -> auth.users(id)
  revalidatePath('/admin/users')
  return {}
}

// ---------- updateParentYouthLink ----------
// Replaces all parent-youth links for a parent with the given youth IDs.

export async function updateParentYouthLink(
  parentId: string,
  youthIds: string[]
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Delete existing links for this parent
  const { error: deleteError } = await admin
    .from('parent_youth_links')
    .delete()
    .eq('parent_id', parentId)

  if (deleteError) return { error: 'Kunne ikke oppdatere koblinger' }

  // Insert new links (if any)
  if (youthIds.length > 0) {
    const links = youthIds.map((youthId) => ({
      parent_id: parentId,
      youth_id: youthId,
    }))

    const { error: insertError } = await admin
      .from('parent_youth_links')
      .insert(links)

    if (insertError) return { error: 'Kunne ikke opprette nye koblinger' }
  }

  revalidatePath('/admin/users')
  return {}
}

// ---------- createGroup ----------
// Creates a new group with a random available name from the predefined list.
// If meetingId is provided, scopes the name check and insert to that meeting.

export async function createGroup(meetingId?: string): Promise<{
  error?: string
  group?: { id: string; name: string }
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Get existing group names to find available ones (scoped to meeting if provided)
  const query = admin.from('groups').select('name')
  if (meetingId) query.eq('meeting_id', meetingId)

  const { data: existingGroups } = await query

  const usedNames = new Set(existingGroups?.map((g) => g.name) || [])
  const availableNames = RUSS_GROUP_NAMES.filter((n) => !usedNames.has(n))

  if (availableNames.length === 0) {
    return { error: 'Alle gruppenavn er brukt opp' }
  }

  // Pick a random available name
  const randomName = availableNames[Math.floor(Math.random() * availableNames.length)]

  const insertData: Record<string, unknown> = { name: randomName }
  if (meetingId) insertData.meeting_id = meetingId

  const { data, error } = await admin
    .from('groups')
    .insert(insertData)
    .select()
    .single()

  if (error) return { error: 'Kunne ikke opprette gruppe' }

  revalidatePath(meetingId ? `/admin/meetings/${meetingId}` : '/admin/meetings')
  return { group: { id: data.id, name: data.name } }
}

// ---------- deleteGroup ----------
// Deletes a group. group_members cascade-deleted via FK.

export async function deleteGroup(
  groupId: string,
  meetingId?: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) return { error: 'Kunne ikke slette gruppen' }

  revalidatePath(meetingId ? `/admin/meetings/${meetingId}` : '/admin/meetings')
  return {}
}

// ---------- saveGroupMembers ----------
// Saves group member assignments. Checks parent-child separation for each member.
// Clears all groups first, then re-inserts. Aborts on any conflict.

export async function saveGroupMembers(
  assignments: { groupId: string; userIds: string[] }[],
  meetingId?: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Step 1: Clear all existing group members for the affected groups
  for (const assignment of assignments) {
    const { error: clearError } = await admin
      .from('group_members')
      .delete()
      .eq('group_id', assignment.groupId)

    if (clearError) return { error: 'Kunne ikke fjerne eksisterende gruppemedlemmer' }
  }

  // Step 2: Re-insert members with parent-child separation check
  for (const assignment of assignments) {
    for (const userId of assignment.userIds) {
      // Check parent-child separation constraint
      const { data: check, error: checkError } = await admin
        .rpc('check_parent_child_separation', {
          p_group_id: assignment.groupId,
          p_user_id: userId,
        })

      if (checkError) {
        return { error: 'Kunne ikke sjekke forelder-barn-separasjon' }
      }

      if (check && !check.allowed) {
        return { error: check.reason }
      }

      // Insert the member
      const { error: insertError } = await admin
        .from('group_members')
        .insert({
          group_id: assignment.groupId,
          user_id: userId,
        })

      if (insertError) {
        return { error: 'Kunne ikke legge til medlem i gruppen' }
      }
    }
  }

  revalidatePath(meetingId ? `/admin/meetings/${meetingId}` : '/admin/meetings')
  return {}
}

// ---------- toggleGroupsLock ----------
// Locks or unlocks groups. If meetingId provided, only affects that meeting's groups.

export async function toggleGroupsLock(
  locked: boolean,
  meetingId?: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  const query = admin.from('groups').update({ locked })
  if (meetingId) {
    query.eq('meeting_id', meetingId)
  } else {
    query.neq('id', '00000000-0000-0000-0000-000000000000') // Match all rows (Supabase requires a filter)
  }

  const { error } = await query

  if (error) return { error: locked ? 'Kunne ikke låse gruppene' : 'Kunne ikke låse opp gruppene' }

  revalidatePath(meetingId ? `/admin/meetings/${meetingId}` : '/admin/meetings')
  revalidatePath('/dashboard')
  return {}
}

// ---------- sendTempAccessCode ----------
// Generates a 6-digit code, stores it in temp_access_codes, and returns it.
// The admin can then send the code via the native SMS app using sms: URI.

export async function sendTempAccessCode(
  userId: string
): Promise<{ error?: string; code?: string; phone?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Look up user profile
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { error: 'Kunne ikke finne brukeren' }
  }

  if (!profile.phone) {
    return { error: 'Brukeren har ikke registrert telefonnummer' }
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Invalidate existing unused codes for this user
  await admin
    .from('temp_access_codes')
    .update({ used: true })
    .eq('user_id', userId)
    .eq('used', false)

  // Insert new code
  const { error: insertError } = await admin
    .from('temp_access_codes')
    .insert({
      user_id: userId,
      code,
      expires_at: expiresAt,
    })

  if (insertError) {
    return { error: 'Kunne ikke opprette tilgangskode' }
  }

  return { code, phone: profile.phone }
}

// ---------- updateUserInfo ----------
// Updates a user's name, email, and phone. Admin-only.

export async function updateUserInfo(
  userId: string,
  data: { full_name: string; email: string; phone: string }
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
    })
    .eq('id', userId)

  if (error) return { error: 'Kunne ikke oppdatere brukerinfo' }

  revalidatePath('/admin/users')
  return {}
}

// ---------- toggleAdminAccess ----------
// Grants or revokes admin access for a user. Prevents self-modification.

export async function toggleAdminAccess(
  userId: string,
  isAdmin: boolean
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  if (userId === auth.userId) {
    return { error: 'Du kan ikke endre din egen admintilgang' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)

  if (error) return { error: 'Kunne ikke oppdatere admintilgang' }

  revalidatePath('/admin/users')
  return {}
}
