'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Noe gikk galt
        </h2>
        <p className="text-text-muted mb-6 text-sm">
          En feil oppstod. Prøv å laste siden på nytt.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => reset()}>
            Prøv igjen
          </Button>
          <Button
            variant="primary"
            onClick={() => (window.location.href = '/dashboard')}
          >
            Til dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
