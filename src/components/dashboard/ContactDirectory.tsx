'use client'

import { useState, useMemo } from 'react'
import SearchInput from '@/components/ui/SearchInput'
import YouthDirectoryView from './YouthDirectoryView'
import EveryoneDirectoryView from './EveryoneDirectoryView'

interface YouthWithParents {
  id: string
  full_name: string
  phone: string | null
  email: string
  parents: Array<{
    id: string
    full_name: string
    phone: string | null
    email: string
  }>
}

interface Member {
  id: string
  full_name: string
  role: 'youth' | 'parent' | 'admin'
  phone: string | null
  email: string
}

interface ContactDirectoryProps {
  youth: YouthWithParents[]
  everyone: Member[]
}

type View = 'youth' | 'everyone'

export default function ContactDirectory({ youth, everyone }: ContactDirectoryProps) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('youth')

  const normalizedSearch = search.toLowerCase().trim()

  const filteredYouth = useMemo(() => {
    if (!normalizedSearch) return youth
    return youth.filter(
      (y) =>
        y.full_name.toLowerCase().includes(normalizedSearch) ||
        y.parents.some((p) => p.full_name.toLowerCase().includes(normalizedSearch))
    )
  }, [youth, normalizedSearch])

  const filteredEveryone = useMemo(() => {
    if (!normalizedSearch) return everyone
    return everyone.filter((m) =>
      m.full_name.toLowerCase().includes(normalizedSearch)
    )
  }, [everyone, normalizedSearch])

  return (
    <section>
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Kontaktliste
      </h2>

      <div className="mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Søk etter navn..."
        />
      </div>

      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setView('youth')}
          className={`flex-1 min-h-[44px] text-sm font-medium transition-colors ${
            view === 'youth'
              ? 'bg-teal-primary text-white'
              : 'bg-white text-text-muted hover:bg-gray-50'
          }`}
        >
          Ungdommer
        </button>
        <button
          type="button"
          onClick={() => setView('everyone')}
          className={`flex-1 min-h-[44px] text-sm font-medium transition-colors ${
            view === 'everyone'
              ? 'bg-teal-primary text-white'
              : 'bg-white text-text-muted hover:bg-gray-50'
          }`}
        >
          Alle
        </button>
      </div>

      {view === 'youth' ? (
        <YouthDirectoryView youth={filteredYouth} />
      ) : (
        <EveryoneDirectoryView members={filteredEveryone} />
      )}
    </section>
  )
}
