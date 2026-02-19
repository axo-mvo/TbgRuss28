'use client'

import { useState, useEffect } from 'react'

type TimerState = {
  remaining: number // seconds (-1 = no timer set)
  color: 'white' | 'yellow' | 'red'
  expired: boolean
  display: string // "MM:SS", "--:--", or "Tiden er ute!"
}

export function useCountdownTimer(endTimestamp: string | null): TimerState {
  const [remaining, setRemaining] = useState<number>(-1) // -1 = sentinel for "no timer"

  useEffect(() => {
    if (!endTimestamp) {
      setRemaining(-1)
      return
    }

    // Immediately sync on mount / endTimestamp change
    const diff = Math.floor(
      (new Date(endTimestamp).getTime() - Date.now()) / 1000
    )
    setRemaining(Math.max(0, diff))

    const interval = setInterval(() => {
      const d = Math.floor(
        (new Date(endTimestamp).getTime() - Date.now()) / 1000
      )
      setRemaining(Math.max(0, d))
    }, 1000)

    return () => clearInterval(interval)
  }, [endTimestamp])

  // No timer set (pre-start state or null endTimestamp)
  if (remaining < 0) {
    return { remaining: -1, color: 'white', expired: false, display: '--:--' }
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const expired = remaining <= 0

  let color: 'white' | 'yellow' | 'red' = 'white'
  if (remaining <= 60) color = 'red'
  else if (remaining <= 300) color = 'yellow'

  const display = expired
    ? 'Tiden er ute!'
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { remaining, color, expired, display }
}
