'use client'

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  role?: 'youth' | 'parent' | 'admin'
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
}

const roleBgClasses: Record<string, string> = {
  youth: 'bg-teal-secondary',
  parent: 'bg-coral-light',
  admin: 'bg-teal-primary',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({
  name,
  avatarUrl,
  size = 'md',
  role = 'admin',
}: AvatarProps) {
  const sizeClass = sizeClasses[size]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`rounded-full object-cover ${sizeClass}`}
      />
    )
  }

  const bgClass = roleBgClasses[role] || roleBgClasses.admin

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white ${sizeClass} ${bgClass}`}
    >
      {getInitials(name)}
    </div>
  )
}
