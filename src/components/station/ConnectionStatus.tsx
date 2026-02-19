'use client'

import { useConnectionStatus, type ConnectionStatus as Status } from '@/lib/hooks/useConnectionStatus'

const statusConfig: Record<Status, { color: string; label: string }> = {
  connected: { color: 'bg-green-500', label: '' },
  reconnecting: { color: 'bg-yellow-500 animate-pulse', label: 'Kobler til...' },
  offline: { color: 'bg-red-500', label: 'Frakoblet' },
}

export default function ConnectionStatus() {
  const status = useConnectionStatus()

  if (status === 'connected') return null

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-[10px] text-warm-white/70">{config.label}</span>
    </div>
  )
}
