interface ContactActionsProps {
  phone: string | null
  email: string
  variant?: 'full' | 'inline' | 'compact'
}

export default function ContactActions({ phone, email, variant = 'full' }: ContactActionsProps) {
  if (variant === 'compact') {
    return phone ? (
      <a
        href={`tel:+47${phone}`}
        aria-label={`Ring ${phone}`}
        className="inline-flex items-center gap-1.5 min-h-[44px] py-2 text-sm text-text-muted hover:text-teal-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {phone}
      </a>
    ) : null
  }

  if (variant === 'inline') {
    return phone ? (
      <a
        href={`tel:+47${phone}`}
        aria-label={`Ring ${phone}`}
        className="inline-flex items-center gap-1 ml-2 text-xs text-teal-primary hover:text-teal-secondary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {phone}
      </a>
    ) : null
  }

  return (
    <div className="flex gap-2 mt-1">
      {phone && (
        <a
          href={`tel:+47${phone}`}
          aria-label={`Ring ${phone}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-sm text-teal-primary hover:text-teal-secondary transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          {phone}
        </a>
      )}
      <a
        href={`mailto:${email}`}
        aria-label={`Send e-post til ${email}`}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-sm text-teal-primary hover:text-teal-secondary transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {email}
      </a>
    </div>
  )
}
