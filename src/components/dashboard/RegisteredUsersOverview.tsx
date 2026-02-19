import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

interface YouthWithParents {
  id: string
  full_name: string
  parents: Array<{ id: string; full_name: string }>
}

interface RegisteredUsersOverviewProps {
  youth: YouthWithParents[]
}

export default function RegisteredUsersOverview({
  youth,
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
      <div className="space-y-2">
        {youth.map((y) => (
          <details key={y.id} className="group">
            <summary className="flex items-center justify-between min-h-[44px] p-3 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-text-primary">{y.full_name}</span>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-coral/40 shrink-0" />
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
