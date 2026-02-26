import Link from 'next/link'

const audienceLabels: Record<string, string> = {
  youth: 'Kun for ungdom',
  parent: 'Kun for foreldre',
}

interface PreviousMeetingsListProps {
  meetings: Array<{ id: string; title: string; date: string; venue: string | null; audience?: string }>
  userRole: string
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  const formatted = date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export default function PreviousMeetingsList({ meetings, userRole }: PreviousMeetingsListProps) {
  if (meetings.length === 0) {
    return null
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-text-primary mb-3">
        Tidligere moter
      </h2>
      <div className="space-y-2">
        {meetings.map((meeting) => {
          const audience = meeting.audience ?? 'everyone'
          const targeted = audience === 'everyone' || audience === userRole

          if (targeted) {
            return (
              <Link
                href={`/dashboard/meeting/${meeting.id}`}
                key={meeting.id}
                className="block p-3 rounded-lg border border-gray-200 bg-white hover:border-teal-primary hover:shadow-sm transition-all"
              >
                <p className="font-medium text-text-primary text-sm">
                  {meeting.title}
                </p>
                <p className="text-xs text-text-muted">
                  {formatDate(meeting.date)}
                  {meeting.venue ? ` \u2014 ${meeting.venue}` : ''}
                </p>
                <span className="text-xs text-teal-primary mt-1 block">Se diskusjoner &rarr;</span>
              </Link>
            )
          }

          // Non-targeted: plain div, greyed out, no link
          return (
            <div
              key={meeting.id}
              className="p-3 rounded-lg border border-gray-200 bg-white opacity-50"
            >
              <p className="font-medium text-text-primary text-sm">
                {meeting.title}
              </p>
              <p className="text-xs text-text-muted">
                {formatDate(meeting.date)}
                {meeting.venue ? ` \u2014 ${meeting.venue}` : ''}
              </p>
              <span className="text-xs text-text-muted mt-1 block italic">
                {audienceLabels[audience] ?? ''}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
