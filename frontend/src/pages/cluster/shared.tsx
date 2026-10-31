import type { NodeInfo, WorkerState, ZoneRedundancy } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { truncateMiddle } from '@/lib/format'

export function nodeLabel(node: NodeInfo): string {
  return node.hostname ?? truncateMiddle(node.id, 10, 6)
}

export function zoneRedundancyLabel(zr: ZoneRedundancy): string {
  return zr === 'maximum' ? 'Maximum' : `At least ${zr.atLeast}`
}

export function workerStateLabel(state: WorkerState): string {
  return typeof state === 'string'
    ? state
    : `throttled (${state.throttled.durationSecs.toFixed(0)}s)`
}

export function NodeStatusBadge({ up }: { up: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        up
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
      }
    >
      {up ? 'Up' : 'Down'}
    </Badge>
  )
}

export function NodeSelect({
  nodes,
  value,
  onChange,
}: {
  nodes: NodeInfo[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-96">
        <SelectValue placeholder="Select a node" />
      </SelectTrigger>
      <SelectContent>
        {nodes.map((node) => (
          <SelectItem key={node.id} value={node.id}>
            {nodeLabel(node)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}