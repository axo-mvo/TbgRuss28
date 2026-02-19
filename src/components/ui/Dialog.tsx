'use client'

import { useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}

export default function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Bekreft',
  confirmVariant = 'primary',
  loading = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

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
        <h2 className="text-lg font-bold text-text-primary mb-2">{title}</h2>
        <p className="text-text-muted text-sm mb-6">{description}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Laster...' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
