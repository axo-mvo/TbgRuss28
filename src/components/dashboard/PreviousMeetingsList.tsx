import Link from 'next/link'

interface PreviousMeetingsListProps {
  meetings: Array<{ id: string; title: string; date: string; venue: string | null }>
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

export default function PreviousMeetingsList({ meetings }: PreviousMeetingsListProps) {
  if (meetings.length === 0) {
    return null
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-text-primary mb-3">
        Tidligere møter
      </h2>
      <div className="space-y-2">
        {meetings.map((meeting) => (
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
        ))}
      </div>
    </section>
  )
}
