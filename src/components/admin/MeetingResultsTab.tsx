'use client'

import Button from '@/components/ui/Button'
import WordCloud from '@/components/admin/WordCloud'
import type { WordCloudMessage } from '@/components/admin/WordCloud'

interface Meeting {
  id: string
  title: string
  status: 'upcoming' | 'active' | 'completed'
}

interface MeetingResultsTabProps {
  meeting: Meeting
  messages: WordCloudMessage[]
  groups: { id: string; name: string }[]
  stations: { id: string; number: number; title: string }[]
}

export default function MeetingResultsTab({
  meeting,
  messages,
  groups,
  stations,
}: MeetingResultsTabProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <svg
            className="h-8 w-8 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
        </div>
        <p className="text-text-muted text-sm">
          Ingen samtaler enna for dette motet
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Export section */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Eksporter samtaler
        </h3>
        <a
          href={`/api/export?meetingId=${meeting.id}`}
          download
        >
          <Button variant="primary" className="w-full">
            Last ned Markdown-eksport
          </Button>
        </a>
      </div>

      <hr className="border-gray-200" />

      {/* Word cloud section */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Ordsky
        </h3>
        <WordCloud
          messages={messages}
          groups={groups}
          stations={stations}
        />
      </div>
    </div>
  )
}
