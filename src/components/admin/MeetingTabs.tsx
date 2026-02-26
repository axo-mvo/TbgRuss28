'use client'

import { useState } from 'react'
import StationList from '@/components/admin/StationList'
import GroupBuilder from '@/components/admin/GroupBuilder'
import MeetingLifecycleControls from '@/components/admin/MeetingLifecycleControls'
import MeetingResultsTab from '@/components/admin/MeetingResultsTab'
import type { WordCloudMessage } from '@/components/admin/WordCloud'

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

interface UserData {
  id: string
  full_name: string
  role: string
  attending?: boolean | null
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
  // Grupper tab data
  initialGroups: Record<string, string[]>
  users: UserData[]
  parentChildLinks: { parent_id: string; youth_id: string }[]
  groupNames: Record<string, string>
  groupsLocked: boolean
  groupCount: number
  stationCount: number
  // Resultat tab data
  messages: WordCloudMessage[]
  wordcloudGroups: { id: string; name: string }[]
  wordcloudStations: { id: string; number: number; title: string }[]
}

export default function MeetingTabs({
  meeting,
  stations,
  initialGroups,
  users,
  parentChildLinks,
  groupNames,
  groupsLocked,
  groupCount,
  stationCount,
  messages,
  wordcloudGroups,
  wordcloudStations,
}: MeetingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('stasjoner')

  return (
    <div>
      {/* Lifecycle controls -- visible on all tabs */}
      <MeetingLifecycleControls
        meeting={meeting}
        stationCount={stationCount}
        groupCount={groupCount}
      />

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
        <GroupBuilder
          meetingId={meeting.id}
          initialGroups={initialGroups}
          users={users}
          parentChildLinks={parentChildLinks}
          groupNames={groupNames}
          initialLocked={groupsLocked}
          readOnly={meeting.status === 'completed'}
        />
      )}

      {activeTab === 'resultat' && (
        <MeetingResultsTab
          meeting={meeting}
          messages={messages}
          groups={wordcloudGroups}
          stations={wordcloudStations}
        />
      )}
    </div>
  )
}
