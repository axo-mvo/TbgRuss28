'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMeeting } from '@/lib/actions/meeting'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Button from '@/components/ui/Button'

interface NewMeetingFormProps {
  defaultTitle: string
}

export default function NewMeetingForm({ defaultTitle }: NewMeetingFormProps) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createMeeting, null)

  useEffect(() => {
    if (state?.id) {
      router.push(`/admin/meetings/${state.id}`)
    }
  }, [state?.id, router])

  return (
    <div className="min-h-dvh p-4">
      <div className="max-w-lg mx-auto pt-8">
        <Link
          href="/admin/meetings"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-teal-primary transition-colors mb-4"
        >
          {`\u2190 Tilbake til m\u00f8ter`}
        </Link>

        <h1 className="text-2xl font-bold text-text-primary mb-6">
          {`Nytt m\u00f8te`}
        </h1>

        {state?.error ? (
          <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 mb-6">
            <p className="text-sm text-danger font-medium">{state.error}</p>
          </div>
        ) : null}

        <form action={action} className="flex flex-col gap-5">
          <Input
            label="Tittel"
            id="title"
            name="title"
            type="text"
            required
            defaultValue={defaultTitle}
            placeholder="F.eks. Fellesmøte #3"
          />

          <div>
            <Label htmlFor="date">Dato</Label>
            <input
              type="date"
              id="date"
              name="date"
              required
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300
                focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20
                bg-white outline-none transition-colors"
            />
          </div>

          <div>
            <Label htmlFor="time">Tidspunkt</Label>
            <input
              type="time"
              id="time"
              name="time"
              required
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300
                focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20
                bg-white outline-none transition-colors"
            />
          </div>

          <Input
            label="Sted"
            id="venue"
            name="venue"
            type="text"
            required
            placeholder="F.eks. Samfunnshuset"
          />

          <Button type="submit" disabled={pending}>
            {pending ? 'Oppretter...' : `Opprett m\u00f8te`}
          </Button>
        </form>
      </div>
    </div>
  )
}
