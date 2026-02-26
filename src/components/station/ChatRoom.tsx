'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeChat, type ChatMessage } from '@/lib/hooks/useRealtimeChat'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'
import { sendMessage, endStation, openStation, reopenStation } from '@/lib/actions/station'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import StationHeader from './StationHeader'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import ReopenDialog from './ReopenDialog'

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
  isStarted?: boolean
  stationId?: string
  hideReopen?: boolean
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
  isStarted = true,
  stationId,
  hideReopen = false,
}: ChatRoomProps) {
  const router = useRouter()
  const [started, setStarted] = useState(isStarted)
  const [starting, setStarting] = useState(false)
  const [localEndTimestamp, setLocalEndTimestamp] = useState(endTimestamp)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [ending, setEnding] = useState(false)
  const [localReadOnly, setLocalReadOnly] = useState(readOnly)
  const [showReopenDialog, setShowReopenDialog] = useState(false)
  const [reopening, setReopening] = useState(false)

  const { messages, setMessages, sendBroadcast, channelRef, connected } = useRealtimeChat(
    sessionId,
    userId,
    {
      readOnly: localReadOnly,
      onStationEnded: () => {
        // Unsubscribe channel before navigating to prevent state updates
        // on unmounted components during the navigation transition
        channelRef.current?.unsubscribe()
        channelRef.current = null

        // Use full page navigation instead of router.push to avoid a React 19
        // dev-mode crash in RSC debug info processing (frame.join is not a function)
        // when the navigation originates from a WebSocket callback context
        window.location.href = '/dashboard'
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

  async function handleStart() {
    if (!stationId) return
    setStarting(true)
    const result = await openStation(stationId)
    if (result.error) {
      console.error('Failed to start station:', result.error)
      setStarting(false)
      return
    }
    if (result.endTimestamp) {
      setLocalEndTimestamp(result.endTimestamp)
    }
    setStarted(true)
    setStarting(false)
  }

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

    // Add to local state immediately for instant sender feedback
    setMessages((prev) => [...prev, optimisticMessage])

    // Broadcast to other group members (self-receive will deduplicate by ID)
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
    const channel = channelRef.current
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'station-ended',
        payload: { sessionId },
      })

      // Unsubscribe after broadcasting to prevent the self-received
      // station-ended event from racing with the navigation below
      channel.unsubscribe()
      channelRef.current = null
    }

    router.push('/dashboard')
  }

  async function handleReopen(minutes: number) {
    setReopening(true)
    const result = await reopenStation(sessionId, minutes)
    if (result.error) {
      console.error('Failed to reopen station:', result.error)
      setReopening(false)
      return
    }
    if (result.endTimestamp) {
      setLocalEndTimestamp(result.endTimestamp)
    }
    setLocalReadOnly(false)
    setStarted(true)
    setShowReopenDialog(false)
    setReopening(false)
  }

  // Pre-start view: show station context and "Start diskusjon" button
  if (!started) {
    return (
      <div className="flex flex-col h-dvh bg-warm-white/50">
        <StationHeader
          stationTitle={stationTitle}
          stationNumber={stationNumber}
          endTimestamp={null}
          readOnly={false}
        />

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Station context -- questions and tip */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text-primary mb-2">
              Stasjon {stationNumber}: {stationTitle}
            </h2>
            {stationQuestions && stationQuestions.length > 0 && (
              <div className="mb-4 p-4 rounded-xl bg-teal-primary/5 border border-teal-primary/10">
                <p className="text-sm font-semibold text-teal-primary mb-2">Diskusjonsspørsmål:</p>
                <ul className="space-y-2">
                  {stationQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-text-primary pl-3 border-l-2 border-teal-primary/30">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stationTip && (
              <div className="p-4 rounded-xl bg-coral/5 border border-coral/10">
                <p className="text-sm text-text-muted italic">
                  Tips: {stationTip}
                </p>
              </div>
            )}
          </div>

          <p className="text-sm text-text-muted text-center mb-4">
            Når dere er klare, trykk start for å begynne diskusjonen. Nedtellingen starter da.
          </p>
        </div>

        <div className="px-4 py-4 border-t border-text-muted/10 bg-warm-white">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? 'Starter...' : 'Start diskusjon'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-warm-white/50">
      <StationHeader
        stationTitle={stationTitle}
        stationNumber={stationNumber}
        endTimestamp={localReadOnly ? null : localEndTimestamp}
        onEndStation={localReadOnly ? undefined : () => setShowEndDialog(true)}
        readOnly={localReadOnly}
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

      {localReadOnly ? (
        <div className="px-4 py-3 bg-text-muted/10 border-t border-text-muted/10 flex items-center justify-between">
          <span className="text-sm text-text-muted">Diskusjonen er avsluttet</span>
          {!hideReopen && (
            <button
              type="button"
              onClick={() => setShowReopenDialog(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-teal-primary text-white hover:bg-teal-secondary transition-colors"
            >
              Gjenåpne
            </button>
          )}
        </div>
      ) : (
        <ChatInput onSend={handleSend} disabled={!connected} />
      )}

      <Dialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onConfirm={handleEndStation}
        title="Avslutt stasjon?"
        description="Er du sikker på at du vil avslutte? Alle gruppemedlemmer sendes tilbake til stasjonsoversikten."
        confirmLabel="Avslutt"
        confirmVariant="danger"
        loading={ending}
      />

      <ReopenDialog
        open={showReopenDialog}
        onClose={() => setShowReopenDialog(false)}
        onConfirm={handleReopen}
        loading={reopening}
      />
    </div>
  )
}
