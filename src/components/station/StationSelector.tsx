'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StationCard from './StationCard'
import { viewStation } from '@/lib/actions/station'

interface Station {
  id: string
  number: number
  title: string
  description: string | null
}

interface Session {
  station_id: string
  id: string
  status: string
  end_timestamp: string | null
}

interface StationSelectorProps {
  stations: Station[]
  sessions: Session[]
  groupId: string
}

export default function StationSelector({
  stations,
  sessions,
  groupId,
}: StationSelectorProps) {
  const router = useRouter()
  const [liveSessions, setLiveSessions] = useState<Session[]>(sessions)
  const [loadingStationId, setLoadingStationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Subscribe to real-time station_sessions changes for this group
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    // setAuth() is REQUIRED so Realtime server has the user's JWT to evaluate RLS policies
    supabase.realtime.setAuth().then(() => {
      if (cancelled) return

      channel = supabase
        .channel(`dashboard:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'station_sessions',
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            const row = payload.new as {
              station_id: string
              id: string
              status: string
              end_timestamp: string | null
            }
            setLiveSessions((prev) => {
              const idx = prev.findIndex(
                (s) => s.station_id === row.station_id
              )
              if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = {
                  station_id: row.station_id,
                  id: row.id,
                  status: row.status,
                  end_timestamp: row.end_timestamp,
                }
                return updated
              }
              return [
                ...prev,
                {
                  station_id: row.station_id,
                  id: row.id,
                  status: row.status,
                  end_timestamp: row.end_timestamp,
                },
              ]
            })
          }
        )
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [groupId])

  const hasActiveStation = liveSessions.some((s) => s.status === 'active')

  function getStatus(stationId: string): 'available' | 'active' | 'completed' {
    const session = liveSessions.find((s) => s.station_id === stationId)
    if (!session) return 'available'
    if (session.status === 'active') return 'active'
    if (session.status === 'completed') return 'completed'
    return 'available'
  }

  function getSessionId(stationId: string): string | undefined {
    return liveSessions.find((s) => s.station_id === stationId)?.id
  }

  async function handleOpen(stationId: string) {
    const status = getStatus(stationId)

    if (status === 'completed') {
      const sessionId = getSessionId(stationId)
      if (sessionId) {
        router.push(`/dashboard/station/${sessionId}`)
      }
      return
    }

    if (status === 'active') {
      const sessionId = getSessionId(stationId)
      if (sessionId) {
        router.push(`/dashboard/station/${sessionId}`)
      }
      return
    }

    // Available station: call viewStation to create/fetch session without starting timer
    setError(null)
    setLoadingStationId(stationId)

    startTransition(async () => {
      const result = await viewStation(stationId)
      setLoadingStationId(null)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.sessionId) {
        router.push(`/dashboard/station/${result.sessionId}`)
      }
    })
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary mb-3">Stasjoner</h2>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stations.map((station) => {
          const status = getStatus(station.id)
          return (
            <StationCard
              key={station.id}
              station={station}
              status={status}
              onOpen={() => handleOpen(station.id)}
              disabled={hasActiveStation && status === 'available'}
              loading={loadingStationId === station.id}
            />
          )
        })}
      </div>
    </div>
  )
}
