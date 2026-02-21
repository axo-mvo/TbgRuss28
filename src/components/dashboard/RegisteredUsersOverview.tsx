import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

interface YouthWithParents {
  id: string
  full_name: string
  attending: boolean | null
  parents: Array<{ id: string; full_name: string; attending: boolean | null }>
}

interface SummaryCounts {
  youthCount: number
  parentCount: number
  attendingCount: number
  notRespondedCount: number
}

interface RegisteredUsersOverviewProps {
  youth: YouthWithParents[]
  summary: SummaryCounts
}

function AttendanceIndicator({ attending }: { attending: boolean | null }) {
  if (attending === true) return <span className="w-2 h-2 rounded-full bg-success shrink-0" title="Kommer" />
  if (attending === false) return <span className="w-2 h-2 rounded-full bg-coral shrink-0" title="Kommer ikke" />
  return <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" title="Har ikke svart" />
}

export default function RegisteredUsersOverview({
  youth,
  summary,
}: RegisteredUsersOverviewProps) {
  if (youth.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Registrerte deltakere
        </h2>
        <EmptyState
          title="Ingen ungdommer registrert ennå"
          description="Deltakere vises her etter registrering."
        />
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Registrerte deltakere
      </h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="font-semibold text-text-primary">{summary.youthCount}</span> Ungdommer
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="font-semibold text-text-primary">{summary.parentCount}</span> Foreldre
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-success inline-block" />
          <span className="font-semibold text-text-primary">{summary.attendingCount}</span> Kommer
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-text-muted bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          <span className="font-semibold text-text-primary">{summary.notRespondedCount}</span> Har ikke svart
        </span>
      </div>
      <div className="space-y-2">
        {youth.map((y) => (
          <details key={y.id} className="group">
            <summary className="flex items-center justify-between min-h-[44px] p-3 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-text-primary flex items-center gap-2">
                {y.full_name}
                <AttendanceIndicator attending={y.attending} />
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="parent">
                  {y.parents.length} {y.parents.length === 1 ? 'forelder' : 'foreldre'}
                </Badge>
                <svg
                  className="w-4 h-4 text-text-muted transition-transform duration-200 group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </summary>
            <div className="pl-4 pt-2 pb-1 space-y-1">
              {y.parents.length === 0 ? (
                <p className="text-sm italic text-text-muted">
                  Ingen foreldre registrert
                </p>
              ) : (
                y.parents.map((parent) => (
                  <div
                    key={parent.id}
                    className="text-sm text-text-muted flex items-center gap-2"
                  >
                    <AttendanceIndicator attending={parent.attending} />
                    {parent.full_name}
                  </div>
                ))
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
