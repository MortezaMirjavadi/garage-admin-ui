import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Server } from 'lucide-react'
import { toast } from 'sonner'

import { createMetadataSnapshot, launchRepair } from '@/api/cluster'
import type { NodeInfo, RepairTypeValue } from '@/api/types'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBlockErrors, useWorkers } from '@/hooks/use-admin-panel'
import { queryKeys } from '@/keys/query-keys'
import { formatNumber, truncateMiddle } from '@/lib/format'

import { NodeSelect, workerStateLabel } from './shared'

const REPAIR_OPTIONS = [
  { value: 'tables', label: 'Repair tables' },
  { value: 'blocks', label: 'Repair blocks' },
  { value: 'versions', label: 'Repair versions' },
  { value: 'multipartUploads', label: 'Repair multipart uploads' },
  { value: 'blockRefs', label: 'Repair block refs' },
  { value: 'blockRc', label: 'Repair block refcounts' },
  { value: 'rebalance', label: 'Rebalance' },
  { value: 'aliases', label: 'Repair aliases' },
  { value: 'clearResyncQueue', label: 'Clear resync queue' },
  { value: 'scrub:start', label: 'Scrub: start' },
  { value: 'scrub:pause', label: 'Scrub: pause' },
  { value: 'scrub:resume', label: 'Scrub: resume' },
  { value: 'scrub:cancel', label: 'Scrub: cancel' },
]

function parseRepairType(value: string): RepairTypeValue {
  if (value.startsWith('scrub:')) {
    return { scrub: value.slice('scrub:'.length) as 'start' | 'pause' | 'resume' | 'cancel' }
  }
  return value as RepairTypeValue
}

export function OperationsTab({ nodes }: { nodes: NodeInfo[] }) {
  const queryClient = useQueryClient()
  const [nodeId, setNodeId] = useState('')
  const selected = nodeId || nodes[0]?.id || ''
  const [repairType, setRepairType] = useState('tables')

  const workers = useWorkers(selected)
  const blockErrors = useBlockErrors(selected)

  const repair = useMutation({
    mutationFn: () => launchRepair(selected, parseRepairType(repairType)),
    onSuccess: () => {
      toast.success('Repair operation launched')
      void queryClient.invalidateQueries({ queryKey: queryKeys.workers(selected) })
    },
    onError: (error) => toast.error(error.message),
  })

  const snapshot = useMutation({
    mutationFn: () => createMetadataSnapshot(selected),
    onSuccess: () => toast.success('Metadata snapshot requested'),
    onError: (error) => toast.error(error.message),
  })

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No nodes"
        description="Node operations require at least one connected node."
      />
    )
  }

  const workerList = workers.data?.success[selected] ?? []
  const workerError = workers.data?.error[selected]
  const blockErrorList = blockErrors.data?.success[selected] ?? []
  const blockErrorMsg = blockErrors.data?.error[selected]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-sm text-muted-foreground">Target node</span>
        <NodeSelect nodes={nodes} value={selected} onChange={setNodeId} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workers</CardTitle>
            <CardDescription>Background tasks running on this node.</CardDescription>
          </CardHeader>
          <CardContent>
            {workers.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : workerError ? (
              <p className="text-sm text-destructive">{workerError}</p>
            ) : workerList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workers reported.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Queue</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerList.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell className="text-sm">{worker.name}</TableCell>
                      <TableCell className="text-xs">{workerStateLabel(worker.state)}</TableCell>
                      <TableCell>{formatNumber(worker.errors)}</TableCell>
                      <TableCell>{formatNumber(worker.queueLength)}</TableCell>
                      <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">
                        {worker.progress ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repairs & maintenance</CardTitle>
            <CardDescription>Launched on the target node.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Repair operation</Label>
              <Select value={repairType} onValueChange={setRepairType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPAIR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={repair.isPending}
              onClick={() => repair.mutate()}
            >
              {repair.isPending ? 'Running…' : 'Run repair'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={snapshot.isPending}
              onClick={() => snapshot.mutate()}
            >
              <Camera className="size-3.5" />
              {snapshot.isPending ? 'Requesting…' : 'Metadata snapshot'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Repairs can be long-running and may impact performance while they run.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Block errors</CardTitle>
          <CardDescription>Blocks that failed to resync on this node.</CardDescription>
        </CardHeader>
        <CardContent>
          {blockErrors.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : blockErrorMsg ? (
            <p className="text-sm text-destructive">{blockErrorMsg}</p>
          ) : blockErrorList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No block errors.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block hash</TableHead>
                  <TableHead>Refcount</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Last try</TableHead>
                  <TableHead>Next try</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockErrorList.map((error) => (
                  <TableRow key={error.blockHash}>
                    <TableCell className="font-mono text-xs">
                      {truncateMiddle(error.blockHash, 12, 8)}
                    </TableCell>
                    <TableCell>{formatNumber(error.refcount)}</TableCell>
                    <TableCell>{formatNumber(error.errorCount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {error.lastTrySecsAgo}s ago
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      in {error.nextTryInSecs}s
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}