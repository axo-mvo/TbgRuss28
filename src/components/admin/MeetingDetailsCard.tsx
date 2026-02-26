'use client'

import { useState, useActionState, useEffect } from 'react'
import { updateMeeting } from '@/lib/actions/meeting'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Button from '@/components/ui/Button'

const statusLabels: Record<string, string> = {
  upcoming: 'Kommende',
  active: 'Aktivt',
  completed: 'Fullfort',
}

const audienceBadges: Record<string, { label: string; className: string }> = {
  youth: { label: 'Ungdom', className: 'bg-teal-primary/10 text-teal-primary' },
  parent: { label: 'Foreldre', className: 'bg-coral/10 text-coral' },
}

function formatDate(date: string | null): string {
  if (!date) return 'Ikke satt'
  return new Date(date).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

interface MeetingDetailsCardProps {
  meeting: {
    id: string
    title: string
    status: string
    date: string | null
    time: string | null
    venue: string | null
    audience?: string
  }
  adminRole?: string
}

export default function MeetingDetailsCard({ meeting, adminRole = 'youth' }: MeetingDetailsCardProps) {
  const [editing, setEditing] = useState(false)
  const [editAudience, setEditAudience] = useState(meeting.audience || 'everyone')
  const boundAction = updateMeeting.bind(null, meeting.id)
  const [state, action, pending] = useActionState(boundAction, null)

  const badgeVariant =
    meeting.status === 'upcoming' ||
    meeting.status === 'active' ||
    meeting.status === 'completed'
      ? (meeting.status as 'upcoming' | 'active' | 'completed')
      : 'upcoming'

  const canEdit = true

  // Switch back to view mode on success
  useEffect(() => {
    if (state?.success) {
      setEditing(false)
    }
  }, [state?.success])

  if (editing) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            Rediger detaljer
          </h1>
          <Badge variant={badgeVariant}>
            {statusLabels[meeting.status] ?? meeting.status}
          </Badge>
        </div>

        {state?.error && (
          <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 mb-4">
            <p className="text-sm text-danger font-medium">{state.error}</p>
          </div>
        )}

        <form action={action} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <div className="flex flex-col gap-4">
            <Input
              label="Tittel"
              id="title"
              name="title"
              type="text"
              required
              defaultValue={meeting.title}
            />

            <div>
              <Label htmlFor="date">Dato</Label>
              <input
                type="date"
                id="date"
                name="date"
                required
                defaultValue={meeting.date ?? ''}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300
                  focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20
                  bg-white outline-none transition-colors"
              />
            </div>

            <div>
              <Label htmlFor="time">Tidspunkt</Label>
              <input
                type="time"
                id="time"
                name="time"
                required
                defaultValue={meeting.time ?? ''}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300
                  focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20
                  bg-white outline-none transition-colors"
              />
            </div>

            <Input
              label="Sted"
              id="venue"
              name="venue"
              type="text"
              required
              defaultValue={meeting.venue ?? ''}
            />

            <div>
              <Label htmlFor="audience">{`M\u00e5lgruppe`}</Label>
              <input type="hidden" name="audience" value={editAudience} />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEditAudience('everyone')}
                  className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
                    editAudience === 'everyone'
                      ? 'bg-teal-primary/10 border-teal-primary text-teal-primary'
                      : 'border-gray-300 text-text-muted hover:border-gray-400'
                  }`}
                >
                  Alle
                </button>
                {adminRole === 'youth' && (
                  <button
                    type="button"
                    onClick={() => setEditAudience('youth')}
                    className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
                      editAudience === 'youth'
                        ? 'bg-teal-primary/10 border-teal-primary text-teal-primary'
                        : 'border-gray-300 text-text-muted hover:border-gray-400'
                    }`}
                  >
                    Kun ungdom
                  </button>
                )}
                {adminRole === 'parent' && (
                  <button
                    type="button"
                    onClick={() => setEditAudience('parent')}
                    className={`flex-1 min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${
                      editAudience === 'parent'
                        ? 'bg-coral/10 border-coral text-coral'
                        : 'border-gray-300 text-text-muted hover:border-gray-400'
                    }`}
                  >
                    Kun foreldre
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? 'Lagrer...' : 'Lagre'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // View mode
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {meeting.title}
        </h1>
        <Badge variant={badgeVariant}>
          {statusLabels[meeting.status] ?? meeting.status}
        </Badge>
        {meeting.audience && audienceBadges[meeting.audience] && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${audienceBadges[meeting.audience].className}`}>
            {audienceBadges[meeting.audience].label}
          </span>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto p-2 rounded-lg text-text-muted hover:text-teal-primary hover:bg-teal-primary/5 transition-colors"
            aria-label="Rediger detaljer"
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
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <span>{formatDate(meeting.date)}</span>
            {meeting.time ? (
              <span className="ml-1">kl. {formatTime(meeting.time)}</span>
            ) : null}
          </div>
          {meeting.venue ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <span>{meeting.venue}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
