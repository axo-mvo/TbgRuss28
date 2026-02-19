'use client'

import { useRouter } from 'next/navigation'
import CountdownTimer from './CountdownTimer'

interface StationHeaderProps {
  stationTitle: string
  stationNumber: number
  endTimestamp: string | null
}

export default function StationHeader({
  stationTitle,
  stationNumber,
  endTimestamp,
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

      <div className="ml-3">
        <CountdownTimer endTimestamp={endTimestamp} />
      </div>
    </header>
  )
}
