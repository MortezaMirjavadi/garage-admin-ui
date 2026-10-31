import type { BucketPermissions } from '@/api/types'
import { Badge } from '@/components/ui/badge'

export function PermissionBadges({ permissions }: { permissions: BucketPermissions }) {
  const entries = [
    { label: 'Read', on: permissions.read },
    { label: 'Write', on: permissions.write },
    { label: 'Owner', on: permissions.owner },
  ]

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((entry) => (
        <Badge
          key={entry.label}
          variant={entry.on ? 'secondary' : 'outline'}
          className={entry.on ? '' : 'text-muted-foreground line-through'}
        >
          {entry.label}
        </Badge>
      ))}
    </div>
  )
}