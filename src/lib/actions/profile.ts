'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOwnProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const avatarUrl = formData.get('avatarUrl') as string | null

  if (!fullName || !email || !phone) {
    return { error: 'Alle felt m\u00e5 fylles ut' }
  }

  if (!/^\d{8}$/.test(phone)) {
    return { error: 'Telefonnummer m\u00e5 v\u00e6re 8 siffer' }
  }

  const updateData: Record<string, string> = { full_name: fullName, email, phone }
  if (avatarUrl !== null && avatarUrl !== '') {
    updateData.avatar_url = avatarUrl
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) return { error: 'Kunne ikke oppdatere profil' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profil')
  return {}
}
