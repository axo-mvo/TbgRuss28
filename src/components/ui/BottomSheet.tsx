'use client'

import { useRef, useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
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
      className="fixed inset-0 m-0 p-0 w-full max-w-full h-auto max-h-[85dvh]
        rounded-t-2xl bg-white shadow-2xl
        translate-y-full open:translate-y-0
        transition-transform duration-300 ease-out
        backdrop:bg-black/50
        self-end"
      style={{ marginTop: 'auto' }}
    >
      <div className="p-5 overflow-y-auto overscroll-contain max-h-[85dvh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted"
          >
            Lukk
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
