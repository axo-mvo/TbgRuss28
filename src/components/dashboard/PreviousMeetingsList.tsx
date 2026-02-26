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
        Tidligere moter
      </h2>
      <div className="space-y-2">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="p-3 rounded-lg border border-gray-200 bg-white"
          >
            <p className="font-medium text-text-primary text-sm">
              {meeting.title}
            </p>
            <p className="text-xs text-text-muted">
              {formatDate(meeting.date)}
              {meeting.venue ? ` \u2014 ${meeting.venue}` : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
