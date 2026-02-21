'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ---------- validateInviteCode ----------
// Read-only check: does NOT increment the invite code usage counter.
// The actual increment happens atomically during register().
// Also handles TBG#### virtual codes (maps to parent role).

export async function validateInviteCode(code: string): Promise<{
  valid: boolean
  role?: 'youth' | 'parent'
  matchedYouth?: { id: string; full_name: string }
  error?: string
}> {
  try {
    const trimmed = code.trim().toUpperCase()

    // Handle TBG#### virtual codes — these map to parent role
    if (trimmed.startsWith('TBG')) {
      const admin = createAdminClient()
      const { data: youth } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('parent_invite_code', trimmed)
        .single()

      if (!youth) {
        return { valid: false, error: 'Ugyldig foreldrekode. Sjekk koden og prøv igjen.' }
      }

      return { valid: true, role: 'parent', matchedYouth: { id: youth.id, full_name: youth.full_name } }
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('invite_codes')
      .select('role, active, uses, max_uses')
      .eq('code', code)
      .single()

    if (error || !data) {
      return { valid: false, error: 'Ugyldig invitasjonskode' }
    }

    if (!data.active) {
      return { valid: false, error: 'Invitasjonskoden er deaktivert' }
    }

    if (data.uses >= data.max_uses) {
      return { valid: false, error: 'Invitasjonskoden er brukt opp' }
    }

    return { valid: true, role: data.role as 'youth' | 'parent' }
  } catch {
    return { valid: false, error: 'Noe gikk galt. Prøv igjen.' }
  }
}

// ---------- getRegisteredYouth ----------
// Returns all registered youth profiles (for parent child-linking).

export async function getRegisteredYouth(): Promise<{
  youth: Array<{ id: string; full_name: string }>
  error: string | null
}> {
  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'youth')
      .order('full_name', { ascending: true })

    if (error) {
      return { youth: [], error: 'Kunne ikke hente ungdomsliste' }
    }

    return { youth: data ?? [], error: null }
  } catch {
    return { youth: [], error: 'Noe gikk galt. Prøv igjen.' }
  }
}

// ---------- register ----------
// Atomically validates+increments invite code, creates auth user, profile, and parent-youth links.

export async function register(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const inviteCode = formData.get('inviteCode') as string
  let role = formData.get('role') as string
  const youthIdsRaw = formData.get('youthIds') as string | null
  const youthIds: string[] = youthIdsRaw ? JSON.parse(youthIdsRaw) : []

  // Validate required fields
  if (!email || !password || !fullName || !phone || !inviteCode || !role) {
    return { error: 'Alle felt må fylles ut' }
  }

  if (!/^\d{8}$/.test(phone)) {
    return { error: 'Telefonnummer må være 8 siffer' }
  }

  if (password.length < 6) {
    return { error: 'Passordet må være minst 6 tegn' }
  }

  let redirectPath: string | null = null

  try {
    const admin = createAdminClient()
    const supabase = await createClient()

    // Step 0: Detect TBG#### virtual code
    const trimmedCode = inviteCode.trim().toUpperCase()
    let tbgYouthId: string | null = null
    let actualInviteCode = inviteCode

    if (trimmedCode.startsWith('TBG')) {
      // Look up the youth who owns this parent_invite_code
      const { data: youth } = await admin
        .from('profiles')
        .select('id')
        .eq('parent_invite_code', trimmedCode)
        .single()

      if (!youth) {
        return { error: 'Ugyldig foreldrekode. Sjekk koden og prøv igjen.' }
      }

      tbgYouthId = youth.id
      role = 'parent' // TBG#### implicitly defines role as parent
      actualInviteCode = 'FORELDER2028' // Use the standard parent code for atomic validation
    }

    // Step 1: Atomic validate + increment invite code via RPC
    const { data: codeResult, error: codeError } = await admin.rpc(
      'validate_invite_code',
      { p_code: actualInviteCode }
    )

    if (codeError || !codeResult?.valid) {
      return {
        error: codeResult?.error || 'Invitasjonskoden er ugyldig eller brukt opp',
      }
    }

    // Step 2: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    if (authError || !authData.user) {
      return { error: authError?.message || 'Kunne ikke opprette bruker' }
    }

    // Step 3: Create profile row (admin client bypasses RLS)
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role,
      phone,
    })

    if (profileError) {
      // Rollback: delete the auth user
      await admin.auth.admin.deleteUser(authData.user.id)
      return { error: 'Kunne ikke opprette profil' }
    }

    // Step 4: If parent, insert parent-youth links
    // Combine manually selected youthIds with auto-matched TBG youth
    const allYouthIds = [...youthIds]
    if (tbgYouthId && !allYouthIds.includes(tbgYouthId)) {
      allYouthIds.push(tbgYouthId)
    }

    if (role === 'parent' && allYouthIds.length > 0) {
      const links = allYouthIds.map((youthId) => ({
        parent_id: authData.user!.id,
        youth_id: youthId,
      }))

      const { error: linkError } = await admin
        .from('parent_youth_links')
        .insert(links)

      if (linkError) {
        // Non-fatal: log but don't fail registration
        console.error('Kunne ikke koble forelder til barn:', linkError.message)
      }
    }

    // Step 5: Set redirect path
    redirectPath = '/dashboard'
  } catch {
    return { error: 'Noe gikk galt under registrering. Prøv igjen.' }
  }

  // redirect() throws internally -- must be OUTSIDE try/catch
  if (redirectPath) {
    revalidatePath('/', 'layout')
    redirect(redirectPath)
  }

  return {}
}

