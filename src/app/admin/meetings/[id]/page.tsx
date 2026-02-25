import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Badge from '@/components/ui/Badge'

const statusLabels: Record<string, string> = {
  upcoming: 'Kommende',
  active: 'Aktivt',
  completed: 'Fullf\u00f8rt',
}

function formatDate(date: string | null): string {
  if (!date) return 'Ikke satt'
  return new Date(date).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !meeting) {
    notFound()
  }

  const badgeVariant = (meeting.status === 'upcoming' || meeting.status === 'active' || meeting.status === 'completed')
    ? meeting.status as 'upcoming' | 'active' | 'completed'
    : 'upcoming'

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link
          href="/admin/meetings"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          {`\u2190 Tilbake til m\u00f8ter`}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            {meeting.title}
          </h1>
          <Badge variant={badgeVariant}>
            {statusLabels[meeting.status] ?? meeting.status}
          </Badge>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>{formatDate(meeting.date)}</span>
              {meeting.time ? (
                <span className="ml-1">kl. {formatTime(meeting.time)}</span>
              ) : null}
            </div>
            {meeting.venue ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{meeting.venue}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-text-muted">
            Stasjoner, grupper og resultat kommer i neste steg
          </p>
        </div>
      </div>
    </div>
  )
}
