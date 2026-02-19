'use client'

import { useState } from 'react'
import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { updateParentYouthLink } from '@/lib/actions/admin'

interface ParentLinkSheetProps {
  open: boolean
  onClose: () => void
  parentId: string
  parentName: string
  currentYouthIds: string[]
  allYouth: { id: string; full_name: string }[]
}

export default function ParentLinkSheet({
  open,
  onClose,
  parentId,
  parentName,
  currentYouthIds,
  allYouth,
}: ParentLinkSheetProps) {
  const [selectedYouthIds, setSelectedYouthIds] = useState<string[]>(currentYouthIds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleYouth(youthId: string) {
    setSelectedYouthIds((prev) =>
      prev.includes(youthId)
        ? prev.filter((id) => id !== youthId)
        : [...prev, youthId]
    )
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    const result = await updateParentYouthLink(parentId, selectedYouthIds)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Koblinger for ${parentName}`}
    >
      {allYouth.length === 0 ? (
        <EmptyState
          title="Ingen ungdommer registrert ennå"
        />
      ) : (
        <div>
          {allYouth.map((youth) => (
            <label
              key={youth.id}
              className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer min-h-[44px]"
            >
              <input
                type="checkbox"
                checked={selectedYouthIds.includes(youth.id)}
                onChange={() => toggleYouth(youth.id)}
                className="w-5 h-5 accent-teal-primary flex-shrink-0"
              />
              <span className="text-text-primary">{youth.full_name}</span>
            </label>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger mt-3">{error}</p>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={loading}
        className="mt-4"
      >
        {loading ? 'Lagrer...' : 'Lagre'}
      </Button>
    </BottomSheet>
  )
}
