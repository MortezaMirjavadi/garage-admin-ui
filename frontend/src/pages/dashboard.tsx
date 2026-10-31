import { Activity, Database, HardDrive, RefreshCw, Server } from 'lucide-react'

import type { NodeInfo } from '@/api/types'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  useClusterHealth,
  useClusterStatistics,
  useClusterStatus,
} from '@/hooks/use-cluster'
import { formatBytes, formatNumber, percent, truncateMiddle } from '@/lib/format'

function nodeCapacity(node: NodeInfo) {
  return node.dataPartition?.total ?? node.role?.capacity ?? 0
}

function nodeAvailable(node: NodeInfo) {
  return node.dataPartition?.available ?? 0
}

function NodeStatusBadge({ up }: { up: boolean }) {
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

export default function DashboardPage() {
  const health = useClusterHealth()
  const status = useClusterStatus()
  const statistics = useClusterStatistics()

  const nodes = status.data?.nodes ?? []
  const totalCapacity = nodes.reduce((sum, node) => sum + nodeCapacity(node), 0)
  const totalAvailable = nodes.reduce((sum, node) => sum + nodeAvailable(node), 0)
  const used = Math.max(0, totalCapacity - totalAvailable)
  const usedPercent = percent(used, totalCapacity)

  const healthStatus = health.data?.status
  const healthTone =
    healthStatus === 'healthy' ? 'good' : healthStatus === 'degraded' ? 'warn' : 'bad'
  const hasError = health.isError || status.isError || statistics.isError

  function retryAll() {
    void health.refetch()
    void status.refetch()
    void statistics.refetch()
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Cluster health, storage capacity, and objects across your Garage deployment."
        actions={
          <Button variant="outline" size="sm" onClick={retryAll}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      {hasError ? (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="flex flex-col gap-3 pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Cannot reach Garage</p>
              <p className="text-sm text-muted-foreground">
                {health.error instanceof Error
                  ? health.error.message
                  : 'The admin API on port 3903 did not respond.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={retryAll}>
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cluster health"
          value={health.isLoading ? '…' : (healthStatus ?? 'unknown')}
          hint={
            health.data
              ? `${health.data.partitionsAllOk}/${health.data.partitions} partitions OK`
              : 'Waiting for the admin API'
          }
          icon={Activity}
          tone={healthTone}
        />
        <StatCard
          title="Storage nodes"
          value={`${health.data?.storageNodesUp ?? 0}/${health.data?.storageNodes ?? 0}`}
          hint={`${health.data?.connectedNodes ?? 0} of ${health.data?.knownNodes ?? 0} nodes connected`}
          icon={Server}
        />
        <StatCard
          title="Space used"
          value={formatBytes(used)}
          hint={`${formatBytes(totalCapacity)} total capacity`}
          icon={HardDrive}
        />
        <StatCard
          title="Objects"
          value={formatNumber(statistics.data?.totalObjectCount)}
          hint={`${formatBytes(statistics.data?.totalObjectBytes)} in ${formatNumber(statistics.data?.bucketCount)} buckets`}
          icon={Database}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cluster capacity</CardTitle>
          <CardDescription>
            Aggregate disk usage across all storage nodes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={usedPercent} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {formatBytes(used)} used · {usedPercent.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              {formatBytes(totalAvailable)} available of {formatBytes(totalCapacity)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Nodes</CardTitle>
          <CardDescription>
            Layout version {status.data?.layoutVersion ?? '—'} · live status from the admin API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No nodes reported"
              description="The cluster status endpoint returned no nodes. Is Garage running?"
            />
          ) : (
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
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => {
                  const available = nodeAvailable(node)
                  const capacity = nodeCapacity(node)
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
                      <TableCell className="font-mono text-xs">
                        {node.addr ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span title={node.role?.tags.join(', ')}>
                          {node.role?.zone ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>{formatBytes(capacity)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            className="w-24"
                            value={percent(available, capacity)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(available)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {node.garageVersion ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {statistics.data?.freeform ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Garage statistics</CardTitle>
            <CardDescription>
              Raw summary reported by the cluster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
              {statistics.data.freeform}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}