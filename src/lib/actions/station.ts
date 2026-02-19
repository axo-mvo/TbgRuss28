'use server'

import { createClient } from '@/lib/supabase/server'

// ---------- viewStation ----------
// Creates or fetches a station session WITHOUT starting the timer.
// Used when navigating to a station to preview questions before starting.

export async function viewStation(
  stationId: string
): Promise<{ sessionId?: string; status?: string; endTimestamp?: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Get user's group_id via group_members
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Du er ikke i en gruppe' }

  // Call the view_station Postgres function
  const { data, error } = await supabase.rpc('view_station', {
    p_station_id: stationId,
    p_group_id: membership.group_id,
  })

  if (error) return { error: 'Kunne ikke vise stasjonen' }

  const result = data as { id?: string; status?: string; end_timestamp?: string | null; error?: string }

  if (result.error) return { error: result.error }

  return {
    sessionId: result.id,
    status: result.status,
    endTimestamp: result.end_timestamp,
  }
}

// ---------- openStation ----------
// Opens a station for the current user's group.
// Calls the open_station Postgres function for atomic station opening.

export async function openStation(
  stationId: string
): Promise<{ sessionId?: string; endTimestamp?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Get user's group_id via group_members
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Du er ikke i en gruppe' }

  // Call the atomic open_station Postgres function
  const { data, error } = await supabase.rpc('open_station', {
    p_station_id: stationId,
    p_group_id: membership.group_id,
  })

  if (error) return { error: 'Kunne ikke åpne stasjonen' }

  // The function returns JSON with either {id, end_timestamp, status} or {error}
  const result = data as { id?: string; end_timestamp?: string; status?: string; error?: string }

  if (result.error) return { error: result.error }

  return {
    sessionId: result.id,
    endTimestamp: result.end_timestamp,
  }
}

// ---------- sendMessage ----------
// Persists a chat message to the messages table.
// RLS enforces group membership.

export async function sendMessage(
  data: { id: string; sessionId: string; content: string }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Trim and validate
  const content = data.content.trim()
  if (!content) return { error: 'Meldingen kan ikke være tom' }

  // Persist to messages table (RLS enforces group membership)
  const { error } = await supabase
    .from('messages')
    .insert({
      id: data.id,
      session_id: data.sessionId,
      user_id: user.id,
      content,
    })

  if (error) return { error: 'Kunne ikke sende melding' }
  return {}
}

// ---------- endStation ----------
// Ends an active station session.
// Calls the complete_station Postgres function for atomic, idempotent completion.

export async function endStation(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Get the session's group_id to verify membership
  const { data: session } = await supabase
    .from('station_sessions')
    .select('group_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return { error: 'Økt ikke funnet' }

  // Verify user is in the group
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Du er ikke medlem av denne gruppen' }

  // Call the atomic complete_station Postgres function
  const { data, error } = await supabase.rpc('complete_station', {
    p_session_id: sessionId,
  })

  if (error) {
    console.error('complete_station RPC error:', error.message, error.code)
    return { error: 'Kunne ikke avslutte stasjonen' }
  }

  const result = data as { success?: boolean; error?: string }
  if (result.error) return { error: result.error }

  return {}
}

// ---------- reopenStation ----------
// Reopens a completed station session with additional time.
// Calls the reopen_station Postgres function for atomic, race-safe reopening.

export async function reopenStation(
  sessionId: string,
  extraMinutes: number
): Promise<{ endTimestamp?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Validate extraMinutes on server side
  if (![2, 5, 10, 15].includes(extraMinutes)) {
    return { error: 'Ugyldig tid' }
  }

  // Get the session's group_id to verify membership
  const { data: session } = await supabase
    .from('station_sessions')
    .select('group_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return { error: 'Økt ikke funnet' }

  // Verify user is in the group
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', session.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Du er ikke medlem av denne gruppen' }

  // Call the atomic reopen_station Postgres function
  const { data, error } = await supabase.rpc('reopen_station', {
    p_session_id: sessionId,
    p_extra_minutes: extraMinutes,
  })

  if (error) {
    console.error('reopen_station RPC error:', error.message, error.code)
    return { error: 'Kunne ikke gjenåpne stasjonen' }
  }

  const result = data as { id?: string; end_timestamp?: string; status?: string; error?: string }
  if (result.error) return { error: result.error }

  return { endTimestamp: result.end_timestamp }
}

// ---------- loadMessages ----------
// Loads message history for a station session.
// Joins with profiles for full_name and role.

export async function loadMessages(
  sessionId: string
): Promise<{
  messages?: Array<{
    id: string
    userId: string
    fullName: string
    role: 'youth' | 'parent'
    content: string
    createdAt: string
  }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Fetch messages with profile joins, ordered by created_at ASC
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      user_id,
      content,
      created_at,
      profiles:user_id (
        full_name,
        role
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) return { error: 'Kunne ikke laste meldinger' }

  const messages = (data ?? []).map((msg) => {
    // Supabase PostgREST returns the joined profile as an object or array
    const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
    return {
      id: msg.id,
      userId: msg.user_id,
      fullName: profile?.full_name ?? 'Ukjent',
      role: (profile?.role ?? 'youth') as 'youth' | 'parent',
      content: msg.content,
      createdAt: msg.created_at,
    }
  })

  return { messages }
}
