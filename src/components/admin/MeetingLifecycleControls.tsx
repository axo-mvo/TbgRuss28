'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import {
  activateMeeting,
  completeMeeting,
  deleteMeeting,
  getActiveSessionCount,
} from '@/lib/actions/meeting'

interface Meeting {
  id: string
  title: string
  status: 'upcoming' | 'active' | 'completed'
}

interface MeetingLifecycleControlsProps {
  meeting: Meeting
  stationCount: number
  groupCount: number
}

export default function MeetingLifecycleControls({
  meeting,
  stationCount,
  groupCount,
}: MeetingLifecycleControlsProps) {
  const router = useRouter()
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSessionCount, setActiveSessionCount] = useState(0)

  const canStart = stationCount >= 1 && groupCount >= 1

  async function handleStart() {
    setLoading(true)
    setError(null)
    const result = await activateMeeting(meeting.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setLoading(false)
    setShowStartDialog(false)
  }

  async function handleOpenEndDialog() {
    setError(null)
    const count = await getActiveSessionCount(meeting.id)
    setActiveSessionCount(count)
    setShowEndDialog(true)
  }

  async function handleEnd() {
    setLoading(true)
    setError(null)
    const result = await completeMeeting(meeting.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setLoading(false)
    setShowEndDialog(false)
  }

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteMeeting(meeting.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/admin/meetings')
    }
    setLoading(false)
    setShowDeleteDialog(false)
  }

  return (
    <div className="mb-6">
      {meeting.status === 'upcoming' && (
        <div className="flex flex-col gap-3">
          {canStart ? (
            <Button
              variant="primary"
              onClick={() => setShowStartDialog(true)}
              className="w-full"
            >
              Start møte
            </Button>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-text-muted">
                Legg til minst 1 stasjon og 1 gruppe for å starte møtet
              </p>
              <p className="text-xs text-text-muted mt-1">
                {stationCount} stasjon{stationCount !== 1 ? 'er' : ''}, {groupCount} gruppe{groupCount !== 1 ? 'r' : ''}
              </p>
            </div>
          )}
          <Button
            variant="danger"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full"
          >
            Slett møte
          </Button>
        </div>
      )}

      {meeting.status === 'active' && (
        <Button
          variant="danger"
          onClick={handleOpenEndDialog}
          className="w-full"
        >
          Avslutt møte
        </Button>
      )}

      {meeting.status === 'completed' && (
        <Badge variant="completed">
          Møtet er avsluttet
        </Badge>
      )}

      {error && (
        <p className="mt-2 text-sm text-danger">{error}</p>
      )}

      {/* Start meeting confirmation dialog */}
      <Dialog
        open={showStartDialog}
        onClose={() => setShowStartDialog(false)}
        onConfirm={handleStart}
        title="Start møte?"
        description={`${stationCount} stasjon${stationCount !== 1 ? 'er' : ''} og ${groupCount} gruppe${groupCount !== 1 ? 'r' : ''} er klare. Stasjoner og grupper kan ikke endres etter at møtet er startet.`}
        confirmLabel="Start møte"
        loading={loading}
      />

      {/* End meeting confirmation dialog */}
      <Dialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onConfirm={handleEnd}
        title="Avslutt møte?"
        description={
          activeSessionCount > 0
            ? `${activeSessionCount} gruppe${activeSessionCount !== 1 ? 'r' : ''} er fortsatt aktive. Alle aktive sesjoner vil bli avsluttet. Avslutt likevel?`
            : 'Er du sikker på at du vil avslutte møtet? Denne handlingen kan ikke angres.'
        }
        confirmLabel="Avslutt møte"
        confirmVariant="danger"
        loading={loading}
      />

      {/* Delete meeting confirmation dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Slett møte?"
        description={`Er du sikker på at du vil slette «${meeting.title}»? Alle stasjoner, grupper og påmeldinger knyttet til møtet vil bli slettet. Denne handlingen kan ikke angres.`}
        confirmLabel="Slett møte"
        confirmVariant="danger"
        loading={loading}
      />
    </div>
  )
}
