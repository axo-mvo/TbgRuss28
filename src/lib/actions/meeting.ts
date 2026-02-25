'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ---------- Admin verification helper ----------
// Duplicated from admin.ts to keep meeting actions self-contained.

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { error: 'Ikke autorisert' }

  return { userId: user.id }
}

// ---------- createMeeting ----------
// Creates a new meeting with date, time, and venue.
// Enforces single-upcoming-meeting constraint at application level.
// useActionState-compatible signature.

export async function createMeeting(
  prevState: { error?: string; id?: string } | null,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const date = formData.get('date') as string | null
  const time = formData.get('time') as string | null
  const venue = formData.get('venue') as string | null

  if (!date || !time || !venue) {
    return { error: 'Alle felt er pakrevd' }
  }

  const admin = createAdminClient()

  // Check for existing upcoming meeting
  const { data: existing } = await admin
    .from('meetings')
    .select('id')
    .eq('status', 'upcoming')
    .maybeSingle()

  if (existing) {
    return { error: 'Det finnes allerede et kommende mote' }
  }

  // Auto-generate title based on total meeting count
  const { count } = await admin
    .from('meetings')
    .select('*', { count: 'exact', head: true })

  const title = `Fellesm\u00f8te #${(count ?? 0) + 1}`

  // Insert the meeting
  const { data, error } = await admin
    .from('meetings')
    .insert({ title, date, time, venue, status: 'upcoming' })
    .select('id')
    .single()

  if (error) return { error: 'Kunne ikke opprette motet' }

  revalidatePath('/admin/meetings')
  return { id: data.id }
}

// ---------- deleteMeeting ----------
// Deletes an upcoming meeting. Refuses if meeting is active or completed.

export async function deleteMeeting(
  meetingId: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Check meeting status
  const { data: meeting, error: fetchError } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) {
    return { error: 'Motet ble ikke funnet' }
  }

  if (meeting.status !== 'upcoming') {
    return { error: 'Kan kun slette kommende moter' }
  }

  const { error } = await admin
    .from('meetings')
    .delete()
    .eq('id', meetingId)

  if (error) return { error: 'Kunne ikke slette motet' }

  revalidatePath('/admin/meetings')
  return {}
}
