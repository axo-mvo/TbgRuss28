'use client'

import { useRouter } from 'next/navigation'
import CountdownTimer from './CountdownTimer'
import ConnectionStatus from './ConnectionStatus'

interface StationHeaderProps {
  stationTitle: string
  stationNumber: number
  endTimestamp: string | null
  onEndStation?: () => void
  readOnly?: boolean
}

export default function StationHeader({
  stationTitle,
  stationNumber,
  endTimestamp,
  onEndStation,
  readOnly = false,
}: StationHeaderProps) {
  const router = useRouter()

  return (
    <header className="flex items-center h-14 px-4 bg-teal-primary text-warm-white shrink-0">
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="mr-3 p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Tilbake til dashboard"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="flex-1 min-w-0 text-center">
        <p className="text-[10px] uppercase tracking-wider opacity-70">
          Stasjon {stationNumber}
        </p>
        <p className="text-sm font-semibold truncate">{stationTitle}</p>
      </div>

      {!readOnly && <ConnectionStatus />}

      <div className="ml-3 flex items-center gap-2">
        {!readOnly && onEndStation && (
          <button
            type="button"
            onClick={onEndStation}
            className="text-xs px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors"
          >
            Avslutt
          </button>
        )}
        {readOnly ? (
          <span className="text-xs px-2 py-1 rounded-md bg-white/15 opacity-70">
            Fullfort
          </span>
        ) : (
          <CountdownTimer endTimestamp={endTimestamp} />
        )}
      </div>
    </header>
  )
}
