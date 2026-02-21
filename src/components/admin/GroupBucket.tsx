'use client'

import { useDroppable } from '@dnd-kit/react'
import UserCard from '@/components/admin/UserCard'
import { checkConflict } from '@/lib/utils/parent-child'

interface UserData {
  id: string
  full_name: string
  role: string
  attending?: boolean | null
}

interface GroupBucketProps {
  groupId: string
  groupName: string
  userIds: string[]
  users: Map<string, UserData>
  parentChildMap: Map<string, string[]>
  onDelete: () => void
  locked: boolean
  isMobile?: boolean
  onAssignUser?: (userId: string) => void
}

export default function GroupBucket({
  groupId,
  groupName,
  userIds,
  users,
  parentChildMap,
  onDelete,
  locked,
  isMobile,
  onAssignUser,
}: GroupBucketProps) {
  const { ref } = useDroppable({ id: groupId, disabled: locked })

  return (
    <div
      ref={ref}
      className={`p-4 rounded-xl border shadow-sm min-h-[120px] ${
        locked ? 'border-teal-primary/30 bg-teal-primary/5' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {locked && (
            <svg className="h-4 w-4 text-teal-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          <h3 className="text-sm font-semibold text-text-primary">{groupName}</h3>
          <span className="text-xs text-text-muted">({userIds.length})</span>
        </div>

        {!locked && userIds.length === 0 && (
          <button
            onClick={onDelete}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-text-muted hover:text-danger transition-colors rounded-md"
            aria-label={`Slett ${groupName}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {userIds.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">
          {locked ? 'Ingen medlemmer' : 'Dra brukere hit for a tildele dem'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {userIds.map((userId, index) => {
            const user = users.get(userId)
            if (!user) return null

            // Check if this user has a parent-child conflict in this group
            const otherMembers = userIds.filter((id) => id !== userId)
            const { conflict } = checkConflict(otherMembers, userId, parentChildMap)

            return (
              <UserCard
                key={userId}
                id={userId}
                index={index}
                column={groupId}
                userName={user.full_name}
                userRole={user.role}
                attending={user.attending}
                hasConflict={conflict}
                locked={locked}
                isMobile={isMobile}
                onAssign={onAssignUser ? () => onAssignUser(userId) : undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