// ---------- login ----------
// Signs in with email/password, redirects based on role.

export async function login(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Fyll inn e-post og passord' }
  }

  let redirectPath: string | null = null

  try {
    const supabase = await createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return { error: 'Feil e-post eller passord' }
    }

    // Query profile role for routing
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      redirectPath = profile?.role === 'admin' ? '/admin' : '/dashboard'
    } else {
      redirectPath = '/dashboard'
    }
  } catch {
    return { error: 'Noe gikk galt. Prøv igjen.' }
  }

  // redirect() throws internally -- must be OUTSIDE try/catch
  if (redirectPath) {
    revalidatePath('/', 'layout')
    redirect(redirectPath)
  }

  return {}
}

// ---------- updateAttending ----------
// Updates the current user's attending status (any authenticated user).

export async function updateAttending(attending: boolean): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Ikke autentisert' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ attending })
      .eq('id', user.id)

    if (error) {
      return { error: 'Kunne ikke oppdatere oppmøtestatus' }
    }

    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Noe gikk galt. Prøv igjen.' }
  }
}

// ---------- loginWithCode ----------
// Signs in using a temporary 6-digit access code (sent by admin via SMS).

export async function loginWithCode(code: string): Promise<{ error?: string }> {
  const trimmedCode = code.trim()

  // Validate code is 6 digits
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { error: 'Koden m\u00e5 v\u00e6re 6 siffer' }
  }

  let redirectPath: string | null = null

  try {
    const admin = createAdminClient()

    // Look up the code: must be unused and not expired
    const { data: codeRow, error: codeError } = await admin
      .from('temp_access_codes')
      .select('id, user_id')
      .eq('code', trimmedCode)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeError || !codeRow) {
      return { error: 'Ugyldig eller utl\u00f8pt kode' }
    }

    // Get user email from profiles
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', codeRow.user_id)
      .single()

    if (!profile?.email) {
      return { error: 'Kunne ikke finne brukeren' }
    }

    // Mark code as used
    await admin
      .from('temp_access_codes')
      .update({ used: true })
      .eq('id', codeRow.id)

    // Generate magic link and verify OTP to establish session
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      return { error: 'Kunne ikke logge inn. Pr\u00f8v igjen.' }
    }

    // Use the server-side Supabase client to verify the OTP and set the session cookie
    const supabase = await createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    })

    if (verifyError) {
      return { error: 'Kunne ikke logge inn. Pr\u00f8v igjen.' }
    }

    redirectPath = '/dashboard'
  } catch {
    return { error: 'Noe gikk galt. Pr\u00f8v igjen.' }
  }

  // redirect() throws internally -- must be OUTSIDE try/catch
  if (redirectPath) {
    revalidatePath('/', 'layout')
    redirect(redirectPath)
  }

  return {}
}

// ---------- logout ----------
// Signs out and redirects to login page.

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
