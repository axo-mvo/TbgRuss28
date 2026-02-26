import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ContactActions from './ContactActions'

interface Member {
  id: string
  full_name: string
  role: 'youth' | 'parent' | 'admin'
  phone: string | null
  email: string
}

interface EveryoneDirectoryViewProps {
  members: Member[]
}

const roleLabels: Record<Member['role'], string> = {
  youth: 'Ungdom',
  parent: 'Forelder',
  admin: 'Admin',
}

export default function EveryoneDirectoryView({ members }: EveryoneDirectoryViewProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="Ingen treff"
        description="Prøv et annet søk."
      />
    )
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="p-3 rounded-lg border border-gray-200 bg-white"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{member.full_name}</span>
            <Badge variant={member.role}>{roleLabels[member.role]}</Badge>
          </div>
          <ContactActions phone={member.phone} email={member.email} />
        </div>
      ))}
    </div>
  )
}
