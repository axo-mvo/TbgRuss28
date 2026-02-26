'use client'

import { useState, useRef, useEffect } from 'react'
import SearchInput from '@/components/ui/SearchInput'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import { updateUserRole, deleteUser, sendTempAccessCode, toggleAdminAccess } from '@/lib/actions/admin'
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
  phone: string | null
  role: 'youth' | 'parent' | 'admin'
  is_admin: boolean
  attending: boolean | null
  created_at: string
  parent_youth_links: ParentYouthLink[]
}

type RoleOption = 'youth' | 'parent'

const roleLabels: Record<string, string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
  admin: 'Admin',
}

interface UserTableProps {
  users: UserWithLinks[]
  allYouth: { id: string; full_name: string }[]
}

// Parent users can link to youth
function isParentLike(role: string): boolean {
  return role === 'parent'
}

// Normalize Norwegian phone numbers: prepend +47 if 8 digits without prefix
function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (/^\d{8}$/.test(trimmed)) return `+47${trimmed}`
  if (!trimmed.startsWith('+')) return `+${trimmed}`
  return trimmed
}

export default function UserTable({ users, allYouth }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editRoleUser, setEditRoleUser] = useState<{
    id: string
    name: string
    currentRole: string
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
  const [smsTarget, setSmsTarget] = useState<{
    id: string
    name: string
    phone: string | null
  } | null>(null)
  const [smsResult, setSmsResult] = useState<{
    code?: string
    error?: string
    phone?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref for role change dialog (custom dialog with role selection)
  const roleDialogRef = useRef<HTMLDialogElement>(null)
  // Ref for SMS result dialog (custom dialog with sms: URI link)
  const smsResultDialogRef = useRef<HTMLDialogElement>(null)

  // Manage role dialog open/close
  useEffect(() => {
    if (editRoleUser) {
      setSelectedRole((editRoleUser.currentRole === 'parent' ? 'parent' : 'youth') as RoleOption)
      setError(null)
      roleDialogRef.current?.showModal()
    } else {
      roleDialogRef.current?.close()
    }
  }, [editRoleUser])

  // Manage SMS result dialog open/close
  useEffect(() => {
    if (smsResult) {
      smsResultDialogRef.current?.showModal()
    } else {
      smsResultDialogRef.current?.close()
    }
  }, [smsResult])

  // Filter users by name
  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get linked youth names for a user
  // Supabase may return youth as object or array depending on FK inference
  function getLinkedYouth(user: UserWithLinks): YouthProfile[] {
    if (!isParentLike(user.role) || !user.parent_youth_links) return []
    return user.parent_youth_links
      .map((link) => (Array.isArray(link.youth) ? link.youth[0] : link.youth))
      .filter(Boolean)
  }

  // Check if a parent is unlinked (has no youth connections)
  function isUnlinkedParent(user: UserWithLinks): boolean {
    return isParentLike(user.role) && getLinkedYouth(user).length === 0
  }

  // Render attendance badge
  function AttendanceBadge({ attending }: { attending: boolean | null }) {
    if (attending === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Kommer
        </span>
      )
    }
    if (attending === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-coral/10 text-coral">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Kommer ikke
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-text-muted">
        Ikke svart
      </span>
    )
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

  // Handle admin toggle
  async function handleToggleAdmin(e: React.MouseEvent, userId: string, currentIsAdmin: boolean) {
    e.stopPropagation()
    setLoading(true)
    setError(null)
    const result = await toggleAdminAccess(userId, !currentIsAdmin)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    }
  }

  // Handle send SMS code
  async function handleSendSmsCode() {
    if (!smsTarget) return
    setLoading(true)
    const result = await sendTempAccessCode(smsTarget.id)
    setLoading(false)
    setSmsResult({
      code: result.code,
      error: result.error,
      phone: result.phone || smsTarget.phone || undefined,
    })
    setSmsTarget(null)
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
    if (!isParentLike(user.role)) return
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
              const isParent = isParentLike(user.role)

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-xl border border-gray-200 bg-white shadow-sm ${
                    isParent ? 'cursor-pointer active:bg-gray-50' : ''
                  }`}
                  onClick={isParent ? () => openParentLink(user) : undefined}
                >
                  {/* Top row: name + role badge + admin badge */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-text-primary">
                      {user.full_name}
                    </span>
                    <div className="flex gap-1">
                      <Badge variant={user.role}>{roleLabels[user.role]}</Badge>
                      {user.is_admin && <Badge variant="admin">Admin</Badge>}
                    </div>
                  </div>

                  {/* Email */}
                  <p className="text-sm text-text-muted mb-1">{user.email}</p>

                  {/* Phone */}
                  {user.phone && (
                    <p className="text-sm text-text-muted mb-1">Tlf: {user.phone}</p>
                  )}

                  {/* Attendance */}
                  <div className="mb-1">
                    <AttendanceBadge attending={user.attending} />
                  </div>

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
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={(e) => openRoleEdit(e, user)}
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                        text-teal-primary border border-teal-primary hover:bg-teal-primary/5 transition-colors"
                    >
                      Endre rolle
                    </button>
                    <button
                      onClick={(e) => handleToggleAdmin(e, user.id, user.is_admin)}
                      disabled={loading}
                      className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        user.is_admin
                          ? 'text-danger border-danger hover:bg-danger/5'
                          : 'text-teal-primary border-teal-primary hover:bg-teal-primary/5'
                      }`}
                    >
                      {user.is_admin ? 'Fjern admin' : 'Gi admin'}
                    </button>
                    {user.phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSmsTarget({ id: user.id, name: user.full_name, phone: user.phone })
                        }}
                        className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                          text-teal-primary border border-teal-primary hover:bg-teal-primary/5 transition-colors"
                      >
                        SMS-kode
                      </button>
                    )}
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
                  <th className="pb-3 font-medium">Telefon</th>
                  <th className="pb-3 font-medium">Oppm&#248;te</th>
                  <th className="pb-3 font-medium">Rolle</th>
                  <th className="pb-3 font-medium">Registrert</th>
                  <th className="pb-3 font-medium text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const linkedYouth = getLinkedYouth(user)
                  const unlinked = isUnlinkedParent(user)
                  const isParent = isParentLike(user.role)

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
                      <td className="py-4 pr-4 align-top">
                        <div className="flex items-start gap-2 flex-wrap">
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
                      <td className="py-3 pr-4 text-sm text-text-muted">
                        {user.phone || '\u2014'}
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <AttendanceBadge attending={user.attending} />
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <div className="flex gap-1">
                          <Badge variant={user.role}>
                            {roleLabels[user.role]}
                          </Badge>
                          {user.is_admin && <Badge variant="admin">Admin</Badge>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-text-muted">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-4 text-right align-top">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <button
                            onClick={(e) => openRoleEdit(e, user)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                              text-teal-primary border border-teal-primary hover:bg-teal-primary/5 transition-colors"
                          >
                            Endre rolle
                          </button>
                          <button
                            onClick={(e) => handleToggleAdmin(e, user.id, user.is_admin)}
                            disabled={loading}
                            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              user.is_admin
                                ? 'text-danger border-danger hover:bg-danger/5'
                                : 'text-teal-primary border-teal-primary hover:bg-teal-primary/5'
                            }`}
                          >
                            {user.is_admin ? 'Fjern admin' : 'Gi admin'}
                          </button>
                          {user.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSmsTarget({ id: user.id, name: user.full_name, phone: user.phone })
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg text-sm font-medium
                                text-teal-primary border border-teal-primary hover:bg-teal-primary/5 transition-colors"
                            >
                              SMS-kode
                            </button>
                          )}
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
            {(['youth', 'parent'] as RoleOption[]).map((role) => (
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

      {/* SMS code confirmation dialog */}
      <Dialog
        open={!!smsTarget}
        onClose={() => setSmsTarget(null)}
        onConfirm={handleSendSmsCode}
        title={`Opprett tilgangskode for ${smsTarget?.name}?`}
        description={`En 6-sifret kode opprettes for ${smsTarget?.name}. Du kan deretter sende den via SMS.`}
        confirmLabel="Opprett kode"
        loading={loading}
      />

      {/* SMS result dialog (custom with sms: URI link) */}
      <dialog
        ref={smsResultDialogRef}
        onClose={() => setSmsResult(null)}
        className="rounded-xl p-0 backdrop:bg-black/50 max-w-sm w-[calc(100%-2rem)]"
      >
        <div className="p-5">
          {smsResult?.error ? (
            <>
              <h2 className="text-lg font-bold text-text-primary mb-2">Feil</h2>
              <p className="text-text-muted text-sm mb-4">{smsResult.error}</p>
              <Button variant="secondary" onClick={() => setSmsResult(null)} className="w-full">
                Lukk
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text-primary mb-2">Kode opprettet</h2>
              <p className="text-text-muted text-sm mb-4">
                Koden er: <span className="font-mono font-bold text-lg text-text-primary">{smsResult?.code}</span>
              </p>
              <p className="text-text-muted text-sm mb-4">
                Trykk knappen under for &aring; &aring;pne SMS-appen med ferdigutfylt melding.
              </p>
              {smsResult?.phone && (
                <a
                  href={`sms:${normalizePhone(smsResult.phone)}?&body=${encodeURIComponent(`Din midlertidige tilgangskode for Buss 2028 Fellesmøte er: ${smsResult.code}. Koden er gyldig i 24 timer.`)}`}
                  className="block w-full text-center min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium bg-teal-primary hover:bg-teal-dark transition-colors mb-3"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  &Aring;pne SMS
                </a>
              )}
              <Button variant="secondary" onClick={() => setSmsResult(null)} className="w-full">
                Lukk
              </Button>
            </>
          )}
        </div>
      </dialog>

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
