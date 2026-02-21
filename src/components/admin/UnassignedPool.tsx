'use client'

import { useDroppable } from '@dnd-kit/react'
import UserCard from '@/components/admin/UserCard'

interface UserData {
  id: string
  full_name: string
  role: string
  attending?: boolean | null
}

interface UnassignedPoolProps {
  id: string
  userIds: string[]
  users: Map<string, UserData>
  locked: boolean
  isMobile?: boolean
  onAssignUser?: (userId: string) => void
}

export default function UnassignedPool({
  id,
  userIds,
  users,
  locked,
  isMobile,
  onAssignUser,
}: UnassignedPoolProps) {
  const { ref } = useDroppable({ id, disabled: locked })

  return (
    <div
      ref={ref}
      className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 min-h-[120px]"
    >
      <h3 className="text-sm font-semibold text-text-muted mb-3">
        Ikke tildelt ({userIds.length})
      </h3>

      {userIds.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">
          Alle brukere er tildelt en gruppe
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {userIds.map((userId, index) => {
            const user = users.get(userId)
            if (!user) return null

            // No conflict in unassigned pool (no group to conflict with)
            const hasConflict = false

            return (
              <UserCard
                key={userId}
                id={userId}
                index={index}
                column={id}
                userName={user.full_name}
                userRole={user.role}
                attending={user.attending}
                hasConflict={hasConflict}
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
