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

interface UseRealtimeChatOptions {
  readOnly?: boolean
  onStationEnded?: () => void
}

export function useRealtimeChat(
  sessionId: string,
  currentUserId: string,
  options?: UseRealtimeChatOptions
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const readOnly = options?.readOnly ?? false
  const onStationEndedRef = useRef(options?.onStationEnded)

  // Keep callback ref current without causing effect re-runs
  useEffect(() => {
    onStationEndedRef.current = options?.onStationEnded
  }, [options?.onStationEnded])

  useEffect(() => {
    // In readOnly mode, skip subscription entirely
    if (readOnly) return

    const supabase = createClient()
    let cancelled = false
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    function subscribe(attempt: number) {
      if (cancelled) return

      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token
        if (attempt === 0) {
          console.log('[RealtimeChat] Session token exists:', !!token, token ? `(${token.slice(0, 20)}...)` : '(null)')
        }
        return supabase.realtime.setAuth(token ?? null)
      }).then(() => {
        if (cancelled) return
        console.log('[RealtimeChat] setAuth OK, subscribing to', `station:${sessionId}`, attempt > 0 ? `(retry #${attempt})` : '')

        const channel = supabase.channel(`station:${sessionId}`, {
          config: {
            private: true,
            broadcast: { self: true, ack: false },
          },
        })

        channel
          .on('broadcast', { event: 'new-message' }, (payload) => {
            console.log('[RealtimeChat] Received broadcast message:', payload.payload?.id)
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
          .on('broadcast', { event: 'station-ended' }, () => {
            onStationEndedRef.current?.()
          })
          .subscribe((status, err) => {
            console.log('[RealtimeChat] Subscription status:', status, err || '')

            if (status === 'SUBSCRIBED') {
              setConnected(true)
            } else if (status === 'TIMED_OUT' && !cancelled && attempt < 3) {
              console.log('[RealtimeChat] Timed out, retrying in 1s...')
              supabase.removeChannel(channel)
              channelRef.current = null
              retryTimeout = setTimeout(() => subscribe(attempt + 1), 1000)
            }
          })

        channelRef.current = channel
      }).catch((err) => {
        console.error('[RealtimeChat] setAuth FAILED:', err)
      })
    }

    subscribe(0)

    return () => {
      cancelled = true
      if (retryTimeout) clearTimeout(retryTimeout)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [sessionId, currentUserId, readOnly])

  const sendBroadcast = useCallback(
    async (message: ChatMessage) => {
      if (!channelRef.current) {
        console.warn('[RealtimeChat] sendBroadcast: channel not ready')
        return
      }
      const result = await channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: message,
      })
      console.log('[RealtimeChat] Broadcast sent, result:', result)
    },
    []
  )

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  return { messages, setMessages, sendBroadcast, addOptimistic, channelRef, connected }
}
