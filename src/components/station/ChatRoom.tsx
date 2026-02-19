'use client'

import { useEffect } from 'react'
import { useRealtimeChat, type ChatMessage } from '@/lib/hooks/useRealtimeChat'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'
import { sendMessage } from '@/lib/actions/station'
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
}: ChatRoomProps) {
  const { messages, setMessages, sendBroadcast } = useRealtimeChat(sessionId, userId)
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

  return (
    <div className="flex flex-col h-dvh bg-warm-white/50">
      <StationHeader
        stationTitle={stationTitle}
        stationNumber={stationNumber}
        endTimestamp={endTimestamp}
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

      <ChatInput onSend={handleSend} />
    </div>
  )
}
