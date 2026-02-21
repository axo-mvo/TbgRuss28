'use client'

import { useState, useMemo, useCallback } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import BottomSheet from '@/components/ui/BottomSheet'
import Badge from '@/components/ui/Badge'
import UnassignedPool from '@/components/admin/UnassignedPool'
import GroupBucket from '@/components/admin/GroupBucket'
import { buildParentChildMap, checkConflict } from '@/lib/utils/parent-child'
import {
  createGroup,
  deleteGroup,
  saveGroupMembers,
  toggleGroupsLock,
} from '@/lib/actions/admin'

interface UserData {
  id: string
  full_name: string
  role: string
  attending?: boolean | null
}

interface GroupBuilderProps {
  initialGroups: Record<string, string[]>
  users: UserData[]
  parentChildLinks: { parent_id: string; youth_id: string }[]
  groupNames: Record<string, string>
  initialLocked: boolean
}

export default function GroupBuilder({
  initialGroups,
  users,
  parentChildLinks,
  groupNames: initialGroupNames,
  initialLocked,
}: GroupBuilderProps) {
  const [groups, setGroups] = useState<Record<string, string[]>>(initialGroups)
  const [groupNames, setGroupNames] = useState<Record<string, string>>(initialGroupNames)
  const [locked, setLocked] = useState(initialLocked)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState<string | null>(null)
  const [mobileAssignUser, setMobileAssignUser] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [locking, setLocking] = useState(false)

  const parentChildMap = useMemo(
    () => buildParentChildMap(parentChildLinks),
    [parentChildLinks]
  )

  const usersMap = useMemo(() => {
    const map = new Map<string, UserData>()
    for (const user of users) {
      map.set(user.id, user)
    }
    return map
  }, [users])

  // Get the group keys excluding 'unassigned'
  const groupIds = useMemo(
    () => Object.keys(groups).filter((k) => k !== 'unassigned'),
    [groups]
  )

  // Find which group a user is currently in (for mobile assign flow)
  const findUserGroup = useCallback(
    (userId: string): string | null => {
      for (const [groupId, memberIds] of Object.entries(groups)) {
        if (memberIds.includes(userId)) return groupId
      }
      return null
    },
    [groups]
  )

  // ----- Handlers -----

  async function handleCreateGroup() {
    setCreating(true)
    setError(null)
    const result = await createGroup()
    if (result.error) {
      setError(result.error)
    } else if (result.group) {
      setGroups((prev) => ({ ...prev, [result.group!.id]: [] }))
      setGroupNames((prev) => ({ ...prev, [result.group!.id]: result.group!.name }))
    }
    setCreating(false)
  }

  async function handleDeleteGroup(groupId: string) {
    setError(null)
    const result = await deleteGroup(groupId)
    if (result.error) {
      setError(result.error)
    } else {
      setGroups((prev) => {
        const next = { ...prev }
        delete next[groupId]
        return next
      })
      setGroupNames((prev) => {
        const next = { ...prev }
        delete next[groupId]
        return next
      })
    }
    setShowDeleteGroupDialog(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const assignments = groupIds.map((groupId) => ({
      groupId,
      userIds: groups[groupId] || [],
    }))

    const result = await saveGroupMembers(assignments)
    if (result.error) {
      setError(result.error)
    }
    setSaving(false)
  }

  async function handleToggleLock() {
    setLocking(true)
    setError(null)
    const newLocked = !locked
    const result = await toggleGroupsLock(newLocked)
    if (result.error) {
      setError(result.error)
    } else {
      setLocked(newLocked)
    }
    setLocking(false)
    setShowLockDialog(false)
  }

  // Mobile: assign user to a specific group
  function handleMobileAssign(targetGroupId: string) {
    if (!mobileAssignUser) return

    const userId = mobileAssignUser
    const sourceGroup = findUserGroup(userId)
    if (!sourceGroup) return

    // Check for conflict in target group (skip if assigning to unassigned)
    if (targetGroupId !== 'unassigned') {
      const targetMembers = groups[targetGroupId] || []
      const { conflict } = checkConflict(targetMembers, userId, parentChildMap)
      if (conflict) {
        setError('Forelder-barn-konflikt! Kan ikke plassere forelder og barn i samme gruppe.')
        setMobileAssignUser(null)
        return
      }
    }

    setGroups((prev) => {
      const next = { ...prev }
      // Remove from source
      next[sourceGroup] = next[sourceGroup].filter((id) => id !== userId)
      // Add to target
      next[targetGroupId] = [...(next[targetGroupId] || []), userId]
      return next
    })

    setMobileAssignUser(null)
    setError(null)
  }

  // Get the user data for the mobile assign dialog
  const mobileAssignUserData = mobileAssignUser
    ? usersMap.get(mobileAssignUser)
    : null

  // Check which groups would cause conflict for mobile assign
  function getMobileConflictGroups(userId: string): Set<string> {
    const conflictGroups = new Set<string>()
    for (const groupId of groupIds) {
      const members = groups[groupId] || []
      const { conflict } = checkConflict(members, userId, parentChildMap)
      if (conflict) conflictGroups.add(groupId)
    }
    return conflictGroups
  }

  const mobileConflictGroups = mobileAssignUser
    ? getMobileConflictGroups(mobileAssignUser)
    : new Set<string>()

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

      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {!locked && (
          <>
            <Button
              variant="primary"
              onClick={handleCreateGroup}
              disabled={creating}
              className="w-auto"
            >
              {creating ? 'Oppretter...' : 'Opprett gruppe'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={saving}
              className="w-auto"
            >
              {saving ? 'Lagrer...' : 'Lagre endringer'}
            </Button>
          </>
        )}

        <Button
          variant={locked ? 'secondary' : 'primary'}
          onClick={() => setShowLockDialog(true)}
          disabled={locking}
          className="w-auto"
        >
          {locked ? 'Lås opp grupper' : 'Lås grupper'}
        </Button>

        {locked && (
          <Badge variant="admin" className="bg-success/10 text-success">
            Grupper er låst
          </Badge>
        )}
      </div>

      {/* Desktop layout: drag-and-drop */}
      <div className="hidden md:block">
        <DragDropProvider
          onDragOver={(event) => {
            setGroups((items) => move(items, event))
          }}
          onDragEnd={(event) => {
            // After drag ends, check for conflicts in the destination group
            const { source, target } = event.operation
            if (!target || !source) return

            const targetGroupId =
              typeof target.id === 'string' ? target.id : String(target.id)

            // If dropped into unassigned, no conflict possible
            if (targetGroupId === 'unassigned') return

            // Find which group the dropped item ended up in
            // target could be a group or a user within a group
            // We need to find the container
            setGroups((currentGroups) => {
              // Find which group the dragged user is now in
              const draggedId = String(source.id)
              for (const [groupId, members] of Object.entries(currentGroups)) {
                if (groupId === 'unassigned') continue
                if (members.includes(draggedId)) {
                  const otherMembers = members.filter((id) => id !== draggedId)
                  const { conflict } = checkConflict(
                    otherMembers,
                    draggedId,
                    parentChildMap
                  )
                  if (conflict) {
                    // Revert: move back to unassigned
                    setError(
                      'Forelder-barn-konflikt! Brukeren ble flyttet tilbake.'
                    )
                    return {
                      ...currentGroups,
                      [groupId]: otherMembers,
                      unassigned: [...currentGroups.unassigned, draggedId],
                    }
                  }
                  break
                }
              }
              return currentGroups
            })
          }}
        >
          {/* Unassigned pool - full width */}
          <UnassignedPool
            id="unassigned"
            userIds={groups.unassigned || []}
            users={usersMap}
            locked={locked}
          />

          {/* Group grid */}
          {groupIds.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {groupIds.map((groupId) => (
                <GroupBucket
                  key={groupId}
                  groupId={groupId}
                  groupName={groupNames[groupId] || 'Gruppe'}
                  userIds={groups[groupId] || []}
                  users={usersMap}
                  parentChildMap={parentChildMap}
                  onDelete={() => setShowDeleteGroupDialog(groupId)}
                  locked={locked}
                />
              ))}
            </div>
          )}
        </DragDropProvider>
      </div>

      {/* Mobile layout: tap-to-assign */}
      <div className="md:hidden">
        {/* Unassigned pool */}
        <UnassignedPool
          id="unassigned"
          userIds={groups.unassigned || []}
          users={usersMap}
          locked={locked}
          isMobile
          onAssignUser={(userId) => setMobileAssignUser(userId)}
        />

        {/* Group list */}
        {groupIds.length > 0 && (
          <div className="flex flex-col gap-4 mt-4">
            {groupIds.map((groupId) => (
              <GroupBucket
                key={groupId}
                groupId={groupId}
                groupName={groupNames[groupId] || 'Gruppe'}
                userIds={groups[groupId] || []}
                users={usersMap}
                parentChildMap={parentChildMap}
                onDelete={() => setShowDeleteGroupDialog(groupId)}
                locked={locked}
                isMobile
                onAssignUser={(userId) => setMobileAssignUser(userId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lock/unlock confirmation dialog */}
      <Dialog
        open={showLockDialog}
        onClose={() => setShowLockDialog(false)}
        onConfirm={handleToggleLock}
        title={locked ? 'Lås opp grupper?' : 'Lås grupper?'}
        description={
          locked
            ? 'Gruppene vil bli låst opp og deltakerne vil ikke lenger se gruppeinndelingen sin.'
            : 'Er du sikker? Deltakerne vil se gruppeinndelingen sin på dashbordet.'
        }
        confirmLabel={locked ? 'Lås opp' : 'Lås grupper'}
        loading={locking}
      />

      {/* Delete group confirmation dialog */}
      <Dialog
        open={showDeleteGroupDialog !== null}
        onClose={() => setShowDeleteGroupDialog(null)}
        onConfirm={() => {
          if (showDeleteGroupDialog) handleDeleteGroup(showDeleteGroupDialog)
        }}
        title="Slett gruppe?"
        description={`Er du sikker på at du vil slette gruppen "${showDeleteGroupDialog ? groupNames[showDeleteGroupDialog] || '' : ''}"?`}
        confirmLabel="Slett"
        confirmVariant="danger"
      />

      {/* Mobile assign bottom sheet */}
      <BottomSheet
        open={mobileAssignUser !== null}
        onClose={() => setMobileAssignUser(null)}
        title={`Tildel ${mobileAssignUserData?.full_name || ''}`}
      >
        <div className="flex flex-col gap-2">
          {/* Option to move to unassigned */}
          {findUserGroup(mobileAssignUser || '') !== 'unassigned' && (
            <button
              onClick={() => handleMobileAssign('unassigned')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-teal-primary transition-colors min-h-[44px]"
            >
              <span className="text-sm font-medium text-text-muted">
                Fjern fra gruppe (tilbake til ikke tildelt)
              </span>
            </button>
          )}

          {/* Group options */}
          {groupIds.map((groupId) => {
            const isCurrentGroup =
              findUserGroup(mobileAssignUser || '') === groupId
            const hasConflict = mobileConflictGroups.has(groupId)

            return (
              <button
                key={groupId}
                onClick={() => {
                  if (!hasConflict && !isCurrentGroup) {
                    handleMobileAssign(groupId)
                  }
                }}
                disabled={isCurrentGroup || hasConflict}
                className={`w-full text-left p-3 rounded-lg border transition-colors min-h-[44px] ${
                  isCurrentGroup
                    ? 'border-teal-primary bg-teal-primary/5 opacity-60'
                    : hasConflict
                      ? 'border-danger/30 bg-danger/5 opacity-60'
                      : 'border-gray-200 hover:border-teal-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {groupNames[groupId] || 'Gruppe'}
                  </span>
                  <span className="text-xs text-text-muted">
                    {(groups[groupId] || []).length} medlemmer
                  </span>
                </div>
                {hasConflict && (
                  <span className="text-xs text-danger mt-1 block">
                    Forelder-barn-konflikt
                  </span>
                )}
                {isCurrentGroup && (
                  <span className="text-xs text-teal-primary mt-1 block">
                    Allerede i denne gruppen
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}
