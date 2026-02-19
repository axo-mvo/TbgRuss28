'use client'

import { useRef, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'

interface ReopenDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (minutes: number) => void
  loading: boolean
}

const TIME_OPTIONS = [2, 5, 10, 15] as const

export default function ReopenDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: ReopenDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [selectedMinutes, setSelectedMinutes] = useState<number>(5)

  useEffect(() => {
    if (open) {
      ref.current?.showModal()
    } else {
      ref.current?.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-xl p-0 backdrop:bg-black/50 max-w-sm w-[calc(100%-2rem)]"
    >
      <div className="p-5">
        <h2 className="text-lg font-bold text-text-primary mb-1">
          Gjenåpne stasjon?
        </h2>
        <p className="text-text-muted text-sm mb-4">
          Velg hvor mye ekstra tid gruppen får.
        </p>

        {/* Time selection pills */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {TIME_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setSelectedMinutes(minutes)}
              className={`py-3 rounded-lg text-center font-medium transition-colors ${
                selectedMinutes === minutes
                  ? 'bg-teal-primary text-warm-white'
                  : 'bg-text-muted/10 text-text-primary'
              }`}
            >
              <span className="text-lg">{minutes}</span>
              <span className="block text-xs opacity-70">min</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(selectedMinutes)}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Åpner...' : 'Gjenåpne'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
