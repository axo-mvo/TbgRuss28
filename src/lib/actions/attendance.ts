'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ---------- updateMeetingAttendance ----------
// Upserts the current user's attendance for a specific meeting.

export async function updateMeetingAttendance(
  meetingId: string,
  attending: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Ikke autentisert' }
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('meeting_attendance')
      .upsert(
        {
          meeting_id: meetingId,
          user_id: user.id,
          attending,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'meeting_id,user_id' }
      )

    if (error) {
      return { error: 'Kunne ikke oppdatere oppmøtestatus' }
    }

    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Noe gikk galt. Prøv igjen.' }
  }
}
