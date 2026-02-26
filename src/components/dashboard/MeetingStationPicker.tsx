'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface MeetingStationPickerProps {
  meetingId: string
  stations: Array<{ id: string; number: number; title: string }>
  groups: Array<{ id: string; name: string }>
  selectedStation?: string
  selectedGroup?: string
}

export default function MeetingStationPicker({
  meetingId,
  stations,
  groups,
  selectedStation,
  selectedGroup,
}: MeetingStationPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleStationSelect(stationId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('station', stationId)
    // Preserve group if already selected
    if (!params.has('group') && selectedGroup) {
      params.set('group', selectedGroup)
    }
    router.push(`/dashboard/meeting/${meetingId}?${params.toString()}`)
  }

  function handleGroupSelect(groupId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedStation) {
      params.set('station', selectedStation)
    }
    params.set('group', groupId)
    router.push(`/dashboard/meeting/${meetingId}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Station grid */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Stasjoner</h3>
        <div className="grid grid-cols-2 gap-2">
          {stations.map((station) => {
            const isSelected = selectedStation === station.id
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => handleStationSelect(station.id)}
                className={`min-h-[44px] p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-teal-primary bg-teal-primary/5 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-teal-primary/50'
                }`}
              >
                <p className={`text-xs font-medium ${isSelected ? 'text-teal-primary' : 'text-text-muted'}`}>
                  Stasjon {station.number}
                </p>
                <p className={`text-sm font-semibold ${isSelected ? 'text-text-primary' : 'text-text-primary'}`}>
                  {station.title}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Group selector -- only visible when station selected */}
      {selectedStation ? (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Grupper</h3>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const isSelected = selectedGroup === group.id
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleGroupSelect(group.id)}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-teal-primary text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-text-primary hover:border-teal-primary/50'
                  }`}
                >
                  {group.name}
                </button>
              )
            })}
          </div>
          {!selectedGroup && (
            <p className="text-xs text-text-muted mt-2">Velg en gruppe for a lese diskusjonen</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted">Velg en stasjon for a se diskusjoner</p>
      )}
    </div>
  )
}
