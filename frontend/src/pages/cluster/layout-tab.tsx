import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  applyLayout,
  previewLayout,
  revertLayout,
  skipDeadNodes,
  stageLayoutChange,
} from '@/api/cluster'
import type { LayoutPreview, NodeInfo, NodeRoleChange } from '@/api/types'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClusterLayout } from '@/hooks/use-admin-panel'
import { queryKeys } from '@/keys/query-keys'
import { formatBytes, truncateMiddle } from '@/lib/format'

import { NodeSelect, zoneRedundancyLabel } from './shared'

export function LayoutTab({
  nodes,
  singleNode,
}: {
  nodes: NodeInfo[]
  singleNode: boolean
}) {
  const queryClient = useQueryClient()
  const layout = useClusterLayout()

  const [nodeId, setNodeId] = useState('')
  const [zone, setZone] = useState('dc1')
  const [tags, setTags] = useState('')
  const [capacityGib, setCapacityGib] = useState('')
  const [preview, setPreview] = useState<LayoutPreview | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [allowMissingData, setAllowMissingData] = useState(false)

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.clusterLayout })
    void queryClient.invalidateQueries({ queryKey: queryKeys.clusterStatus })
  }

  const stage = useMutation({
    mutationFn: stageLayoutChange,
    onSuccess: () => {
      toast.success('Role change staged')
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const previewMutation = useMutation({
    mutationFn: previewLayout,
    onSuccess: (result) => setPreview(result),
    onError: (error) => toast.error(error.message),
  })

  const apply = useMutation({
    mutationFn: (version: number) => applyLayout(version),
    onSuccess: () => {
      toast.success('Layout applied — rebalancing started')
      setApplyOpen(false)
      setPreview(null)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const revert = useMutation({
    mutationFn: revertLayout,
    onSuccess: () => {
      toast.success('Staged changes reverted')
      setPreview(null)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const skip = useMutation({
    mutationFn: (input: { version: number; allowMissingData: boolean }) =>
      skipDeadNodes(input),
    onSuccess: (result) => {
      toast.success(
        `Updated ${result.ackUpdated.length + result.syncUpdated.length} node tracker(s)`,
      )
      setSkipOpen(false)
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const data = layout.data
  const roles = data?.roles ?? []
  const staged = data?.stagedRoleChanges ?? []

  function selectNode(value: string) {
    setNodeId(value)
    const existing = roles.find((role) => role.id === value)
    if (existing) {
      setZone(existing.zone)
      setTags(existing.tags.join(', '))
      setCapacityGib(
        existing.capacity ? String(Math.round(existing.capacity / 1024 ** 3)) : '',
      )
    } else {
      setZone('dc1')
      setTags('')
      setCapacityGib('')
    }
  }

  function stageRole() {
    if (!nodeId) {
      toast.error('Choose a node first')
      return
    }
    const role: NodeRoleChange = {
      id: nodeId,
      zone: zone.trim() || 'dc1',
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      capacity: capacityGib.trim() ? Math.round(Number(capacityGib) * 1024 ** 3) : null,
    }
    stage.mutate({ roles: [role] })
  }

  if (layout.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (layout.isError || !data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm">
            {layout.error instanceof Error ? layout.error.message : 'Could not load layout.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => void layout.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {singleNode ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <p className="font-medium">Single-node mode</p>
              <p className="text-muted-foreground">
                Garage runs with <code>--single-node</code>, so it manages the layout
                automatically. Layout staging and apply are disabled to avoid breaking the
                cluster.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current layout</CardTitle>
          <CardDescription>
            Version {data.version} · partition size {formatBytes(data.partitionSize)} · zone
            redundancy {zoneRedundancyLabel(data.parameters.zoneRedundancy)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No roles assigned"
              description="No node has a role in the cluster layout yet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Stored parts</TableHead>
                  <TableHead>Usable</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-mono text-xs">
                      <span title={role.id}>{truncateMiddle(role.id, 10, 6)}</span>
                    </TableCell>
                    <TableCell>{role.zone}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatBytes(role.capacity)}</TableCell>
                    <TableCell>{role.storedPartitions ?? '—'}</TableCell>
                    <TableCell>{formatBytes(role.usableCapacity)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={singleNode || stage.isPending}
                        onClick={() => stage.mutate({ roles: [{ id: role.id, remove: true }] })}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
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
          <CardTitle>Staged changes</CardTitle>
          <CardDescription>
            These changes will produce layout version {data.version + 1}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {staged.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staged changes.</p>
          ) : (
            <ul className="space-y-2">
              {staged.map((change) => (
                <li
                  key={change.id}
                  className="flex flex-col gap-1 rounded-md border p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-mono text-xs">{truncateMiddle(change.id, 10, 6)}</span>
                  <span className="text-muted-foreground">
                    {change.remove
                      ? 'Remove node'
                      : `Zone ${change.zone} · tags [${change.tags?.join(', ') ?? ''}] · capacity ${
                          change.capacity ? formatBytes(change.capacity) : 'gateway'
                        }`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? 'Previewing…' : 'Preview changes'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={revert.isPending || staged.length === 0 || singleNode}
              onClick={() => revert.mutate()}
            >
              Revert staged
            </Button>
            <Button
              size="sm"
              disabled={staged.length === 0 || singleNode}
              onClick={() => setApplyOpen(true)}
            >
              Apply layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={singleNode}
              onClick={() => setSkipOpen(true)}
            >
              Skip dead nodes…
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview result</CardTitle>
          </CardHeader>
          <CardContent>
            {'error' in preview ? (
              <p className="text-sm text-destructive">{preview.error}</p>
            ) : (
              <div className="space-y-2">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                  {preview.message.join('\n')}
                </pre>
                <p className="text-sm">
                  New layout version {preview.newLayout.version} with{' '}
                  {preview.newLayout.roles.length} role(s).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!singleNode ? (
        <Card>
          <CardHeader>
            <CardTitle>Stage a role change</CardTitle>
            <CardDescription>
              Assign or update a node's role, then preview and apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No nodes available.</p>
            ) : (
              <NodeSelect nodes={nodes} value={nodeId} onChange={selectNode} />
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="layout-zone">Zone</Label>
                <Input
                  id="layout-zone"
                  value={zone}
                  onChange={(event) => setZone(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="layout-tags">Tags (comma separated)</Label>
                <Input
                  id="layout-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="default"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="layout-capacity">Capacity GiB (blank = gateway)</Label>
                <Input
                  id="layout-capacity"
                  type="number"
                  min="0"
                  value={capacityGib}
                  onChange={(event) => setCapacityGib(event.target.value)}
                  placeholder="452"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={stageRole} disabled={stage.isPending || !nodeId}>
                {stage.isPending ? 'Staging…' : 'Stage role change'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title={`Apply layout version ${data.version + 1}?`}
        description="Garage will compute a new partition assignment and move data between nodes. This can take a long time and is hard to undo."
        confirmLabel="Apply layout"
        pending={apply.isPending}
        onConfirm={() => apply.mutate(data.version + 1)}
      />

      <Dialog open={skipOpen} onOpenChange={setSkipOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip dead nodes</DialogTitle>
            <DialogDescription>
              Update the layout trackers of dead nodes to version {data.version}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="allow-missing">Allow missing data</Label>
              <p className="text-xs text-muted-foreground">
                Skip even without a data quorum. This can lose data.
              </p>
            </div>
            <Switch
              id="allow-missing"
              checked={allowMissingData}
              onCheckedChange={setAllowMissingData}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={skip.isPending}
              onClick={() => skip.mutate({ version: data.version, allowMissingData })}
            >
              {skip.isPending ? 'Working…' : 'Skip dead nodes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}