const audienceLabels: Record<string, { label: string; className: string }> = {
  youth: { label: 'Kun for ungdom', className: 'text-teal-primary' },
  parent: { label: 'Kun for foreldre', className: 'text-coral' },
}

interface UpcomingMeetingCardProps {
  meeting: { id: string; title: string; date: string; time: string; venue: string }
  audience?: string
  attendingCount: number
  notAttendingCount: number
  totalMembers: number
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

export default function UpcomingMeetingCard({
  meeting,
  audience,
  attendingCount,
  notAttendingCount,
  totalMembers,
}: UpcomingMeetingCardProps) {
  const notRespondedCount = totalMembers - attendingCount - notAttendingCount
  const audienceInfo = audience ? audienceLabels[audience] : null

  return (
    <div className="mb-4 rounded-xl border-2 border-teal-primary/30 bg-teal-primary/5 p-5">
      <h3 className="text-base font-semibold text-text-primary">
        {meeting.title}
      </h3>
      {audienceInfo && (
        <p className={`text-xs font-medium mt-0.5 ${audienceInfo.className}`}>
          {audienceInfo.label}
        </p>
      )}
      <p className="text-sm text-text-muted mt-1">
        {formatDate(meeting.date)} kl. {meeting.time}
      </p>
      <p className="text-sm text-text-muted">
        {meeting.venue}
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-white border border-gray-200 rounded-full px-2.5 py-1">
          <span className="w-2 h-2 rounded-full bg-success inline-block" />
          <span className="font-semibold text-text-primary">{attendingCount}</span> kommer
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-white border border-gray-200 rounded-full px-2.5 py-1">
          <span className="w-2 h-2 rounded-full bg-coral inline-block" />
          <span className="font-semibold text-text-primary">{notAttendingCount}</span> kan ikke
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-white border border-gray-200 rounded-full px-2.5 py-1">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          <span className="font-semibold text-text-primary">{notRespondedCount}</span> ikke svart
        </span>
      </div>
    </div>
  )
}
