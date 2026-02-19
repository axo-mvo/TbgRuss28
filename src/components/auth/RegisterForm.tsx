'use client'

import { useState, useEffect } from 'react'
import { validateInviteCode, getRegisteredYouth, register } from '@/lib/actions/auth'
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
  const [step, setStep] = useState<1 | 2>(1)
  const [inviteCode, setInviteCode] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 2 fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedYouthIds, setSelectedYouthIds] = useState<string[]>([])
  const [youthList, setYouthList] = useState<YouthOption[]>([])
  const [youthLoading, setYouthLoading] = useState(false)

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
              <Label>Velg ditt/dine barn</Label>
              {youthLoading ? (
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
    </Card>
  )
}
