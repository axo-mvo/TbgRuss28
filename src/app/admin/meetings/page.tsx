import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MeetingCard from '@/components/admin/MeetingCard'
import EmptyState from '@/components/ui/EmptyState'

export default async function MeetingsPage() {
  const supabase = await createClient()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false })

  const allMeetings = meetings ?? []
  const upcomingMeeting = allMeetings.find((m) => m.status === 'upcoming') ?? null
  const previousMeetings = allMeetings.filter((m) => m.status !== 'upcoming')

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          &larr; Tilbake til admin
        </Link>

        <h1 className="text-2xl font-bold text-text-primary mb-6">
          {`M\u00f8ter`}
        </h1>

        {/* Upcoming meeting or create button */}
        <section className="mb-8">
          {upcomingMeeting ? (
            <MeetingCard meeting={upcomingMeeting} variant="upcoming" />
          ) : (
            <Link
              href="/admin/meetings/new"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3
                rounded-lg font-medium transition-colors bg-teal-primary text-white
                hover:bg-teal-secondary w-full"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {`Nytt m\u00f8te`}
            </Link>
          )}
        </section>

        {/* Previous meetings */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            {`Tidligere m\u00f8ter`}
          </h2>
          {previousMeetings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {previousMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  variant="previous"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={`Ingen tidligere m\u00f8ter enn\u00e5`}
            />
          )}
        </section>
      </div>
    </div>
  )
}
