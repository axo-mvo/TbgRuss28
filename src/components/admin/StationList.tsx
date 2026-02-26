'use client'

import { useState } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'
import { useSortable } from '@dnd-kit/react/sortable'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import StationEditor from '@/components/admin/StationEditor'
import {
  addStation,
  deleteStation,
  reorderStations,
} from '@/lib/actions/meeting'

interface Meeting {
  id: string
  title: string
  status: 'upcoming' | 'active' | 'completed'
  date: string | null
  time: string | null
  venue: string | null
  created_at: string
  updated_at: string
}

interface Station {
  id: string
  meeting_id: string
  number: number
  title: string
  description: string | null
  questions: string[]
  tip: string | null
  created_at: string
}

interface StationListProps {
  meeting: Meeting
  initialStations: Station[]
}

// Sortable station item wrapper
function SortableStationItem({
  station,
  index,
  readOnly,
  expanded,
  onToggle,
  onDelete,
  meetingId,
  onStationUpdate,
}: {
  station: Station
  index: number
  readOnly: boolean
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  meetingId: string
  onStationUpdate: (updated: Station) => void
}) {
  const { ref, isDragging } = useSortable({
    id: station.id,
    index,
    type: 'station',
    accept: 'station',
    group: 'stations',
    disabled: readOnly,
  })

  return (
    <div
      ref={ref}
      className={`rounded-xl border bg-white shadow-sm transition-opacity ${
        isDragging ? 'opacity-50 border-teal-primary' : 'border-gray-200'
      }`}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 min-h-[44px] px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Drag handle */}
        {!readOnly && (
          <div
            className="shrink-0 touch-none cursor-grab active:cursor-grabbing p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              className="h-5 w-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}

        {/* Station number badge */}
        <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-teal-primary/10 text-teal-primary text-sm font-semibold">
          {station.number}
        </span>

        {/* Station title */}
        <span className="flex-1 text-sm font-medium text-text-primary truncate">
          {station.title}
        </span>

        {/* Delete button */}
        {!readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center text-text-muted hover:text-danger transition-colors rounded-md"
            aria-label={`Slett stasjon ${station.number}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}

        {/* Expand/collapse chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          <StationEditor
            station={station}
            meetingId={meetingId}
            readOnly={readOnly}
            onSave={(updated) => {
              onStationUpdate(updated)
              onToggle()
            }}
            onCancel={onToggle}
          />
        </div>
      )}
    </div>
  )
}

export default function StationList({
  meeting,
  initialStations,
}: StationListProps) {
  const [stations, setStations] = useState<Station[]>(initialStations)
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New station form state
  const [newTitle, setNewTitle] = useState('')
  const [newQuestions, setNewQuestions] = useState('')
  const [newTip, setNewTip] = useState('')
  const [saving, setSaving] = useState(false)

  const readOnly = meeting.status !== 'upcoming'

  function handleToggle(stationId: string) {
    setExpandedId((prev) => (prev === stationId ? null : stationId))
  }

  function handleStationUpdate(updated: Station) {
    setStations((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    )
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)
    setError(null)

    const result = await addStation(meeting.id, {
      title: newTitle,
      questions: newQuestions,
      tip: newTip || undefined,
    })

    if (result.error) {
      setError(result.error)
    } else if (result.station) {
      // Build the new station object from form data + server response
      const questionsArray = newQuestions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean)

      const newStation: Station = {
        id: result.station.id,
        meeting_id: meeting.id,
        number: result.station.number,
        title: newTitle.trim(),
        description: null,
        questions: questionsArray,
        tip: newTip.trim() || null,
        created_at: new Date().toISOString(),
      }

      setStations((prev) => [...prev, newStation])
      setNewTitle('')
      setNewQuestions('')
      setNewTip('')
      setAdding(false)
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    setError(null)

    const result = await deleteStation(deleteId, meeting.id)

    if (result.error) {
      setError(result.error)
    } else {
      setStations((prev) => {
        const remaining = prev.filter((s) => s.id !== deleteId)
        // Re-number locally to match server re-numbering
        return remaining.map((s, i) => ({ ...s, number: i + 1 }))
      })
      if (expandedId === deleteId) setExpandedId(null)
    }

    setDeleteId(null)
    setDeleting(false)
  }

  // For DragDropProvider: stations as items keyed by id
  const stationItems = stations.map((s) => s.id)

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline text-xs"
          >
            Lukk
          </button>
        </div>
      )}

      {stations.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center mb-4">
          <p className="text-sm text-text-muted">
            Ingen stasjoner enda. Legg til den forste stasjonen.
          </p>
        </div>
      )}

      {/* Station list */}
      {readOnly ? (
        /* Read-only: no drag, static list */
        <div className="flex flex-col gap-3 mb-4">
          {stations.map((station, index) => (
            <SortableStationItem
              key={station.id}
              station={station}
              index={index}
              readOnly
              expanded={expandedId === station.id}
              onToggle={() => handleToggle(station.id)}
              onDelete={() => {}}
              meetingId={meeting.id}
              onStationUpdate={handleStationUpdate}
            />
          ))}
        </div>
      ) : (
        /* Editable: drag-and-drop sortable */
        <DragDropProvider
          onDragOver={(event) => {
            setStations((prev) => {
              const ids = prev.map((s) => s.id)
              const movedIds = move(ids, event)
              if (!Array.isArray(movedIds)) return prev
              // Rebuild stations array in new order
              const stationMap = new Map(prev.map((s) => [s.id, s]))
              return (movedIds as string[])
                .map((id) => stationMap.get(id))
                .filter((s): s is Station => !!s)
                .map((s, i) => ({ ...s, number: i + 1 }))
            })
          }}
          onDragEnd={() => {
            // Persist new order to server
            const orderedIds = stations.map((s) => s.id)
            reorderStations(meeting.id, orderedIds)
              .then((result) => {
                if (result.error) {
                  setError(result.error)
                }
              })
              .catch(() => {
                setError('Kunne ikke endre rekkefølgen')
              })
          }}
        >
          <div className="flex flex-col gap-3 mb-4">
            {stations.map((station, index) => (
              <SortableStationItem
                key={station.id}
                station={station}
                index={index}
                readOnly={false}
                expanded={expandedId === station.id}
                onToggle={() => handleToggle(station.id)}
                onDelete={() => setDeleteId(station.id)}
                meetingId={meeting.id}
                onStationUpdate={handleStationUpdate}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      {/* Add station form */}
      {!readOnly && adding && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Ny stasjon
          </h3>

          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="new-station-title"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Tittel
              </label>
              <input
                id="new-station-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Stasjonens tittel"
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="new-station-questions"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                {`Sp\u00f8rsm\u00e5l (ett per linje)`}
              </label>
              <textarea
                id="new-station-questions"
                value={newQuestions}
                onChange={(e) => setNewQuestions(e.target.value)}
                placeholder={`Skriv ett sp\u00f8rsm\u00e5l per linje`}
                rows={4}
                className="w-full px-4 py-3 min-h-[100px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors resize-y"
              />
            </div>

            <div>
              <label
                htmlFor="new-station-tip"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Tips (valgfritt)
              </label>
              <input
                id="new-station-tip"
                type="text"
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                placeholder="Valgfritt tips til gruppen"
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setAdding(false)
                  setNewTitle('')
                  setNewQuestions('')
                  setNewTip('')
                }}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={saving || !newTitle.trim()}
                className="flex-1"
              >
                {saving ? 'Lagrer...' : 'Legg til'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add station button */}
      {!readOnly && !adding && (
        <Button
          variant="secondary"
          onClick={() => setAdding(true)}
          className="w-full"
        >
          + Legg til stasjon
        </Button>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Slett stasjon?"
        description="Er du sikker? Stasjonen og alle data vil bli slettet permanent."
        confirmLabel="Slett"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
