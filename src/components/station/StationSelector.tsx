'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import StationCard from './StationCard'
import { openStation } from '@/lib/actions/station'

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
  groupId: _groupId,
}: StationSelectorProps) {
  void _groupId // reserved for future client-side use
  const router = useRouter()
  const [loadingStationId, setLoadingStationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const hasActiveStation = sessions.some((s) => s.status === 'active')

  function getStatus(stationId: string): 'available' | 'active' | 'completed' {
    const session = sessions.find((s) => s.station_id === stationId)
    if (!session) return 'available'
    if (session.status === 'active') return 'active'
    if (session.status === 'completed') return 'completed'
    return 'available'
  }

  function getSessionId(stationId: string): string | undefined {
    return sessions.find((s) => s.station_id === stationId)?.id
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

    // Available station: call openStation server action
    setError(null)
    setLoadingStationId(stationId)

    startTransition(async () => {
      const result = await openStation(stationId)
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
