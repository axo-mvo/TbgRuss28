'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { updateStation } from '@/lib/actions/meeting'

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

interface StationEditorProps {
  station: Station
  meetingId: string
  readOnly: boolean
  onSave: (updated: Station) => void
  onCancel: () => void
}

export default function StationEditor({
  station,
  meetingId,
  readOnly,
  onSave,
  onCancel,
}: StationEditorProps) {
  const [title, setTitle] = useState(station.title)
  const [questions, setQuestions] = useState(station.questions.join('\n'))
  const [tip, setTip] = useState(station.tip ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    const result = await updateStation(station.id, meetingId, {
      title,
      questions,
      tip: tip || undefined,
    })

    if (result.error) {
      setError(result.error)
    } else {
      const questionsArray = questions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean)

      onSave({
        ...station,
        title: title.trim(),
        questions: questionsArray,
        tip: tip.trim() || null,
      })
    }

    setSaving(false)
  }

  if (readOnly) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <span className="block text-xs font-medium text-text-muted mb-1">
            Tittel
          </span>
          <p className="text-sm text-text-primary">{station.title}</p>
        </div>

        {station.questions.length > 0 && (
          <div>
            <span className="block text-xs font-medium text-text-muted mb-1">
              {`Sp\u00f8rsm\u00e5l`}
            </span>
            <ul className="list-disc list-inside text-sm text-text-primary space-y-1">
              {station.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {station.tip && (
          <div>
            <span className="block text-xs font-medium text-text-muted mb-1">
              Tips
            </span>
            <p className="text-sm text-text-primary">{station.tip}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="p-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor={`station-title-${station.id}`}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Tittel
        </label>
        <input
          id={`station-title-${station.id}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor={`station-questions-${station.id}`}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {`Sp\u00f8rsm\u00e5l (ett per linje)`}
        </label>
        <textarea
          id={`station-questions-${station.id}`}
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 min-h-[100px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors resize-y"
        />
      </div>

      <div>
        <label
          htmlFor={`station-tip-${station.id}`}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Tips (valgfritt)
        </label>
        <input
          id={`station-tip-${station.id}`}
          type="text"
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Avbryt
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex-1"
        >
          {saving ? 'Lagrer...' : 'Lagre'}
        </Button>
      </div>
    </div>
  )
}
