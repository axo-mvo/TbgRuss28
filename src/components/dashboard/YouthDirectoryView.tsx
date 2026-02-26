import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ContactActions from './ContactActions'

interface YouthWithParents {
  id: string
  full_name: string
  phone: string | null
  email: string
  parents: Array<{
    id: string
    full_name: string
    phone: string | null
    email: string
  }>
}

interface YouthDirectoryViewProps {
  youth: YouthWithParents[]
}

export default function YouthDirectoryView({ youth }: YouthDirectoryViewProps) {
  if (youth.length === 0) {
    return (
      <EmptyState
        title="Ingen treff"
        description="Prøv et annet søk."
      />
    )
  }

  return (
    <div className="space-y-2">
      {youth.map((y) => (
        <div key={y.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <details className="group">
            <summary className="flex items-start justify-between min-h-[44px] p-3 cursor-pointer hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary text-base">{y.full_name}</span>
                  <ContactActions phone={y.phone} email={y.email} variant="compact" />
                </div>
                {y.email && (
                  <a
                    href={`mailto:${y.email}`}
                    className="text-sm text-text-muted hover:text-teal-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {y.email}
                  </a>
                )}
              </div>
              <span className="flex items-center gap-2 shrink-0 ml-2 pt-0.5">
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
            <div className="border-t border-gray-100 px-3 pb-3 pt-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Foreldre</p>
              {y.parents.length === 0 ? (
                <p className="text-sm italic text-text-muted">
                  Ingen foreldre registrert
                </p>
              ) : (
                <div className="space-y-2">
                  {y.parents.map((parent) => (
                    <div key={parent.id} className="bg-gray-50 rounded-md p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium">{parent.full_name}</span>
                        <ContactActions phone={parent.phone} email={parent.email} variant="compact" />
                      </div>
                      {parent.email && (
                        <a
                          href={`mailto:${parent.email}`}
                          className="text-sm text-text-muted hover:text-teal-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {parent.email}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      ))}
    </div>
  )
}
