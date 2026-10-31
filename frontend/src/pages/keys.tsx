import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createKey, deleteKey } from '@/api/keys'
import type { KeyInfo, KeyListItem } from '@/api/types'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
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
import { useKeys } from '@/hooks/use-keys'
import { queryKeys } from '@/keys/query-keys'
import { formatDate } from '@/lib/format'

const keySchema = z.object({
  name: z.string().max(64, 'Use at most 64 characters'),
  createBucket: z.boolean(),
})

type KeyForm = z.infer<typeof keySchema>

export default function KeysPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const keys = useKeys()

  const [createOpen, setCreateOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<KeyInfo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KeyListItem | null>(null)

  const form = useForm<KeyForm>({
    resolver: zodResolver(keySchema),
    defaultValues: { name: '', createBucket: false },
  })

  const createMutation = useMutation({
    mutationFn: createKey,
    onSuccess: (key) => {
      setCreateOpen(false)
      setCreatedKey(key)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.keys })
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteKey,
    onSuccess: () => {
      toast.success('Access key deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.keys })
    },
    onError: (error) => toast.error(error.message),
  })

  function onCreate(values: KeyForm) {
    createMutation.mutate({
      name: values.name.trim() || undefined,
      createBucket: values.createBucket,
    })
  }

  const items = keys.data ?? []

  return (
    <div>
      <PageHeader
        title="Access keys"
        description="S3 credentials and the buckets they can access."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Create key
          </Button>
        }
      />

      {keys.isError ? (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {keys.error instanceof Error ? keys.error.message : 'Could not load keys.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void keys.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          {keys.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No access keys"
              description="Create an access key to connect S3 clients to Garage."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  Create key
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Access key ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <Link to={`/keys/${key.id}`} className="hover:underline">
                          {key.id}
                        </Link>
                        <CopyButton value={key.id} label="Copy access key ID" />
                      </div>
                    </TableCell>
                    <TableCell>{key.name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(key.created)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.expiration ? formatDate(key.expiration) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {key.expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${key.id}`}
                        onClick={() => setDeleteTarget(key)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
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
          <form onSubmit={form.handleSubmit(onCreate)}>
            <DialogHeader>
              <DialogTitle>Create access key</DialogTitle>
              <DialogDescription>
                The secret key is shown only once, right after creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name (optional)</Label>
                <Input
                  id="key-name"
                  placeholder="backup-agent"
                  autoComplete="off"
                  {...form.register('name')}
                />
                {form.formState.errors.name ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="create-bucket">Allow creating buckets</Label>
                  <p className="text-xs text-muted-foreground">
                    Grants the createBucket administrative permission.
                  </p>
                </div>
                <Switch
                  id="create-bucket"
                  checked={form.watch('createBucket')}
                  onCheckedChange={(checked) =>
                    form.setValue('createBucket', checked)
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdKey)}
        onOpenChange={(open) => {
          if (!open) setCreatedKey(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Access key created</DialogTitle>
            <DialogDescription>
              Copy the secret now — Garage will not show it again.
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Access key ID</Label>
                <div className="flex items-center gap-1 rounded-md border p-2 font-mono text-xs">
                  <span className="break-all">{createdKey.accessKeyId}</span>
                  <CopyButton value={createdKey.accessKeyId} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Secret access key</Label>
                <div className="flex items-center gap-1 rounded-md border p-2 font-mono text-xs">
                  <span className="break-all">
                    {createdKey.secretAccessKey ?? '(not returned)'}
                  </span>
                  {createdKey.secretAccessKey ? (
                    <CopyButton value={createdKey.secretAccessKey} />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                const id = createdKey?.accessKeyId
                setCreatedKey(null)
                if (id) navigate(`/keys/${id}`)
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete access key?"
        description={`Clients using ${
          deleteTarget?.id ?? 'this key'
        } will lose access immediately.`}
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}