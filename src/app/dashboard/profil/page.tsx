import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/profile/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, role, avatar_url, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake til dashbord
        </Link>

        <h1 className="text-2xl font-bold text-text-primary mb-6">Min profil</h1>

        <ProfileForm
          profile={{
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone || '',
            role: profile.role,
            avatar_url: profile.avatar_url,
            is_admin: profile.is_admin,
          }}
          userId={user.id}
        />
      </div>
    </div>
  )
}
