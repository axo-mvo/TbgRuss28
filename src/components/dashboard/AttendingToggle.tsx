'use client'

import { useState, useTransition } from 'react'
import { updateAttending } from '@/lib/actions/auth'

interface AttendingToggleProps {
  initialAttending: boolean | null
}

export default function AttendingToggle({ initialAttending }: AttendingToggleProps) {
  const [attending, setAttending] = useState<boolean | null>(initialAttending)
  const [isPending, startTransition] = useTransition()

  function handleSelect(value: boolean) {
    // Optimistic update
    setAttending(value)
    startTransition(async () => {
      const result = await updateAttending(value)
      if (result.error) {
        // Revert on error
        setAttending(initialAttending)
      }
    })
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-text-primary mb-0.5">
        Fellesm&#248;te onsdag kl. 18:00
      </h3>
      <p className="text-sm text-text-muted mb-3">Kommer du?</p>

      {attending === null && (
        <p className="text-xs text-text-muted mb-3 italic">
          Du har ikke svart enn&#229;
        </p>
      )}

      <div className="flex gap-3">
        {/* Ja button */}
        <button
          onClick={() => handleSelect(true)}
          disabled={isPending}
          className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
            attending === true
              ? 'bg-success/10 border-success text-success'
              : 'border-gray-300 text-text-muted hover:border-gray-400'
          } ${isPending ? 'opacity-60' : ''}`}
        >
          Ja, jeg kommer
        </button>

        {/* Nei button */}
        <button
          onClick={() => handleSelect(false)}
          disabled={isPending}
          className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
            attending === false
              ? 'bg-coral/10 border-coral text-coral'
              : 'border-gray-300 text-text-muted hover:border-gray-400'
          } ${isPending ? 'opacity-60' : ''}`}
        >
          Nei, jeg kan ikke
        </button>
      </div>
    </div>
  )
}
