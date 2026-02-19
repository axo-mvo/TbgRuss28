import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loadMessages } from '@/lib/actions/station'
import ChatRoom from '@/components/station/ChatRoom'
import type { ChatMessage } from '@/lib/hooks/useRealtimeChat'

interface StationPageProps {
  params: Promise<{ sessionId: string }>
}

export default async function StationPage({ params }: StationPageProps) {
  const { sessionId } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Fetch station session with station details
  const { data: session } = await supabase
    .from('station_sessions')
    .select('id, status, end_timestamp, group_id, station:stations(id, number, title, description, questions, tip)')
    .eq('id', sessionId)
    .single()

  if (!session) {
    redirect('/dashboard')
  }

  // Verify user is in this session's group
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', session.group_id)
    .maybeSingle()

  if (!membership) {
    redirect('/dashboard')
  }

  // Type-safe station access (Supabase returns object for singular join)
  const station = session.station as unknown as {
    id: string
    number: number
    title: string
    description: string | null
    questions: string[] | null
    tip: string | null
  }

  if (!station) {
    redirect('/dashboard')
  }

  // Load initial messages
  const { messages: initialMessages } = await loadMessages(sessionId)

  // Map to ChatMessage format with status field
  const formattedMessages: ChatMessage[] = (initialMessages ?? []).map((m) => ({
    ...m,
    status: 'sent' as const,
  }))

  return (
    <ChatRoom
      sessionId={session.id}
      userId={user.id}
      userFullName={profile?.full_name ?? 'Bruker'}
      userRole={(profile?.role === 'parent' ? 'parent' : 'youth') as 'youth' | 'parent'}
      endTimestamp={session.end_timestamp}
      stationTitle={station.title}
      stationNumber={station.number}
      stationQuestions={station.questions}
      stationTip={station.tip}
      initialMessages={formattedMessages}
    />
  )
}
