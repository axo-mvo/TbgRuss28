'use client'

import { useState, useRef } from 'react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { updateOwnProfile } from '@/lib/actions/profile'
import { createClient } from '@/lib/supabase/client'

const roleLabels: Record<string, string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
  admin: 'Admin',
}

interface ProfileFormProps {
  profile: {
    full_name: string
    email: string
    phone: string
    role: string
    avatar_url: string | null
    is_admin: boolean
  }
  userId: string
}

export default function ProfileForm({ profile, userId }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Filen m\u00e5 v\u00e6re et bilde')
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Bildet kan ikke v\u00e6re st\u00f8rre enn 2MB')
      return
    }

    // Show instant preview
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)

    // Upload to Supabase Storage
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/avatar.${ext}`

      // Remove old avatar if exists (ignore errors)
      await supabase.storage.from('avatars').remove([path])

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setError('Kunne ikke laste opp bilde')
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Append cache-busting timestamp
      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`)
    } catch {
      setError('Noe gikk galt under opplasting')
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.set('fullName', fullName)
    formData.set('email', email)
    formData.set('phone', phone)
    if (avatarUrl) {
      formData.set('avatarUrl', avatarUrl)
    }

    const result = await updateOwnProfile(formData)
    setSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const displayAvatarUrl = previewUrl || avatarUrl || null
  const badgeVariant = (profile.role === 'youth' || profile.role === 'parent' || profile.role === 'admin')
    ? profile.role as 'youth' | 'parent' | 'admin'
    : 'youth'

  return (
    <div className="space-y-5">
      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3">
        <Avatar
          name={fullName || profile.full_name}
          avatarUrl={displayAvatarUrl}
          size="lg"
          role={profile.role as 'youth' | 'parent'}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-medium text-teal-primary hover:text-teal-secondary transition-colors disabled:opacity-50"
        >
          {uploading ? 'Laster opp...' : 'Last opp bilde'}
        </button>
      </div>

      {/* Role badges (read-only) */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant={badgeVariant}>{roleLabels[profile.role] || profile.role}</Badge>
        {profile.is_admin && <Badge variant="admin">Admin</Badge>}
      </div>

      {/* Form fields */}
      <Input
        label="Navn"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input
        label="E-post"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Telefon"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />

      {/* Error / success messages */}
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success font-medium">Profil oppdatert!</p>
      )}

      {/* Save button */}
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Lagrer...' : 'Lagre endringer'}
      </Button>
    </div>
  )
}
