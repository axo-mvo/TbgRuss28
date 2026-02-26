import type { ChatMessage } from '@/lib/hooks/useRealtimeChat'
import MessageBubble from './MessageBubble'

interface MessageListProps {
  messages: ChatMessage[]
  currentUserId: string
  anonymous?: boolean
}

export default function MessageList({ messages, currentUserId, anonymous }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-muted">Ingen meldinger ennå</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          fullName={msg.fullName}
          role={msg.role}
          content={msg.content}
          createdAt={msg.createdAt}
          isOwn={msg.userId === currentUserId}
          anonymous={anonymous}
        />
      ))}
    </div>
  )
}
