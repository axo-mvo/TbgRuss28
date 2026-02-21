'use client'

import { useState, useMemo } from 'react'
import { buildWordFrequencies } from '@/lib/wordcloud/build-word-frequencies'

export interface WordCloudMessage {
  content: string
  groupId: string
  groupName: string
  stationId: string
  stationNumber: number
  stationTitle: string
}

interface WordCloudProps {
  messages: WordCloudMessage[]
  groups: { id: string; name: string }[]
  stations: { id: string; number: number; title: string }[]
}

type FilterType = 'all' | 'group' | 'station'

const WORD_COLORS = [
  'text-teal-primary',
  'text-coral',
  'text-teal-secondary',
  'text-text-primary',
  'text-coral-light',
]

const MIN_FONT = 14
const MAX_FONT = 56

export default function WordCloud({ messages, groups, stations }: WordCloudProps) {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterValue, setFilterValue] = useState<string>('')

  const filteredMessages = useMemo(() => {
    if (filterType === 'all') return messages
    if (filterType === 'group') return messages.filter((m) => m.groupId === filterValue)
    if (filterType === 'station') return messages.filter((m) => m.stationId === filterValue)
    return messages
  }, [messages, filterType, filterValue])

  const frequencies = useMemo(
    () => buildWordFrequencies(filteredMessages.map((m) => m.content)),
    [filteredMessages]
  )

  const uniqueWordCount = frequencies.length
  const maxCount = frequencies.length > 0 ? frequencies[0].count : 1
  const minCount = frequencies.length > 0 ? frequencies[frequencies.length - 1].count : 1

  function getFontSize(count: number): number {
    if (maxCount === minCount) return (MIN_FONT + MAX_FONT) / 2
    const ratio = (count - minCount) / (maxCount - minCount)
    return MIN_FONT + ratio * (MAX_FONT - MIN_FONT)
  }

  function handleFilterType(type: FilterType) {
    setFilterType(type)
    if (type === 'all') {
      setFilterValue('')
    } else if (type === 'group' && groups.length > 0) {
      setFilterValue(groups[0].id)
    } else if (type === 'station' && stations.length > 0) {
      setFilterValue(stations[0].id)
    }
  }

  const segmentButtons: { type: FilterType; label: string }[] = [
    { type: 'all', label: 'Alle' },
    { type: 'group', label: 'Per gruppe' },
    { type: 'station', label: 'Per stasjon' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Segment filter buttons */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {segmentButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleFilterType(btn.type)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              filterType === btn.type
                ? 'bg-teal-primary text-white'
                : 'bg-white text-text-muted hover:bg-gray-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Sub-filter pills */}
      {filterType === 'group' && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setFilterValue(g.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterValue === g.id
                  ? 'bg-teal-primary text-white'
                  : 'bg-white border border-gray-200 text-text-muted hover:border-teal-secondary'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {filterType === 'station' && stations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stations.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterValue(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterValue === s.id
                  ? 'bg-teal-primary text-white'
                  : 'bg-white border border-gray-200 text-text-muted hover:border-teal-secondary'
              }`}
            >
              Stasjon {s.number}: {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <p className="text-xs text-text-muted">
        {filteredMessages.length} meldinger &middot; {uniqueWordCount} unike ord
      </p>

      {/* Word cloud */}
      <div className="min-h-[300px] rounded-xl bg-white border border-gray-200 shadow-sm p-4 flex flex-wrap justify-center items-center gap-2">
        {frequencies.length === 0 ? (
          <p className="text-text-muted text-sm">
            Ingen meldinger funnet for dette filteret
          </p>
        ) : (
          frequencies.map((freq, index) => {
            const fontSize = getFontSize(freq.count)
            const colorClass = WORD_COLORS[index % WORD_COLORS.length]
            // ~20% of words get slight rotation, deterministic by index
            const rotate = index % 5 === 0
            const rotateClass = rotate
              ? index % 2 === 0
                ? '-rotate-[6deg]'
                : 'rotate-[6deg]'
              : ''

            return (
              <span
                key={freq.word}
                className={`inline-block font-semibold leading-tight ${colorClass} ${rotateClass} transition-transform hover:scale-110`}
                style={{ fontSize: `${fontSize}px` }}
                title={`${freq.word}: ${freq.count}`}
              >
                {freq.word}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}
