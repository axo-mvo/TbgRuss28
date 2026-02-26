import { createClient } from '@/lib/supabase/server'
import { getNextMeetingTitle } from '@/lib/actions/meeting'
import NewMeetingForm from './NewMeetingForm'

export default async function NewMeetingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const adminRole = profile?.role ?? 'youth'
  const defaultTitle = await getNextMeetingTitle()
  return <NewMeetingForm defaultTitle={defaultTitle} adminRole={adminRole} />
}
