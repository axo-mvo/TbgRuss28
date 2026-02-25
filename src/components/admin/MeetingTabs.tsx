'use client'

import { useState } from 'react'
import StationList from '@/components/admin/StationList'

interface Meeting {
  id: string
  title: string
  status: 'upcoming' | 'active' | 'completed'
  date: string | null
  time: string | null
  venue: string | null
  created_at: string
  updated_at: string
}

interface Station {
  id: string
  meeting_id: string
  number: number
  title: string
  description: string | null
  questions: string[]
  tip: string | null
  created_at: string
}

type TabKey = 'stasjoner' | 'grupper' | 'resultat'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'stasjoner', label: 'Stasjoner' },
  { key: 'grupper', label: 'Grupper' },
  { key: 'resultat', label: 'Resultat' },
]

interface MeetingTabsProps {
  meeting: Meeting
  stations: Station[]
  groupCount: number
}

export default function MeetingTabs({
  meeting,
  stations,
  groupCount,
}: MeetingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('stasjoner')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-h-[44px] text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-teal-primary text-teal-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'stasjoner' && (
        <StationList meeting={meeting} initialStations={stations} />
      )}

      {activeTab === 'grupper' && (
        <p className="text-text-muted text-sm p-4">
          Grupper kommer i neste plan
        </p>
      )}

      {activeTab === 'resultat' && (
        <p className="text-text-muted text-sm p-4">
          Resultat kommer i neste plan
        </p>
      )}
    </div>
  )
}
