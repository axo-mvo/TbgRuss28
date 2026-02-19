type StationStatus = 'available' | 'active' | 'completed'

interface StationCardProps {
  station: {
    id: string
    number: number
    title: string
    description: string | null
  }
  status: StationStatus
  onOpen: () => void
  disabled: boolean
  loading?: boolean
}

const statusStyles: Record<StationStatus, string> = {
  available: 'border-teal-primary/20 bg-warm-white',
  active: 'border-coral/50 bg-coral/5',
  completed: 'border-text-muted/20 bg-text-muted/5 opacity-60',
}

const statusLabels: Record<StationStatus, { text: string; className: string }> = {
  available: { text: 'Tilgjengelig', className: 'text-teal-primary bg-teal-primary/10' },
  active: { text: 'Aktiv', className: 'text-coral bg-coral/10' },
  completed: { text: 'Fullfort', className: 'text-text-muted bg-text-muted/10' },
}

export default function StationCard({
  station,
  status,
  onOpen,
  disabled,
  loading = false,
}: StationCardProps) {
  const isTappable = status !== 'completed' && !disabled
  const label = statusLabels[status]

  return (
    <button
      type="button"
      onClick={isTappable ? onOpen : undefined}
      disabled={!isTappable || loading}
      className={`w-full min-h-[80px] rounded-xl border-2 p-4 text-left transition-colors ${statusStyles[status]} ${
        isTappable
          ? 'cursor-pointer active:scale-[0.98]'
          : 'cursor-default'
      } ${disabled && status === 'available' ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted mb-0.5">
            Stasjon {station.number}
          </p>
          <p className="text-sm font-semibold text-text-primary truncate">
            {station.title}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${label.className}`}
        >
          {loading ? 'Apner...' : label.text}
        </span>
      </div>
    </button>
  )
}
