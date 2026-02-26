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

// ---------- activateMeeting ----------
// Transitions a meeting from upcoming -> active after prerequisite checks.

export async function activateMeeting(
  meetingId: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Fetch meeting and verify status
  const { data: meeting, error: fetchError } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) return { error: 'Motet ble ikke funnet' }
  if (meeting.status !== 'upcoming') return { error: 'Kun kommende moter kan startes' }

  // Check prerequisites: >= 1 station, >= 1 group
  const [stationsResult, groupsResult] = await Promise.all([
    admin
      .from('stations')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', meetingId),
    admin
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', meetingId),
  ])

  const stationCount = stationsResult.count ?? 0
  const groupCount = groupsResult.count ?? 0

  if (stationCount < 1) return { error: 'Minst 1 stasjon kreves' }
  if (groupCount < 1) return { error: 'Minst 1 gruppe kreves' }

  // Transition to active
  const { error } = await admin
    .from('meetings')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  if (error) return { error: 'Kunne ikke starte motet' }

  revalidatePath('/admin/meetings')
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath('/dashboard')
  return {}
}

// ---------- completeMeeting ----------
// Transitions a meeting from active -> completed, force-closing any active sessions.

export async function completeMeeting(
  meetingId: string
): Promise<{ error?: string; forceClosedCount?: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Fetch meeting and verify status
  const { data: meeting, error: fetchError } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (fetchError || !meeting) return { error: 'Motet ble ikke funnet' }
  if (meeting.status !== 'active') return { error: 'Kun aktive moter kan avsluttes' }

  // Find active station_sessions for this meeting (via groups FK)
  const { data: activeSessions } = await admin
    .from('station_sessions')
    .select('id, groups!inner(meeting_id)')
    .eq('status', 'active')
    .eq('groups.meeting_id', meetingId)

  const sessionIds = (activeSessions ?? []).map((s) => s.id)
  const forceClosedCount = sessionIds.length

  // Force-close active sessions
  if (sessionIds.length > 0) {
    const { error: closeError } = await admin
      .from('station_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', sessionIds)

    if (closeError) return { error: 'Kunne ikke avslutte aktive sesjoner' }
  }

  // Transition to completed
  const { error } = await admin
    .from('meetings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  if (error) return { error: 'Kunne ikke avslutte motet' }

  revalidatePath('/admin/meetings')
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath('/dashboard')
  return { forceClosedCount }
}

// ---------- getActiveSessionCount ----------
// Returns count of active sessions for a meeting (used by lifecycle controls).

export async function getActiveSessionCount(
  meetingId: string
): Promise<number> {
  const auth = await verifyAdmin()
  if ('error' in auth) return 0

  const admin = createAdminClient()

  const { data } = await admin
    .from('station_sessions')
    .select('id, groups!inner(meeting_id)')
    .eq('status', 'active')
    .eq('groups.meeting_id', meetingId)

  return (data ?? []).length
}

// ---------- addStation ----------
// Adds a new station to an upcoming meeting.
// Auto-assigns the next sequential station number.

export async function addStation(
  meetingId: string,
  data: { title: string; questions: string; tip?: string }
): Promise<{ error?: string; station?: { id: string; number: number } }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Check meeting is upcoming
  const { data: meeting } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (!meeting || meeting.status !== 'upcoming') {
    return { error: 'Kan bare redigere stasjoner for kommende møter' }
  }

  // Get next station number
  const { data: maxRow } = await admin
    .from('stations')
    .select('number')
    .eq('meeting_id', meetingId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNumber = (maxRow?.number ?? 0) + 1

  // Parse questions from newline-separated text
  const questionsArray = data.questions
    .split('\n')
    .map((q: string) => q.trim())
    .filter(Boolean)

  const { data: station, error } = await admin
    .from('stations')
    .insert({
      meeting_id: meetingId,
      number: nextNumber,
      title: data.title.trim(),
      questions: questionsArray,
      tip: data.tip?.trim() || null,
      description: null,
    })
    .select('id, number')
    .single()

  if (error) return { error: 'Kunne ikke opprette stasjonen' }

  revalidatePath(`/admin/meetings/${meetingId}`)
  return { station: { id: station.id, number: station.number } }
}

// ---------- updateStation ----------
// Updates an existing station's title, questions, and tip.

export async function updateStation(
  stationId: string,
  meetingId: string,
  data: { title: string; questions: string; tip?: string }
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Check meeting is upcoming
  const { data: meeting } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (!meeting || meeting.status !== 'upcoming') {
    return { error: 'Kan bare redigere stasjoner for kommende møter' }
  }

  // Parse questions from newline-separated text
  const questionsArray = data.questions
    .split('\n')
    .map((q: string) => q.trim())
    .filter(Boolean)

  const { error } = await admin
    .from('stations')
    .update({
      title: data.title.trim(),
      questions: questionsArray,
      tip: data.tip?.trim() || null,
    })
    .eq('id', stationId)
    .eq('meeting_id', meetingId)

  if (error) return { error: 'Kunne ikke oppdatere stasjonen' }

  revalidatePath(`/admin/meetings/${meetingId}`)
  return {}
}

// ---------- deleteStation ----------
// Deletes a station and re-numbers remaining stations sequentially.

export async function deleteStation(
  stationId: string,
  meetingId: string
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Check meeting is upcoming
  const { data: meeting } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (!meeting || meeting.status !== 'upcoming') {
    return { error: 'Kan bare redigere stasjoner for kommende møter' }
  }

  const { error } = await admin
    .from('stations')
    .delete()
    .eq('id', stationId)
    .eq('meeting_id', meetingId)

  if (error) return { error: 'Kunne ikke slette stasjonen' }

  // Re-number remaining stations sequentially
  const { data: remaining } = await admin
    .from('stations')
    .select('id')
    .eq('meeting_id', meetingId)
    .order('number')

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await admin
        .from('stations')
        .update({ number: i + 1 })
        .eq('id', remaining[i].id)
        .eq('meeting_id', meetingId)
    }
  }

  revalidatePath(`/admin/meetings/${meetingId}`)
  return {}
}

// ---------- reorderStations ----------
// Reorders stations by updating their number to match the new order.

export async function reorderStations(
  meetingId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Check meeting is upcoming
  const { data: meeting } = await admin
    .from('meetings')
    .select('status')
    .eq('id', meetingId)
    .single()

  if (!meeting || meeting.status !== 'upcoming') {
    return { error: 'Kan bare redigere stasjoner for kommende møter' }
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin
      .from('stations')
      .update({ number: i + 1 })
      .eq('id', orderedIds[i])
      .eq('meeting_id', meetingId)

    if (error) return { error: 'Kunne ikke endre rekkefølgen' }
  }

  revalidatePath(`/admin/meetings/${meetingId}`)
  return {}
}
