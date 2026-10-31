import { useState } from 'react'
import { Server } from 'lucide-react'

import type { NodeInfo } from '@/api/types'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useNodeInfo, useNodeStatistics } from '@/hooks/use-admin-panel'
import { formatBytes, formatNumber, percent, truncateMiddle } from '@/lib/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { NodeStatusBadge } from './shared'

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-all text-sm">{value}</p>
    </div>
  )
}

function NodeDetailsDialog({
  nodeId,
  open,
  onOpenChange,
}: {
  nodeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const info = useNodeInfo(nodeId, open)
  const stats = useNodeStatistics(nodeId, open)
  const infoData = info.data?.success[nodeId]
  const infoError = info.data?.error[nodeId]
  const statData = stats.data?.success[nodeId]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Node details</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">
            {nodeId}
          </DialogDescription>
        </DialogHeader>

        {info.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : infoError ? (
          <p className="text-sm text-destructive">{infoError}</p>
        ) : infoData ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Garage version" value={infoData.garageVersion} />
              <InfoItem label="Rust version" value={infoData.rustVersion} />
              <InfoItem label="Database engine" value={infoData.dbEngine} />
              <InfoItem label="Address" value={infoData.addr ?? '—'} />
              <InfoItem label="Hostname" value={infoData.hostname ?? '—'} />
              <InfoItem label="Zone" value={infoData.role?.zone ?? '—'} />
            </div>

            {infoData.connectionParameters ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">S3 connection</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(infoData.connectionParameters, null, 2)}
                </pre>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Statistics</p>
              {statData?.blockManagerStats ? (
                <p className="text-xs">
                  {formatNumber(statData.blockManagerStats.rcEntries)} block refs ·
                  resync queue {formatNumber(statData.blockManagerStats.resyncQueueLen)} ·
                  errors {formatNumber(statData.blockManagerStats.resyncErrors)}
                </p>
              ) : null}
              {statData?.tableStats ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>GC queue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statData.tableStats.map((table) => (
                      <TableRow key={table.tableName}>
                        <TableCell className="text-xs">{table.tableName}</TableCell>
                        <TableCell>{formatNumber(table.items)}</TableCell>
                        <TableCell>{formatNumber(table.gcQueueLen)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
              {statData?.freeform ? (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                  {statData.freeform}
                </pre>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function NodesTab({ nodes, loading }: { nodes: NodeInfo[]; loading: boolean }) {
  const [detailId, setDetailId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No nodes reported"
        description="The cluster status endpoint returned no nodes."
      />
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Node ID</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Data available</TableHead>
                <TableHead>Resync</TableHead>
                <TableHead>Draining</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => {
                const capacity = node.dataPartition?.total ?? node.role?.capacity ?? 0
                const available = node.dataPartition?.available ?? 0
                return (
                  <TableRow key={node.id}>
                    <TableCell>
                      <NodeStatusBadge up={node.isUp} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span title={node.id}>{truncateMiddle(node.id, 10, 6)}</span>
                        <CopyButton value={node.id} label="Copy node ID" />
                      </div>
                    </TableCell>
                    <TableCell>{node.hostname ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{node.addr ?? '—'}</TableCell>
                    <TableCell>{node.role?.zone ?? '—'}</TableCell>
                    <TableCell>{formatBytes(capacity)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress className="w-20" value={percent(available, capacity)} />
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(available)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(node.resyncQueueLen)}</TableCell>
                    <TableCell>{node.draining ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(node.id)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NodeDetailsDialog
        nodeId={detailId ?? ''}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      />
    </>
  )
}