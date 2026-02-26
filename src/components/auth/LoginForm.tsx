'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login, loginWithCode } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Label from '@/components/ui/Label'

export default function LoginForm() {
  const [showEmail, setShowEmail] = useState(false)
  const [mode, setMode] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleOAuthLogin(provider: 'apple' | 'google') {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(`Kunne ikke fortsette med ${provider === 'apple' ? 'Apple' : 'Google'}`)
      setLoading(false)
    }
  }

  async function handleLogin() {
    setError('')

    if (!email.trim()) {
      setError('Fyll inn e-postadresse')
      return
    }
    if (!password) {
      setError('Fyll inn passord')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.set('email', email.trim())
    formData.set('password', password)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, redirect happens server-side
  }

  async function handleCodeLogin() {
    setError('')

    if (!code.trim()) {
      setError('Skriv inn tilgangskoden')
      return
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError('Koden må være 6 siffer')
      return
    }

    setLoading(true)

    const result = await loginWithCode(code.trim())

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, redirect happens server-side
  }

  return (
    <Card className="w-full max-w-[400px] mx-auto">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => handleOAuthLogin('apple')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            bg-black text-white text-base font-medium
            hover:bg-gray-900 active:bg-gray-800
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Fortsett med Apple
        </button>

        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            bg-white text-gray-700 text-base font-medium border border-gray-300
            hover:bg-gray-50 active:bg-gray-100
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Fortsett med Google
        </button>

        {!showEmail ? (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors py-1"
          >
            Bruk e-post eller tilgangskode i stedet
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-text-muted">eller</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Mode toggle */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setMode('email')
                  setError('')
                }}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  mode === 'email'
                    ? 'text-teal-primary border-b-2 border-teal-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                E-post
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('code')
                  setError('')
                }}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  mode === 'code'
                    ? 'text-teal-primary border-b-2 border-teal-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Tilgangskode
              </button>
            </div>

            {mode === 'email' ? (
              <>
                <div>
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="din@epost.no"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Passord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ditt passord"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="access-code">Tilgangskode</Label>
                <input
                  id="access-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    // Only allow digits
                    const val = e.target.value.replace(/\D/g, '')
                    setCode(val)
                  }}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3
                    rounded-xl border border-gray-200 bg-white text-text-primary text-base
                    focus:outline-none focus:ring-2 focus:ring-teal-primary/40 focus:border-teal-primary
                    placeholder:text-text-muted/40 placeholder:tracking-[0.5em]"
                />
                <p className="text-xs text-text-muted mt-2">
                  Skriv inn koden du mottok på SMS
                </p>
              </div>
            )}

            {error && (
              <p className="text-danger text-sm">{error}</p>
            )}

            <Button
              onClick={mode === 'email' ? handleLogin : handleCodeLogin}
              disabled={loading}
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </Button>
          </>
        )}

        {!showEmail && error && (
          <p className="text-danger text-sm">{error}</p>
        )}

        <p className="text-center text-sm text-text-muted">
          Har du ikke konto?{' '}
          <Link
            href="/register"
            className="text-teal-primary font-medium hover:underline"
          >
            Registrer deg
          </Link>
        </p>
      </div>
    </Card>
  )
}
