'use client'

import { useState, type FormEvent } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t border-teal-primary/10 bg-warm-white shrink-0"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Skriv en kommentar..."
        maxLength={2000}
        disabled={disabled}
        className="flex-1 min-h-[44px] px-4 py-2 rounded-full bg-white border border-teal-primary/15 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-teal-primary/40 transition-colors"
      />
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        className="shrink-0 w-10 h-10 rounded-full bg-teal-primary text-warm-white flex items-center justify-center disabled:opacity-40 transition-opacity"
        aria-label="Send melding"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  )
}
