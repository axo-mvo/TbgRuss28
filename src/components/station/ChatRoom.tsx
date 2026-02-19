'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeChat, type ChatMessage } from '@/lib/hooks/useRealtimeChat'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'
import { sendMessage, endStation } from '@/lib/actions/station'
import Dialog from '@/components/ui/Dialog'
import StationHeader from './StationHeader'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

interface ChatRoomProps {
  sessionId: string
  userId: string
  userFullName: string
  userRole: 'youth' | 'parent'
  endTimestamp: string | null
  stationTitle: string
  stationNumber: number
  stationQuestions: string[] | null
  stationTip: string | null
  initialMessages: ChatMessage[]
  readOnly?: boolean
}

export default function ChatRoom({
  sessionId,
  userId,
  userFullName,
  userRole,
  endTimestamp,
  stationTitle,
  stationNumber,
  stationQuestions,
  stationTip,
  initialMessages,
  readOnly = false,
}: ChatRoomProps) {
  const router = useRouter()
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [ending, setEnding] = useState(false)

  const { messages, setMessages, sendBroadcast, channelRef } = useRealtimeChat(
    sessionId,
    userId,
    {
      readOnly,
      onStationEnded: () => {
        router.push('/dashboard')
      },
    }
  )
  const { containerRef, sentinelRef } = useAutoScroll([messages])

  // Merge initial messages on mount
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSend(content: string) {
    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      fullName: userFullName,
      role: userRole,
      content,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    // Broadcast to all channel subscribers (including self)
    sendBroadcast(optimisticMessage)

    // Persist via server action (fire-and-forget)
    sendMessage({ id: optimisticMessage.id, sessionId, content }).catch((err) => {
      console.error('Failed to persist message:', err)
    })
  }

  async function handleEndStation() {
    setEnding(true)
    const result = await endStation(sessionId)
    if (result.error) {
      console.error('Failed to end station:', result.error)
      setEnding(false)
      return
    }

    // Broadcast station-ended event to all group members
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'station-ended',
      payload: { sessionId },
    })

    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col h-dvh bg-warm-white/50">
      <StationHeader
        stationTitle={stationTitle}
        stationNumber={stationNumber}
        endTimestamp={endTimestamp}
        onEndStation={readOnly ? undefined : () => setShowEndDialog(true)}
        readOnly={readOnly}
      />

      {/* Scrollable message area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-3">
        {/* Station context card */}
        {(stationQuestions || stationTip) && (
          <div className="mb-4 p-3 rounded-xl bg-teal-primary/5 border border-teal-primary/10">
            {stationQuestions && stationQuestions.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-teal-primary mb-1">Diskuter:</p>
                <ul className="space-y-1">
                  {stationQuestions.map((q, i) => (
                    <li key={i} className="text-xs text-text-muted pl-2 border-l-2 border-teal-primary/20">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stationTip && (
              <p className="text-xs text-text-muted italic">
                Tips: {stationTip}
              </p>
            )}
          </div>
        )}

        <MessageList messages={messages} currentUserId={userId} />
        <div ref={sentinelRef} />
      </div>

      {readOnly ? (
        <div className="px-4 py-3 bg-text-muted/10 text-center text-sm text-text-muted border-t border-text-muted/10">
          Diskusjonen er avsluttet
        </div>
      ) : (
        <ChatInput onSend={handleSend} />
      )}

      <Dialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onConfirm={handleEndStation}
        title="Avslutt stasjon?"
        description="Er du sikker pa at du vil avslutte? Alle gruppemedlemmer sendes tilbake til stasjonsoversikten."
        confirmLabel="Avslutt"
        confirmVariant="danger"
        loading={ending}
      />
    </div>
  )
}
