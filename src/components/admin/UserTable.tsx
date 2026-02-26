'use client'

import { useState, useRef, useEffect } from 'react'
import SearchInput from '@/components/ui/SearchInput'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import Avatar from '@/components/ui/Avatar'
import { updateUserRole, deleteUser, sendTempAccessCode, toggleAdminAccess, updateUserInfo } from '@/lib/actions/admin'
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
  avatar_url: string | null
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

// Thin colored accent for role
function roleAccentColor(role: string): string {
  switch (role) {
    case 'youth': return 'bg-teal-primary'
    case 'parent': return 'bg-coral'
    default: return 'bg-warning'
  }
}

// Action menu dropdown
function ActionMenu({
  user,
  loading,
  onEditInfo,
  onRoleEdit,
  onToggleAdmin,
  onSmsCode,
  onDelete,
}: {
  user: UserWithLinks
  loading: boolean
  onEditInfo: (e: React.MouseEvent) => void
  onRoleEdit: (e: React.MouseEvent) => void
  onToggleAdmin: (e: React.MouseEvent) => void
  onSmsCode: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg
          text-text-muted hover:bg-gray-100 transition-colors"
        aria-label="Handlinger"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 overflow-hidden">
          <button
            onClick={(e) => { onEditInfo(e); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Rediger info
          </button>
          <button
            onClick={(e) => { onRoleEdit(e); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Endre rolle
          </button>
          <button
            onClick={(e) => { onToggleAdmin(e); setOpen(false) }}
            disabled={loading}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {user.is_admin ? 'Fjern admin' : 'Gi admin'}
          </button>
          {user.phone && (
            <button
              onClick={(e) => { onSmsCode(e); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              SMS-kode
            </button>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={(e) => { onDelete(e); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Slett bruker
          </button>
        </div>
      )}
    </div>
  )
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
  const [editInfoUser, setEditInfoUser] = useState<{
    id: string
    name: string
    email: string
    phone: string
  } | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref for role change dialog (custom dialog with role selection)
  const roleDialogRef = useRef<HTMLDialogElement>(null)
  // Ref for SMS result dialog (custom dialog with sms: URI link)
  const smsResultDialogRef = useRef<HTMLDialogElement>(null)
  // Ref for edit info dialog
  const editInfoDialogRef = useRef<HTMLDialogElement>(null)

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

  // Manage edit info dialog open/close
  useEffect(() => {
    if (editInfoUser) {
      setEditName(editInfoUser.name)
      setEditEmail(editInfoUser.email)
      setEditPhone(editInfoUser.phone)
      setError(null)
      editInfoDialogRef.current?.showModal()
    } else {
      editInfoDialogRef.current?.close()
    }
  }, [editInfoUser])

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

  // Handle save user info
  async function handleSaveUserInfo() {
    if (!editInfoUser) return
    setLoading(true)
    setError(null)
    const result = await updateUserInfo(editInfoUser.id, {
      full_name: editName,
      email: editEmail,
      phone: editPhone,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setEditInfoUser(null)
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

  // Open edit info dialog
  function openEditInfo(e: React.MouseEvent, user: UserWithLinks) {
    e.stopPropagation()
    setEditInfoUser({
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone || '',
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

  // Empty states
  if (users.length === 0) {
    return (
      <div>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="S\u00f8k etter bruker..."
        />
        <EmptyState
          title="Ingen brukere registrert"
          description="Brukere vil dukke opp her etter at de har registrert seg"
        />
      </div>
    )
  }

  // Render a single user row (shared between mobile and desktop)
  function UserRow({ user }: { user: UserWithLinks }) {
    const linkedYouth = getLinkedYouth(user)
    const unlinked = isUnlinkedParent(user)
    const isParent = isParentLike(user.role)

    return (
      <div
        className={`group relative flex items-start gap-3 p-3.5 rounded-xl bg-white border border-gray-100
          hover:border-gray-200 hover:shadow-sm transition-all ${
          isParent ? 'cursor-pointer active:bg-gray-50/50' : ''
        }`}
        onClick={isParent ? () => openParentLink(user) : undefined}
      >
        {/* Role accent strip */}
        <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${roleAccentColor(user.role)}`} />

        {/* Avatar */}
        <div className="shrink-0 ml-1.5">
          <Avatar name={user.full_name} avatarUrl={user.avatar_url} size="md" role={user.role} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary text-[15px] leading-tight">
              {user.full_name}
            </span>
            <Badge variant={user.role}>{roleLabels[user.role]}</Badge>
            {user.is_admin && <Badge variant="admin">Admin</Badge>}
          </div>

          {/* Details row */}
          <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-text-muted">
            <span className="truncate max-w-[200px] md:max-w-none">{user.email}</span>
            {user.phone && (
              <>
                <span className="hidden md:inline text-gray-300">|</span>
                <span className="hidden md:inline">{user.phone}</span>
              </>
            )}
          </div>

          {/* Linked youth */}
          {linkedYouth.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <svg className="h-3.5 w-3.5 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {linkedYouth.map((youth) => (
                <span
                  key={youth.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-primary/8 text-teal-primary"
                >
                  {youth.full_name}
                </span>
              ))}
            </div>
          )}

          {/* Unlinked parent warning */}
          {unlinked && (
            <div className="mt-2 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-coral shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs font-medium text-coral">Ikke koblet til barn</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0">
          <ActionMenu
            user={user}
            loading={loading}
            onEditInfo={(e) => openEditInfo(e, user)}
            onRoleEdit={(e) => openRoleEdit(e, user)}
            onToggleAdmin={(e) => handleToggleAdmin(e, user.id, user.is_admin)}
            onSmsCode={(e) => {
              e.stopPropagation()
              setSmsTarget({ id: user.id, name: user.full_name, phone: user.phone })
            }}
            onDelete={(e) => openDelete(e, user)}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Search + count */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="S\u00f8k etter bruker..."
          />
        </div>
        <span className="shrink-0 text-sm text-text-muted tabular-nums">
          {filteredUsers.length} av {users.length}
        </span>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Ingen brukere funnet"
          description="Pr\u00f8v et annet s\u00f8keord"
        />
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}

      {/* Edit info dialog */}
      <dialog
        ref={editInfoDialogRef}
        onClose={() => setEditInfoUser(null)}
        className="rounded-xl p-0 backdrop:bg-black/50 max-w-sm w-[calc(100%-2rem)]"
      >
        <div className="p-5">
          <h2 className="text-lg font-bold text-text-primary mb-4">
            Rediger info for {editInfoUser?.name}
          </h2>

          <div className="space-y-3 mb-4">
            <Input
              label="Navn"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Input
              label="E-post"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <Input
              label="Telefon"
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-danger mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setEditInfoUser(null)}
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveUserInfo}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Lagrer...' : 'Lagre'}
            </Button>
          </div>
        </div>
      </dialog>

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
            N\u00e5v\u00e6rende rolle: {editRoleUser ? roleLabels[editRoleUser.currentRole] : ''}
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
        description={`Er du sikker p\u00e5 at du vil slette ${deleteUserTarget?.name}? Dette vil fjerne brukeren fra alle grupper.`}
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
                  href={`sms:${normalizePhone(smsResult.phone)}?&body=${encodeURIComponent(`Din midlertidige tilgangskode for Buss 2028 Fellsm\u00f8te er: ${smsResult.code}. Koden er gyldig i 24 timer.`)}`}
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
