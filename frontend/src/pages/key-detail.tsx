import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { deleteKey } from '@/api/keys'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PermissionBadges } from '@/components/permission-badges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useKey } from '@/hooks/use-keys'
import { queryKeys } from '@/keys/query-keys'
import { formatDate } from '@/lib/format'

export default function KeyDetailPage() {
  const { keyId = '' } = useParams<{ keyId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [reveal, setReveal] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const key = useKey(keyId, reveal)

  const deleteMutation = useMutation({
    mutationFn: () => deleteKey(keyId),
    onSuccess: () => {
      toast.success('Access key deleted')
      void queryClient.invalidateQueries({ queryKey: queryKeys.keys })
      navigate('/keys')
    },
    onError: (error) => toast.error(error.message),
  })

  if (key.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (key.isError || !key.data) {
    return (
      <div>
        <PageHeader title="Access key" description="Could not load this access key." />
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {key.error instanceof Error ? key.error.message : 'Unknown error'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void key.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = key.data

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/keys">
            <ArrowLeft className="size-3.5" />
            Access keys
          </Link>
        </Button>
      </div>

      <PageHeader
        title={data.name || 'Access key'}
        description={`Created ${formatDate(data.created)} · ${data.expired ? 'expired' : 'active'}`}
        actions={
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" />
            Delete key
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Credentials
            </CardTitle>
            <CardDescription>S3 access key ID and secret.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Access key ID</p>
              <div className="flex items-center gap-1 rounded-md border p-2 font-mono text-xs">
                <span className="break-all">{data.accessKeyId}</span>
                <CopyButton value={data.accessKeyId} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Secret access key</p>
              <div className="flex items-center gap-1 rounded-md border p-2 font-mono text-xs">
                <span className="break-all">
                  {reveal ? (data.secretAccessKey ?? '(not returned)') : '••••••••••••••••••••••••'}
                </span>
                {reveal && data.secretAccessKey ? (
                  <CopyButton value={data.secretAccessKey} />
                ) : null}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={reveal ? 'Hide secret' : 'Reveal secret'}
                  onClick={() => setReveal((value) => !value)}
                >
                  {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Administrative rights and expiry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Create buckets</span>
              <Badge variant={data.permissions.createBucket ? 'secondary' : 'outline'}>
                {data.permissions.createBucket ? 'Allowed' : 'Denied'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{data.expiration ? formatDate(data.expiration) : 'Never'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={data.expired ? 'destructive' : 'outline'}
                className={
                  data.expired
                    ? ''
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                }
              >
                {data.expired ? 'Expired' : 'Active'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bucket access</CardTitle>
          <CardDescription>Buckets this key can read, write or administer.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.buckets.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No bucket permissions"
              description="Grant this key access from a bucket's Permissions tab."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.buckets.map((bucket) => (
                  <TableRow key={bucket.id}>
                    <TableCell>
                      <Link
                        to={`/buckets/${bucket.id}`}
                        className="font-medium hover:underline"
                      >
                        {bucket.globalAliases[0] ?? bucket.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <PermissionBadges permissions={bucket.permissions} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete access key?"
        description={`Clients using ${data.accessKeyId} will lose access immediately.`}
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}