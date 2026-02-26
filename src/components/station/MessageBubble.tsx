import Badge from '@/components/ui/Badge'

interface MessageBubbleProps {
  fullName: string
  role: 'youth' | 'parent'
  content: string
  createdAt: string
  isOwn: boolean
  anonymous?: boolean
}

const roleLabels: Record<'youth' | 'parent', string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
}

export default function MessageBubble({
  fullName,
  role,
  content,
  createdAt,
  isOwn,
  anonymous,
}: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`flex flex-col max-w-[80%] ${
        isOwn ? 'ml-auto items-end' : 'items-start'
      }`}
    >
      {!isOwn && (
        <div className="flex items-center gap-1.5 mb-0.5 px-1">
          <span className="text-xs font-medium text-text-muted">{anonymous ? roleLabels[role] : fullName}</span>
          <Badge variant={role} className="!text-[9px] !px-1.5 !py-0">
            {roleLabels[role]}
          </Badge>
        </div>
      )}

      <div
        className={`px-3 py-2 rounded-2xl ${
          isOwn
            ? 'bg-teal-primary text-warm-white rounded-br-sm'
            : 'bg-warm-white border border-teal-primary/10 text-text-primary rounded-bl-sm'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
      </div>

      <span className="text-[10px] text-text-muted mt-0.5 px-1">{time}</span>
    </div>
  )
}
