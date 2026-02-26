'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'
import OAuthRegisterForm from '@/components/auth/OAuthRegisterForm'
import { Suspense } from 'react'

function RegisterContent() {
  const searchParams = useSearchParams()
  const isOAuth = searchParams.get('oauth') === '1'

  return (
    <>
      <div className="w-full max-w-[400px] mb-6 text-center">
        <h1 className="text-2xl font-bold text-teal-primary mb-1">
          Buss 2028 Fellesmøte
        </h1>
        <h2 className="text-lg text-text-muted">
          {isOAuth ? 'Fullfør registrering' : 'Registrer deg'}
        </h2>
      </div>
      {isOAuth ? <OAuthRegisterForm /> : <RegisterForm />}
      {!isOAuth && (
        <div className="mt-6 w-full max-w-[400px] text-center p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-sm text-text-muted mb-2">Allerede registrert?</p>
          <Link
            href="/login"
            className="block w-full py-3 rounded-lg border-2 border-teal-primary text-teal-primary font-semibold text-center hover:bg-teal-primary/5 transition-colors"
          >
            Logg inn
          </Link>
        </div>
      )}
    </>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      <Suspense>
        <RegisterContent />
      </Suspense>
    </div>
  )
}
