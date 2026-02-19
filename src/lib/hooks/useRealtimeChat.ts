'use client'

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useRef } from 'react'

export type ChatMessage = {
  id: string
  userId: string
  fullName: string
  role: 'youth' | 'parent'
  content: string
  createdAt: string
  status: 'sent' | 'pending' | 'error'
}

export function useRealtimeChat(sessionId: string, currentUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    // setAuth() is REQUIRED for private channels
    supabase.realtime.setAuth().then(() => {
      if (cancelled) return

      const channel = supabase.channel(`station:${sessionId}`, {
        config: {
          private: true,
          broadcast: { self: true, ack: false },
        },
      })

      channel
        .on('broadcast', { event: 'new-message' }, (payload) => {
          const msg = payload.payload as ChatMessage
          setMessages((prev) => {
            // Deduplicate: if we sent it optimistically, replace pending with confirmed
            const exists = prev.find((m) => m.id === msg.id)
            if (exists) {
              return prev.map((m) =>
                m.id === msg.id ? { ...msg, status: 'sent' as const } : m
              )
            }
            return [...prev, { ...msg, status: 'sent' as const }]
          })
        })
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      cancelled = true
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [sessionId, currentUserId])

  const sendBroadcast = useCallback(
    async (message: ChatMessage) => {
      if (!channelRef.current) return
      await channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: message,
      })
    },
    []
  )

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  return { messages, setMessages, sendBroadcast, addOptimistic }
}
