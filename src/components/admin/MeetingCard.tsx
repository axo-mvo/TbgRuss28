'use client'

import Link from 'next/link'

interface Meeting {
  id: string
  title: string
  status: string
  date: string | null
  time: string | null
  venue: string | null
  created_at: string
}

interface MeetingCardProps {
  meeting: Meeting
  variant: 'upcoming' | 'previous'
}

function formatDate(date: string | null): string {
  if (!date) return 'Ikke satt'
  return new Date(date).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  // time is HH:MM:SS from DB, show HH:MM
  return time.slice(0, 5)
}

export default function MeetingCard({ meeting, variant }: MeetingCardProps) {
  if (variant === 'upcoming') {
    return (
      <Link
        href={`/admin/meetings/${meeting.id}`}
        className="block rounded-xl border-2 border-teal-primary bg-white p-5 shadow-sm
          hover:shadow-md transition-all"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          {meeting.title}
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>{formatDate(meeting.date)}</span>
            {meeting.time ? (
              <span className="ml-1">kl. {formatTime(meeting.time)}</span>
            ) : null}
          </div>
          {meeting.venue ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>{meeting.venue}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-3 text-sm font-medium text-teal-primary">
          Rediger &rarr;
        </div>
      </Link>
    )
  }

  // Previous variant: compact
  return (
    <Link
      href={`/admin/meetings/${meeting.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm
        hover:border-teal-primary hover:shadow-md transition-all min-h-[44px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {meeting.title}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {formatDate(meeting.date)}
            {meeting.venue ? ` \u00b7 ${meeting.venue}` : ''}
          </p>
        </div>
        <svg className="h-4 w-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}
