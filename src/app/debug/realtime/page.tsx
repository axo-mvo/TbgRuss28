'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'

type LogEntry = {
  time: string
  level: 'info' | 'ok' | 'error' | 'event'
  message: string
}

export default function RealtimeDebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [groupId, setGroupId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  function log(level: LogEntry['level'], message: string) {
    const time = new Date().toLocaleTimeString('nb-NO', { hour12: false, fractionalSecondDigits: 3 })
    setLogs((prev) => [...prev, { time, level, message }])
  }

  // On mount: get user info and group
  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase

    async function init() {
      log('info', 'Initializing debug page...')

      // 1. Check auth
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        log('error', `Auth failed: ${authError?.message || 'No session — are you logged in?'}`)
        return
      }
      log('ok', `Authenticated as ${session.user.id.slice(0, 8)}...`)
      log('info', `Token expires: ${new Date(session.expires_at! * 1000).toLocaleString('nb-NO')}`)
      setUserId(session.user.id)

      // 2. Find user's group
      const { data: membership, error: groupError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (groupError) {
        log('error', `Group lookup failed: ${groupError.message}`)
        return
      }
      if (!membership) {
        log('error', 'User is not in any group')
        return
      }
      log('ok', `Group: ${membership.group_id}`)
      setGroupId(membership.group_id)

      // 3. Fetch current sessions for this group
      const { data: sessions, error: sessError } = await supabase
        .from('station_sessions')
        .select('id, station_id, status, group_id')
        .eq('group_id', membership.group_id)

      if (sessError) {
        log('error', `Sessions query failed: ${sessError.message} (code: ${sessError.code})`)
      } else {
        log('ok', `Found ${sessions.length} session(s): ${sessions.map(s => `${s.station_id.slice(0,8)}=${s.status}`).join(', ') || '(none)'}`)
      }

      // 4. Set auth for realtime
      log('info', 'Calling setAuth() with JWT...')
      try {
        await supabase.realtime.setAuth(session.access_token)
        log('ok', 'setAuth() succeeded')
      } catch (err) {
        log('error', `setAuth() failed: ${err}`)
        return
      }

      // 5. Subscribe to postgres_changes
      log('info', `Subscribing to postgres_changes on station_sessions (filter: group_id=eq.${membership.group_id})...`)

      const channel = supabase
        .channel(`dashboard:${membership.group_id}`, { config: { private: true } })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'station_sessions',
            filter: `group_id=eq.${membership.group_id}`,
          },
          (payload) => {
            log('event', `⚡ ${payload.eventType}: ${JSON.stringify(payload.new)}`)
            log('info', `Old record: ${JSON.stringify(payload.old)}`)
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            log('ok', `Channel status: ${status} — listening for events`)
            setSubscribed(true)
          } else if (status === 'CHANNEL_ERROR') {
            log('error', `Channel status: ${status} — ${err?.message || 'unknown error'}`)
          } else if (status === 'TIMED_OUT') {
            log('error', `Channel status: ${status} — connection timed out`)
          } else {
            log('info', `Channel status: ${status}`)
          }
        })

      channelRef.current = channel

      log('ok', 'Waiting for events — start/end a station from another device, or hit Test UPDATE')
    }

    init()

    return () => {
      if (channelRef.current) {
        supabaseRef.current?.removeChannel(channelRef.current)
      }
    }
  }, [])

  // Manual trigger: update a session to force an event
  async function triggerTestUpdate() {
    if (!supabaseRef.current || !groupId) return
    log('info', 'Triggering test UPDATE on a session...')

    const { data: session, error: fetchErr } = await supabaseRef.current
      .from('station_sessions')
      .select('id, status')
      .eq('group_id', groupId)
      .limit(1)
      .maybeSingle()

    if (fetchErr || !session) {
      log('error', `No session to update: ${fetchErr?.message || 'none found'}`)
      return
    }

    log('info', `Updating session ${session.id.slice(0, 8)}... (current status: ${session.status})`)

    // Toggle a harmless field to generate an UPDATE event
    const { error: updateErr } = await supabaseRef.current
      .from('station_sessions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', session.id)

    if (updateErr) {
      log('error', `UPDATE failed: ${updateErr.message} (code: ${updateErr.code})`)
    } else {
      log('ok', 'UPDATE sent — watch for realtime event above ↑')
    }
  }

  const levelColor: Record<LogEntry['level'], string> = {
    info: 'text-gray-400',
    ok: 'text-green-400',
    error: 'text-red-400',
    event: 'text-yellow-300',
  }

  return (
    <div className="min-h-dvh bg-gray-950 text-white p-4 font-mono text-sm">
      <h1 className="text-lg font-bold mb-1">Realtime Debug</h1>
      <p className="text-gray-500 mb-4 text-xs">
        Open this page, then start/end a station from another device. Events should appear below.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={triggerTestUpdate}
          disabled={!subscribed}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-xs"
        >
          Trigger Test UPDATE
        </button>
        <button
          onClick={() => setLogs([])}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
        >
          Clear
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg p-3 max-h-[75dvh] overflow-y-auto">
        {logs.length === 0 && (
          <p className="text-gray-600">Waiting for output...</p>
        )}
        {logs.map((entry, i) => (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="text-gray-600 shrink-0">{entry.time}</span>
            <span className={levelColor[entry.level]}>{entry.message}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-600 space-y-1">
        <p>User: {userId || '...'}</p>
        <p>Group: {groupId || '...'}</p>
        <p>Subscribed: {subscribed ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}
