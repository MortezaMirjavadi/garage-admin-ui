import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createAdminToken, deleteAdminToken } from '@/api/admin-tokens'
import type { AdminTokenInfo, CreateAdminTokenResult } from '@/api/types'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useAdminTokens } from '@/hooks/use-admin-panel'
import { queryKeys } from '@/keys/query-keys'
import { formatDate } from '@/lib/format'

function scopeSummary(scope: string[]): string {
  if (scope.includes('*')) return 'Full access (*)'
  if (scope.length <= 2) return scope.join(', ')
  return `${scope.slice(0, 2).join(', ')} +${scope.length - 2}`
}

export function AdminTokensTab() {
  const queryClient = useQueryClient()
  const tokens = useAdminTokens()

  const [createOpen, setCreateOpen] = useState(false)
  const [created, setCreated] = useState<CreateAdminTokenResult | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminTokenInfo | null>(null)

  const [name, setName] = useState('')
  const [neverExpires, setNeverExpires] = useState(true)
  const [expiration, setExpiration] = useState('')
  const [fullAccess, setFullAccess] = useState(true)
  const [scopes, setScopes] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminToken({
        name: name.trim(),
        scope: fullAccess
          ? ['*']
          : scopes
              .split(',')
              .map((scope) => scope.trim())
              .filter(Boolean),
        neverExpires,
        expiration:
          !neverExpires && expiration ? new Date(expiration).toISOString() : undefined,
      }),
    onSuccess: (result) => {
      setCreateOpen(false)
      setCreated(result)
      setName('')
      setScopes('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminTokens })
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminToken(id),
    onSuccess: () => {
      toast.success('Admin token deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminTokens })
    },
    onError: (error) => toast.error(error.message),
  })

  const items = tokens.data ?? []
  const canCreate = name.trim().length > 0 && (fullAccess || scopes.trim().length > 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Create token
        </Button>
      </div>

      <Card>
        <CardContent>
          {tokens.isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No admin tokens"
              description="Create a scoped token for automation or another UI."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((token, index) => (
                  <TableRow key={token.id ?? `master-${index}`}>
                    <TableCell className="font-mono text-xs">
                      {token.id ? (
                        <div className="flex items-center gap-1">
                          <span>{token.id}</span>
                          <CopyButton value={token.id} />
                        </div>
                      ) : (
                        <Badge variant="outline">Built-in</Badge>
                      )}
                    </TableCell>
                    <TableCell>{token.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(token.created)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {token.expiration ? formatDate(token.expiration) : 'Never'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {scopeSummary(token.scope)}
                    </TableCell>
                    <TableCell className="text-right">
                      {token.id ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${token.name}`}
                          onClick={() => setDeleteTarget(token)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create admin token</DialogTitle>
            <DialogDescription>
              The bearer token is shown only once. Scope it to the endpoints it needs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="ci-deploy"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <Label htmlFor="never-expires">Never expires</Label>
              <Switch
                id="never-expires"
                checked={neverExpires}
                onCheckedChange={setNeverExpires}
              />
            </div>

            {!neverExpires ? (
              <div className="space-y-1.5">
                <Label htmlFor="token-expiration">Expiration</Label>
                <Input
                  id="token-expiration"
                  type="datetime-local"
                  value={expiration}
                  onChange={(event) => setExpiration(event.target.value)}
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="full-access">Full access (*)</Label>
                <p className="text-xs text-muted-foreground">
                  Grant every admin endpoint. Turn off to choose scopes.
                </p>
              </div>
              <Switch id="full-access" checked={fullAccess} onCheckedChange={setFullAccess} />
            </div>

            {!fullAccess ? (
              <div className="space-y-1.5">
                <Label htmlFor="token-scopes">Scopes (comma separated)</Label>
                <Input
                  id="token-scopes"
                  value={scopes}
                  onChange={(event) => setScopes(event.target.value)}
                  placeholder="ListBuckets,GetBucketInfo,ListKeys"
                />
                <p className="text-xs text-muted-foreground">
                  Examples: GetClusterStatus, ListBuckets, CreateBucket, ListKeys,
                  CreateKey, AllowBucketKey, DenyBucketKey.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Creating…' : 'Create token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(created)}
        onOpenChange={(open) => {
          if (!open) setCreated(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin token created</DialogTitle>
            <DialogDescription>
              Copy the bearer token now — Garage will not show it again.
            </DialogDescription>
          </DialogHeader>
          {created ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Token ID</Label>
                <div className="flex items-center gap-1 rounded-md border p-2 font-mono text-xs">
                  <span className="break-all">{created.id}</span>
                  {created.id ? <CopyButton value={created.id} /> : null}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Bearer token</Label>
                <div className="flex items-center gap-1 rounded-md border p-2 font-mono text-xs">
                  <span className="break-all">{created.secretToken}</span>
                  <CopyButton value={created.secretToken} />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete admin token?"
        description={`Any client using ${deleteTarget?.name ?? 'this token'} will lose admin access immediately.`}
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget?.id) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}