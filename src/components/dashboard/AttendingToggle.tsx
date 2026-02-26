'use client'

import { useState, useTransition } from 'react'
import { updateMeetingAttendance } from '@/lib/actions/attendance'

interface AttendingToggleProps {
  meetingId: string
  meetingTitle: string
  meetingDate: string    // ISO date string
  meetingTime: string    // HH:MM string
  meetingVenue: string
  initialAttending: boolean | null
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  const formatted = date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export default function AttendingToggle({
  meetingId,
  meetingTitle,
  meetingDate,
  meetingTime,
  meetingVenue,
  initialAttending,
}: AttendingToggleProps) {
  const [attending, setAttending] = useState<boolean | null>(initialAttending)
  const [isPending, startTransition] = useTransition()

  function handleSelect(value: boolean) {
    // Optimistic update
    setAttending(value)
    startTransition(async () => {
      const result = await updateMeetingAttendance(meetingId, value)
      if (result.error) {
        // Revert on error
        setAttending(initialAttending)
      }
    })
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-text-primary mb-0.5">
        {meetingTitle}
      </h3>
      <p className="text-sm text-text-muted mb-1">
        {formatDate(meetingDate)} kl. {meetingTime} &mdash; {meetingVenue}
      </p>
      <p className="text-sm text-text-muted mb-3">Kommer du?</p>

      {attending === null && (
        <p className="text-xs text-text-muted mb-3 italic">
          Du har ikke svart enn&aring;
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
