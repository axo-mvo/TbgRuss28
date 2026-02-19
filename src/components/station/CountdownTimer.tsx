'use client'

import { useCountdownTimer } from '@/lib/hooks/useCountdownTimer'

interface CountdownTimerProps {
  endTimestamp: string | null
}

const colorClasses: Record<'white' | 'yellow' | 'red', string> = {
  white: 'text-warm-white',
  yellow: 'text-yellow-300',
  red: 'text-red-400 animate-pulse',
}

export default function CountdownTimer({ endTimestamp }: CountdownTimerProps) {
  const { display, color } = useCountdownTimer(endTimestamp)

  return (
    <span className={`font-mono text-sm font-bold ${colorClasses[color]}`}>
      {display}
    </span>
  )
}
