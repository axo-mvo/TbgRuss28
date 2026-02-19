'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline'

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(
    () => typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected'
  )

  useEffect(() => {
    const supabase = createClient()

    function handleOnline() {
      // Browser reports online, but wait for heartbeat confirmation
      setStatus('reconnecting')
    }

    function handleOffline() {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    supabase.realtime.onHeartbeat((heartbeatStatus: string) => {
      switch (heartbeatStatus) {
        case 'ok':
          setStatus('connected')
          break
        case 'timeout':
        case 'error':
          setStatus('reconnecting')
          break
        case 'disconnected':
          setStatus('offline')
          break
        // 'sent' — just means heartbeat was sent, waiting for reply; ignore
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
