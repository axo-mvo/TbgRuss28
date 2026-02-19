'use client'

import { useState, useRef, useEffect } from 'react'
import SearchInput from '@/components/ui/SearchInput'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import { updateUserRole, deleteUser } from '@/lib/actions/admin'
import ParentLinkSheet from '@/components/admin/ParentLinkSheet'

// Types matching the Supabase relational query result
type YouthProfile = {
  id: string
  full_name: string
}

type ParentYouthLink = {
  id: string
  youth: YouthProfile | YouthProfile[]
}

type UserWithLinks = {
  id: string
  full_name: string
  email: string
  role: 'youth' | 'parent' | 'admin'
  created_at: string
  parent_youth_links: ParentYouthLink[]
}

type RoleOption = 'youth' | 'parent' | 'admin'

const roleLabels: Record<RoleOption, string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
  admin: 'Admin',
}

interface UserTableProps {
  users: UserWithLinks[]
  allYouth: { id: string; full_name: string }[]
}

export default function UserTable({ users, allYouth }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editRoleUser, setEditRoleUser] = useState<{
    id: string
    name: string
    currentRole: RoleOption
  } | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleOption>('youth')
  const [deleteUserTarget, setDeleteUserTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [parentLinkUser, setParentLinkUser] = useState<{
    id: string
    name: string
    currentYouthIds: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref for role change dialog (custom dialog with role selection)
  const roleDialogRef = useRef<HTMLDialogElement>(null)

  // Manage role dialog open/close
  useEffect(() => {
    if (editRoleUser) {
      setSelectedRole(editRoleUser.currentRole)
      setError(null)
      roleDialogRef.current?.showModal()
    } else {
      roleDialogRef.current?.close()
    }
  }, [editRoleUser])

  // Filter users by name
  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get linked youth names for a user
  // Supabase may return youth as object or array depending on FK inference
  function getLinkedYouth(user: UserWithLinks): YouthProfile[] {
    if (user.role !== 'parent' || !user.parent_youth_links) return []
    return user.parent_youth_links
      .map((link) => (Array.isArray(link.youth) ? link.youth[0] : link.youth))
      .filter(Boolean)
  }

  // Check if a parent is unlinked (has no youth connections)
  function isUnlinkedParent(user: UserWithLinks): boolean {
    return user.role === 'parent' && getLinkedYouth(user).length === 0
  }

  // Handle role change
  async function handleRoleChange() {
    if (!editRoleUser || selectedRole === editRoleUser.currentRole) return
    setLoading(true)
    setError(null)
    const result = await updateUserRole(editRoleUser.id, selectedRole)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setEditRoleUser(null)
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!deleteUserTarget) return
    setLoading(true)
    const result = await deleteUser(deleteUserTarget.id)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setDeleteUserTarget(null)
    }
  }

  // Open role edit dialog (stop event propagation so parent card tap doesn't fire)
  function openRoleEdit(e: React.MouseEvent, user: UserWithLinks) {
    e.stopPropagation()
    setEditRoleUser({
      id: user.id,
      name: user.full_name,
      currentRole: user.role,
    })
  }

  // Open delete dialog
  function openDelete(e: React.MouseEvent, user: UserWithLinks) {
    e.stopPropagation()
    setDeleteUserTarget({ id: user.id, name: user.full_name })
  }

  // Open parent link sheet
  function openParentLink(user: UserWithLinks) {
    if (user.role !== 'parent') return
    setParentLinkUser({
      id: user.id,
      name: user.full_name,
      currentYouthIds: getLinkedYouth(user).map((y) => y.id),
    })
  }

  // Format date as Norwegian locale
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nb-NO')
  }

  // Empty states
  if (users.length === 0) {
    return (
      <div>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Søk etter bruker..."
        />
        <EmptyState
          title="Ingen brukere registrert"
          description="Brukere vil dukke opp her etter at de har registrert seg"
        />
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Søk etter bruker..."
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Ingen brukere funnet"
          description="Prøv et annet søkeord"
        />
      ) : (
        <>
          {/* Mobile: Card stack */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => {
              const linkedYouth = getLinkedYouth(user)
              const unlinked = isUnlinkedParent(user)
              const isParent = user.role === 'parent'

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-xl border border-gray-200 bg-white shadow-sm ${
                    isParent ? 'cursor-pointer active:bg-gray-50' : ''
                  }`}
                  onClick={isParent ? () => openParentLink(user) : undefined}
                >
                  {/* Top row: name + role badge */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-text-primary">
                      {user.full_name}
                    </span>
                    <Badge variant={user.role}>{roleLabels[user.role]}</Badge>
                  </div>

                  {/* Email */}
                  <p className="text-sm text-text-muted mb-1">{user.email}</p>

                  {/* Registration date */}
                  <p className="text-xs text-text-muted mb-2">
                    Registrert {formatDate(user.created_at)}
                  </p>

                  {/* Linked youth badges */}
                  {linkedYouth.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-xs text-text-muted mr-1">Barn:</span>
                      {linkedYouth.map((youth) => (
                        <span
                          key={youth.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-primary/10 text-teal-primary"
                        >
                          {youth.full_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Unlinked parent warning */}
                  {unlinked && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-coral/10 text-coral">
                        Ikke koblet til barn
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => openRoleEdit(e, user)}
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                        text-teal-primary border border-teal-primary hover:bg-teal-primary/5 transition-colors"
                    >
                      Endre rolle
                    </button>
                    <button
                      onClick={(e) => openDelete(e, user)}
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                        text-danger border border-danger hover:bg-danger/5 transition-colors"
                    >
                      Slett
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-text-muted">
                  <th className="pb-3 font-medium">Navn</th>
                  <th className="pb-3 font-medium">E-post</th>
                  <th className="pb-3 font-medium">Rolle</th>
                  <th className="pb-3 font-medium">Registrert</th>
                  <th className="pb-3 font-medium text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const linkedYouth = getLinkedYouth(user)
                  const unlinked = isUnlinkedParent(user)
                  const isParent = user.role === 'parent'

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-100 ${
                        isParent
                          ? 'cursor-pointer hover:bg-gray-50 transition-colors'
                          : ''
                      }`}
                      onClick={isParent ? () => openParentLink(user) : undefined}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-text-primary">
                            {user.full_name}
                          </span>
                          {linkedYouth.map((youth) => (
                            <span
                              key={youth.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-primary/10 text-teal-primary"
                            >
                              {youth.full_name}
                            </span>
                          ))}
                          {unlinked && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-coral/10 text-coral">
                              Ikke koblet til barn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-text-muted">
                        {user.email}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={user.role}>
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-text-muted">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={(e) => openRoleEdit(e, user)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                              text-teal-primary border border-teal-primary hover:bg-teal-primary/5 transition-colors"
                          >
                            Endre rolle
                          </button>
                          <button
                            onClick={(e) => openDelete(e, user)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                              text-danger border border-danger hover:bg-danger/5 transition-colors"
                          >
                            Slett
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Role change dialog (custom with role selection) */}
      <dialog
        ref={roleDialogRef}
        onClose={() => setEditRoleUser(null)}
        className="rounded-xl p-0 backdrop:bg-black/50 max-w-sm w-[calc(100%-2rem)]"
      >
        <div className="p-5">
          <h2 className="text-lg font-bold text-text-primary mb-2">
            Endre rolle for {editRoleUser?.name}
          </h2>
          <p className="text-text-muted text-sm mb-4">
            Nåværende rolle: {editRoleUser ? roleLabels[editRoleUser.currentRole] : ''}
          </p>

          {/* Role selection */}
          <div className="flex flex-col gap-2 mb-6">
            {(['youth', 'parent', 'admin'] as RoleOption[]).map((role) => (
              <label
                key={role}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRole === role
                    ? 'border-teal-primary bg-teal-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={() => setSelectedRole(role)}
                  className="w-4 h-4 accent-teal-primary"
                />
                <span className="font-medium text-text-primary">
                  {roleLabels[role]}
                </span>
              </label>
            ))}
          </div>

          {error && (
            <p className="text-sm text-danger mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setEditRoleUser(null)}
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={handleRoleChange}
              disabled={loading || selectedRole === editRoleUser?.currentRole}
              className="flex-1"
            >
              {loading ? 'Lagrer...' : 'Bekreft'}
            </Button>
          </div>
        </div>
      </dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteUserTarget}
        onClose={() => {
          setDeleteUserTarget(null)
          setError(null)
        }}
        onConfirm={handleDelete}
        title="Slett bruker"
        description={`Er du sikker på at du vil slette ${deleteUserTarget?.name}? Dette vil fjerne brukeren fra alle grupper.`}
        confirmLabel="Slett"
        confirmVariant="danger"
        loading={loading}
      />

      {/* Parent link sheet */}
      {parentLinkUser && (
        <ParentLinkSheet
          open={!!parentLinkUser}
          onClose={() => setParentLinkUser(null)}
          parentId={parentLinkUser.id}
          parentName={parentLinkUser.name}
          currentYouthIds={parentLinkUser.currentYouthIds}
          allYouth={allYouth}
        />
      )}
    </div>
  )
}
