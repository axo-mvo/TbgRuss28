'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login, loginWithCode } from '@/lib/actions/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Label from '@/components/ui/Label'

export default function LoginForm() {
  const [mode, setMode] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      setError('Koden m\u00e5 v\u00e6re 6 siffer')
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
              Skriv inn koden du mottok p\u00e5 SMS
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
