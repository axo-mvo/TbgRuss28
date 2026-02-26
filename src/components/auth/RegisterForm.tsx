'use client'

import { useState, useEffect } from 'react'
import { validateInviteCode, getRegisteredYouth, register } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Label from '@/components/ui/Label'

type Role = 'youth' | 'parent'

interface YouthOption {
  id: string
  full_name: string
}

export default function RegisterForm() {
  const [showEmail, setShowEmail] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [inviteCode, setInviteCode] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 2 fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedYouthIds, setSelectedYouthIds] = useState<string[]>([])
  const [youthList, setYouthList] = useState<YouthOption[]>([])
  const [youthLoading, setYouthLoading] = useState(false)
  const [matchedYouth, setMatchedYouth] = useState<YouthOption | null>(null)
  const [showYouthPicker, setShowYouthPicker] = useState(false)

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

  // Fetch youth list when parent reaches Step 2
  useEffect(() => {
    if (step === 2 && role === 'parent') {
      setYouthLoading(true)
      getRegisteredYouth().then((result) => {
        if (result.youth) {
          setYouthList(result.youth)
        }
        setYouthLoading(false)
      })
    }
  }, [step, role])

  async function handleValidateCode() {
    setError('')
    setLoading(true)

    const result = await validateInviteCode(inviteCode.trim())

    if (result.valid && result.role) {
      setRole(result.role)
      if (result.matchedYouth) {
        setMatchedYouth(result.matchedYouth)
        setSelectedYouthIds([result.matchedYouth.id])
      }
      setStep(2)
    } else {
      setError(result.error || 'Ugyldig invitasjonskode')
    }

    setLoading(false)
  }

  async function handleRegister() {
    setError('')

    if (!fullName.trim()) {
      setError('Fyll inn fullt navn')
      return
    }
    if (phone.length !== 8) {
      setError('Telefonnummer må være 8 siffer')
      return
    }
    if (!email.trim()) {
      setError('Fyll inn e-postadresse')
      return
    }
    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.set('email', email.trim())
    formData.set('password', password)
    formData.set('fullName', fullName.trim())
    formData.set('phone', phone)
    formData.set('inviteCode', inviteCode.trim())
    formData.set('role', role!)
    formData.set('youthIds', JSON.stringify(selectedYouthIds))

    const result = await register(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, redirect happens server-side
  }

  function toggleYouthSelection(youthId: string) {
    setSelectedYouthIds((prev) =>
      prev.includes(youthId)
        ? prev.filter((id) => id !== youthId)
        : [...prev, youthId]
    )
  }

  return (
    <Card className="w-full max-w-[400px] mx-auto">
      {!showEmail && (
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

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}

          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors py-1"
          >
            Registrer med e-post i stedet
          </button>
        </div>
      )}

      {showEmail && (
        <>
          <p className="text-sm text-text-muted mb-4">
            Steg {step} av 2
          </p>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-code">Invitasjonskode</Label>
                <Input
                  id="invite-code"
                  type="text"
                  placeholder="Skriv inn koden du har fått"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {error && (
                <p className="text-danger text-sm">{error}</p>
              )}

              <Button
                onClick={handleValidateCode}
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? 'Sjekker...' : 'Bekreft kode'}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="full-name">Fullt navn</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Ola Nordmann"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="8 siffer"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  autoComplete="tel"
                  maxLength={8}
                />
              </div>

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
                  placeholder="Minst 6 tegn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              {role === 'parent' && (
                <div>
                  <Label>Ditt barn</Label>
                  {matchedYouth && !showYouthPicker ? (
                    <div className="mt-1">
                      <div className="flex items-center justify-between p-3 rounded-lg border-2 border-teal-primary/30 bg-teal-primary/5">
                        <span className="text-sm font-medium">{matchedYouth.full_name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowYouthPicker(true)
                            if (youthList.length === 0) {
                              setYouthLoading(true)
                              getRegisteredYouth().then((result) => {
                                if (result.youth) setYouthList(result.youth)
                                setYouthLoading(false)
                              })
                            }
                          }}
                          className="text-xs text-teal-primary font-medium underline underline-offset-2"
                        >
                          Endre
                        </button>
                      </div>
                    </div>
                  ) : youthLoading ? (
                    <p className="text-sm text-text-muted">Laster ungdomsliste...</p>
                  ) : youthList.length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {youthList.map((youth) => (
                        <label
                          key={youth.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedYouthIds.includes(youth.id)}
                            onChange={() => toggleYouthSelection(youth.id)}
                            className="w-5 h-5 rounded border-gray-300 text-teal-primary focus:ring-teal-primary"
                          />
                          <span className="text-sm">{youth.full_name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted mt-1">
                      Ingen ungdommer er registrert ennå. Du kan koble til barn senere.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-danger text-sm">{error}</p>
              )}

              <Button
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Registrerer...' : 'Registrer deg'}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
