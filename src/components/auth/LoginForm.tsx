'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Label from '@/components/ui/Label'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  return (
    <Card className="w-full max-w-[400px] mx-auto">
      <div className="space-y-4">
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

        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}

        <Button
          onClick={handleLogin}
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
