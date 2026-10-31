import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Database, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createBucket, deleteBucket } from '@/api/buckets'
import type { Bucket } from '@/api/types'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
import { useBuckets } from '@/hooks/use-buckets'
import { queryKeys } from '@/keys/query-keys'
import { formatBytes, formatDate, formatNumber } from '@/lib/format'

const bucketSchema = z.object({
  name: z
    .string()
    .min(3, 'Use at least 3 characters')
    .max(63, 'Use at most 63 characters')
    .regex(
      /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
      'Use lowercase letters, numbers, dots and hyphens only',
    ),
  grantServiceKey: z.boolean(),
})

type BucketForm = z.infer<typeof bucketSchema>

export default function BucketsPage() {
  const queryClient = useQueryClient()
  const buckets = useBuckets()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null)

  const form = useForm<BucketForm>({
    resolver: zodResolver(bucketSchema),
    defaultValues: { name: '', grantServiceKey: true },
  })

  const createMutation = useMutation({
    mutationFn: createBucket,
    onSuccess: (bucket) => {
      toast.success(`Bucket ${bucket.globalAliases?.[0] ?? ''} created`)
      setCreateOpen(false)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.buckets })
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBucket,
    onSuccess: () => {
      toast.success('Bucket deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.buckets })
    },
    onError: (error) => toast.error(error.message),
  })

  function onCreate(values: BucketForm) {
    createMutation.mutate({
      globalAlias: values.name.trim(),
      grantServiceKey: values.grantServiceKey,
    })
  }

  const items = buckets.data ?? []

  return (
    <div>
      <PageHeader
        title="Buckets"
        description="Create and manage S3 buckets, website hosting and quotas."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Create bucket
          </Button>
        }
      />

      {buckets.isError ? (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {buckets.error instanceof Error
                ? buckets.error.message
                : 'Could not load buckets.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void buckets.refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          {buckets.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No buckets yet"
              description="Create your first bucket to start storing objects."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  Create bucket
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Objects</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((bucket) => (
                  <TableRow key={bucket.id}>
                    <TableCell>
                      <Link
                        to={`/buckets/${bucket.id}`}
                        className="font-medium hover:underline"
                      >
                        {bucket.globalAliases[0] ?? bucket.id}
                      </Link>
                      {bucket.globalAliases.length > 1 ? (
                        <p className="text-xs text-muted-foreground">
                          +{bucket.globalAliases.length - 1} more alias
                          {bucket.globalAliases.length > 2 ? 'es' : ''}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(bucket.created)}
                    </TableCell>
                    <TableCell>{formatNumber(bucket.objects)}</TableCell>
                    <TableCell>{formatBytes(bucket.bytes)}</TableCell>
                    <TableCell>
                      {bucket.websiteAccess ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        >
                          Enabled
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${bucket.globalAliases[0] ?? bucket.id}`}
                        onClick={() => setDeleteTarget(bucket)}
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
              <DialogTitle>Create bucket</DialogTitle>
              <DialogDescription>
                Bucket names must be 3–63 characters of lowercase letters, numbers,
                dots or hyphens.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="bucket-name">Bucket name</Label>
                <Input
                  id="bucket-name"
                  placeholder="my-bucket"
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
                  <Label htmlFor="grant-service-key">Grant UI service key access</Label>
                  <p className="text-xs text-muted-foreground">
                    Adds read/write/owner permissions so you can browse objects
                    immediately.
                  </p>
                </div>
                <Switch
                  id="grant-service-key"
                  checked={form.watch('grantServiceKey')}
                  onCheckedChange={(checked) =>
                    form.setValue('grantServiceKey', checked)
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
                {createMutation.isPending ? 'Creating…' : 'Create bucket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete bucket?"
        description={`This deletes ${
          deleteTarget?.globalAliases[0] ?? 'the bucket'
        } and cannot be undone. Objects in the bucket must be removed first.`}
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}