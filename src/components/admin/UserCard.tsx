'use client'

import { useSortable } from '@dnd-kit/react/sortable'
import Badge from '@/components/ui/Badge'

const roleLabels: Record<string, string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
}

interface UserCardProps {
  id: string
  index: number
  column: string
  userName: string
  userRole: string
  hasConflict: boolean
  locked: boolean
  isMobile?: boolean
  onAssign?: () => void
}

export default function UserCard({
  id,
  index,
  column,
  userName,
  userRole,
  hasConflict,
  locked,
  isMobile,
  onAssign,
}: UserCardProps) {
  // Desktop: draggable via useSortable
  // Mobile: no drag, tap-to-assign button instead
  const { ref, isDragging } = useSortable({
    id,
    index,
    type: 'user',
    accept: 'user',
    group: column,
    disabled: locked || isMobile,
  })

  const badgeVariant =
    userRole === 'parent' ? 'parent' : userRole === 'admin' ? 'admin' : 'youth'

  return (
    <div
      ref={ref}
      className={`p-3 rounded-lg border min-h-[44px] flex items-center justify-between gap-2 transition-colors ${
        hasConflict
          ? 'border-danger bg-danger/5'
          : isDragging
            ? 'opacity-50 border-teal-primary'
            : locked
              ? 'border-gray-100 bg-gray-50'
              : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-text-primary text-sm truncate">
          {userName}
        </span>
        <Badge variant={badgeVariant} className="shrink-0">
          {roleLabels[userRole] || userRole}
        </Badge>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasConflict && (
          <span className="text-xs text-danger font-medium">
            Forelder-barn-konflikt!
          </span>
        )}
        {isMobile && !locked && onAssign && (
          <button
            onClick={onAssign}
            className="min-h-[36px] px-3 py-1 text-xs font-medium rounded-md border border-teal-primary text-teal-primary hover:bg-teal-primary/5 transition-colors"
          >
            Tildel
          </button>
        )}
      </div>
    </div>
  )
}
