'use client'

import { useState } from 'react'

interface ParentInviteBannerProps {
  inviteCode: string
}

export default function ParentInviteBanner({ inviteCode }: ParentInviteBannerProps) {
  const [copied, setCopied] = useState(false)

  const message = `Registrer deg som deltager på fellesmøtet på onsdag på www.russ28.no bruk koden ${inviteCode}`
  const smsHref = `sms:?body=${encodeURIComponent(message)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: some browsers block clipboard in non-secure contexts
    }
  }

  return (
    <div className="mb-6 p-5 rounded-xl border-2 border-amber-400/40 bg-amber-50">
      <p className="text-sm font-semibold text-amber-800 mb-2">
        Send til dine foreldre:
      </p>
      <p className="text-sm text-amber-900/80 mb-4 leading-relaxed">
        {message}
      </p>
      <div className="flex flex-col gap-3">
        <a
          href={smsHref}
          className="flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors"
        >
          Send som SMS
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg border-2 border-amber-400 text-amber-800 font-medium text-sm hover:bg-amber-100 transition-colors"
        >
          {copied ? 'Kopiert!' : 'Kopier melding'}
        </button>
      </div>
    </div>
  )
}
