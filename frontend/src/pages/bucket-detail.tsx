import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Folder,
  Globe,
  HardDrive,
  KeyRound,
  Package,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  addAlias,
  deleteBucket,
  removeAlias,
  setPermissions,
  updateBucket,
} from '@/api/buckets'
import type { PermissionInput } from '@/api/buckets'
import { deleteObject, objectDownloadUrl, uploadObjects } from '@/api/objects'
import type { Bucket } from '@/api/types'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { PermissionBadges } from '@/components/permission-badges'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBucket } from '@/hooks/use-buckets'
import { useSettings } from '@/hooks/use-cluster'
import { useKeys } from '@/hooks/use-keys'
import { useObjects } from '@/hooks/use-objects'
import { queryKeys } from '@/keys/query-keys'
import { formatBytes, formatDate, formatNumber } from '@/lib/format'

function OverviewTab({ bucket }: { bucket: Bucket }) {
  const unfinished =
    (bucket.unfinishedUploads ?? 0) + (bucket.unfinishedMultipartUploads ?? 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Objects" value={formatNumber(bucket.objects)} icon={Package} />
        <StatCard title="Total size" value={formatBytes(bucket.bytes)} icon={HardDrive} />
        <StatCard
          title="Unfinished uploads"
          value={formatNumber(unfinished)}
          icon={Upload}
        />
        <StatCard
          title="Keys with access"
          value={formatNumber(bucket.keys?.length ?? 0)}
          icon={KeyRound}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Bucket ID</p>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="break-all">{bucket.id}</span>
              <CopyButton value={bucket.id} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm">{formatDate(bucket.created)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Global aliases</p>
            <div className="flex flex-wrap gap-1">
              {bucket.globalAliases.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  None — add one in Settings
                </span>
              ) : (
                bucket.globalAliases.map((alias) => (
                  <Badge key={alias} variant="secondary" className="font-mono">
                    {alias}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Website</p>
            <p className="text-sm">{bucket.websiteAccess ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Quota</p>
            <p className="text-sm">
              {bucket.quotas?.maxSize ? formatBytes(bucket.quotas.maxSize) : 'Unlimited'}{' '}
              size ·{' '}
              {bucket.quotas?.maxObjects
                ? `${formatNumber(bucket.quotas.maxObjects)} objects`
                : 'unlimited objects'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ObjectsTab({ bucket }: { bucket: Bucket }) {
  const queryClient = useQueryClient()
  const [prefix, setPrefix] = useState('')
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const objectsQuery = useObjects(bucket.id, prefix)

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadObjects(bucket.id, files, prefix),
    onSuccess: (result) => {
      toast.success(
        `Uploaded ${result.uploaded.length} file${result.uploaded.length === 1 ? '' : 's'}`,
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.objects(bucket.id, prefix),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteObject(bucket.id, key),
    onSuccess: () => {
      toast.success('Object deleted')
      setDeleteKey(null)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.objects(bucket.id, prefix),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
    },
    onError: (error) => toast.error(error.message),
  })

  const folders = objectsQuery.data?.pages.flatMap((page) => page.folders) ?? []
  const objects = objectsQuery.data?.pages.flatMap((page) => page.objects) ?? []

  const segments = prefix.split('/').filter(Boolean)
  const crumbs: { label: string; value: string }[] = [
    { label: bucket.globalAliases[0] ?? 'bucket', value: '' },
  ]
  let accumulated = ''
  for (const segment of segments) {
    accumulated += `${segment}/`
    crumbs.push({ label: segment, value: accumulated })
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    uploadMutation.mutate(Array.from(fileList))
    if (fileInput.current) fileInput.current.value = ''
  }

  const isEmpty =
    !objectsQuery.isLoading && folders.length === 0 && objects.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1
            return (
              <span key={crumb.value || 'root'} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                ) : null}
                {last ? (
                  <span className="font-medium">{crumb.label}</span>
                ) : (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => setPrefix(crumb.value)}
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button
            size="sm"
            disabled={uploadMutation.isPending}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-3.5" />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload files'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {objectsQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ) : objectsQuery.isError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                {objectsQuery.error instanceof Error
                  ? objectsQuery.error.message
                  : 'Could not list objects.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void objectsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={Folder}
              title={prefix ? 'Empty folder' : 'Bucket is empty'}
              description="Upload files to see them here."
              action={
                <Button size="sm" onClick={() => fileInput.current?.click()}>
                  <Upload className="size-3.5" />
                  Upload files
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folders.map((folder) => (
                    <TableRow key={folder}>
                      <TableCell>
                        <button
                          type="button"
                          className="flex items-center gap-2 font-medium hover:underline"
                          onClick={() => setPrefix(folder)}
                        >
                          <Folder className="size-4 text-muted-foreground" />
                          {folder.slice(prefix.length)}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                  {objects.map((object) => (
                    <TableRow key={object.key}>
                      <TableCell
                        className="max-w-[28rem] truncate font-mono text-xs"
                        title={object.key}
                      >
                        {object.key.slice(prefix.length)}
                      </TableCell>
                      <TableCell>{formatBytes(object.size)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(object.lastModified)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            aria-label={`Download ${object.key}`}
                          >
                            <a href={objectDownloadUrl(bucket.id, object.key)}>
                              <Download className="size-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${object.key}`}
                            onClick={() => setDeleteKey(object.key)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {objectsQuery.hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={objectsQuery.isFetchingNextPage}
                    onClick={() => void objectsQuery.fetchNextPage()}
                  >
                    {objectsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteKey)}
        onOpenChange={(open) => {
          if (!open) setDeleteKey(null)
        }}
        title="Delete object?"
        description={`This permanently deletes ${deleteKey ?? 'the object'}.`}
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteKey) deleteMutation.mutate(deleteKey)
        }}
      />
    </div>
  )
}

function PermissionsTab({ bucket }: { bucket: Bucket }) {
  const queryClient = useQueryClient()
  const keys = useKeys()
  const [open, setOpen] = useState(false)
  const [accessKeyId, setAccessKeyId] = useState('')
  const [action, setAction] = useState<'allow' | 'deny'>('allow')
  const [read, setRead] = useState(true)
  const [write, setWrite] = useState(true)
  const [owner, setOwner] = useState(false)

  const mutation = useMutation({
    mutationFn: (input: PermissionInput) => setPermissions(bucket.id, input),
    onSuccess: () => {
      toast.success('Permissions updated')
      setOpen(false)
      setAccessKeyId('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.keys })
    },
    onError: (error) => toast.error(error.message),
  })

  const existing = bucket.keys ?? []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />
          Grant permission
        </Button>
      </div>

      <Card>
        <CardContent>
          {existing.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No keys have access"
              description="Grant an access key read, write or owner permissions on this bucket."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Access key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existing.map((key) => (
                  <TableRow key={key.accessKeyId}>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <Link to={`/keys/${key.accessKeyId}`} className="hover:underline">
                          {key.accessKeyId}
                        </Link>
                        <CopyButton value={key.accessKeyId} />
                      </div>
                    </TableCell>
                    <TableCell>{key.name || '—'}</TableCell>
                    <TableCell>
                      <PermissionBadges permissions={key.permissions} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            accessKeyId: key.accessKeyId,
                            action: 'deny',
                            read: true,
                            write: true,
                            owner: true,
                          })
                        }
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bucket permissions</DialogTitle>
            <DialogDescription>
              Choose an access key and the rights to grant or revoke.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Access key</Label>
              <Select value={accessKeyId} onValueChange={setAccessKeyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an access key" />
                </SelectTrigger>
                <SelectContent>
                  {(keys.data ?? []).map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.name ? `${key.name} — ${key.id}` : key.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select
                value={action}
                onValueChange={(value) =>
                  setAction(value === 'deny' ? 'deny' : 'allow')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              {[
                { id: 'perm-read', label: 'Read', checked: read, set: setRead },
                { id: 'perm-write', label: 'Write', checked: write, set: setWrite },
                {
                  id: 'perm-owner',
                  label: 'Owner (admin)',
                  checked: owner,
                  set: setOwner,
                },
              ].map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={entry.id}>{entry.label}</Label>
                  <Switch
                    id={entry.id}
                    checked={entry.checked}
                    onCheckedChange={entry.set}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!accessKeyId || mutation.isPending}
              onClick={() => mutation.mutate({ accessKeyId, action, read, write, owner })}
            >
              {mutation.isPending ? 'Saving…' : action === 'allow' ? 'Allow' : 'Deny'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WebsiteTab({ bucket }: { bucket: Bucket }) {
  const queryClient = useQueryClient()
  const settings = useSettings()
  const [enabled, setEnabled] = useState(Boolean(bucket.websiteAccess))
  const [indexDocument, setIndexDocument] = useState(
    bucket.websiteConfig?.indexDocument ?? 'index.html',
  )
  const [errorDocument, setErrorDocument] = useState(
    bucket.websiteConfig?.errorDocument ?? '',
  )

  const mutation = useMutation({
    mutationFn: () =>
      updateBucket(bucket.id, {
        websiteAccess: {
          enabled,
          indexDocument: indexDocument.trim() || 'index.html',
          errorDocument: errorDocument.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success('Website settings saved')
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.buckets })
    },
    onError: (error) => toast.error(error.message),
  })

  const alias = bucket.globalAliases[0]
  const domain = settings.data?.websiteDomain ?? 'web.garage.localhost'
  const url = alias ? `http://${alias}.${domain}:3902` : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Static website</CardTitle>
        <CardDescription>Serve bucket files anonymously on port 3902.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="website-enabled">Enable website access</Label>
            <p className="text-xs text-muted-foreground">
              Garage serves objects from this bucket at the host below.
            </p>
          </div>
          <Switch id="website-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="index-document">Index document</Label>
            <Input
              id="index-document"
              value={indexDocument}
              onChange={(event) => setIndexDocument(event.target.value)}
              placeholder="index.html"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="error-document">Error document (optional)</Label>
            <Input
              id="error-document"
              value={errorDocument}
              onChange={(event) => setErrorDocument(event.target.value)}
              placeholder="error.html"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <Globe className="size-3.5" />
              {url}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a global alias in Settings to get a public URL.
            </p>
          )}
          <Button
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : 'Save website settings'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Website requests are anonymous. Only publish content you intend to be public.
        </p>
      </CardContent>
    </Card>
  )
}

function SettingsTab({ bucket }: { bucket: Bucket }) {
  const queryClient = useQueryClient()
  const [maxSizeMb, setMaxSizeMb] = useState(
    bucket.quotas?.maxSize
      ? String(Math.round(bucket.quotas.maxSize / (1024 * 1024)))
      : '',
  )
  const [maxObjects, setMaxObjects] = useState(
    bucket.quotas?.maxObjects ? String(bucket.quotas.maxObjects) : '',
  )
  const [newAlias, setNewAlias] = useState('')

  const quotaMutation = useMutation({
    mutationFn: () => {
      const maxSize = maxSizeMb.trim() ? Number(maxSizeMb) * 1024 * 1024 : null
      const objectLimit = maxObjects.trim() ? Number(maxObjects) : null
      return updateBucket(bucket.id, { quotas: { maxSize, maxObjects: objectLimit } })
    },
    onSuccess: () => {
      toast.success('Quota saved')
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
    },
    onError: (error) => toast.error(error.message),
  })

  const addAliasMutation = useMutation({
    mutationFn: (alias: string) => addAlias(bucket.id, alias),
    onSuccess: () => {
      toast.success('Alias added')
      setNewAlias('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.buckets })
    },
    onError: (error) => toast.error(error.message),
  })

  const removeAliasMutation = useMutation({
    mutationFn: (alias: string) => removeAlias(bucket.id, alias),
    onSuccess: () => {
      toast.success('Alias removed')
      void queryClient.invalidateQueries({ queryKey: queryKeys.bucket(bucket.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.buckets })
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quotas</CardTitle>
          <CardDescription>Leave a field blank for no limit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quota-size">Max size (MB)</Label>
              <Input
                id="quota-size"
                type="number"
                min="0"
                value={maxSizeMb}
                onChange={(event) => setMaxSizeMb(event.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quota-objects">Max objects</Label>
              <Input
                id="quota-objects"
                type="number"
                min="0"
                value={maxObjects}
                onChange={(event) => setMaxObjects(event.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={quotaMutation.isPending}
              onClick={() => quotaMutation.mutate()}
            >
              {quotaMutation.isPending ? 'Saving…' : 'Save quotas'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global aliases</CardTitle>
          <CardDescription>
            S3 clients and the website address this bucket by alias, not by ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bucket.globalAliases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No aliases. Add one below.</p>
          ) : (
            <div className="space-y-2">
              {bucket.globalAliases.map((alias) => (
                <div
                  key={alias}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <span className="font-mono text-xs">{alias}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removeAliasMutation.isPending}
                    onClick={() => removeAliasMutation.mutate(alias)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newAlias}
              onChange={(event) => setNewAlias(event.target.value)}
              placeholder="new-alias"
            />
            <Button
              size="sm"
              disabled={!newAlias.trim() || addAliasMutation.isPending}
              onClick={() => addAliasMutation.mutate(newAlias.trim())}
            >
              <Plus className="size-3.5" />
              Add alias
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BucketDetailPage() {
  const { bucketId = '' } = useParams<{ bucketId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const bucket = useBucket(bucketId)

  const deleteMutation = useMutation({
    mutationFn: () => deleteBucket(bucketId),
    onSuccess: () => {
      toast.success('Bucket deleted')
      void queryClient.invalidateQueries({ queryKey: queryKeys.buckets })
      navigate('/buckets')
    },
    onError: (error) => toast.error(error.message),
  })

  if (bucket.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (bucket.isError || !bucket.data) {
    return (
      <div>
        <PageHeader title="Bucket" description="Could not load this bucket." />
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {bucket.error instanceof Error ? bucket.error.message : 'Unknown error'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void bucket.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = bucket.data
  const name = data.globalAliases[0] ?? data.id

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/buckets">
            <ArrowLeft className="size-3.5" />
            Buckets
          </Link>
        </Button>
      </div>

      <PageHeader
        title={name}
        description="Objects, permissions, website hosting and quotas for this bucket."
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete bucket
          </Button>
        }
      />

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="objects">Objects</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab bucket={data} />
        </TabsContent>
        <TabsContent value="objects">
          <ObjectsTab bucket={data} />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsTab bucket={data} />
        </TabsContent>
        <TabsContent value="website">
          <WebsiteTab bucket={data} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab bucket={data} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete bucket?"
        description={`This deletes ${name} and cannot be undone. Remove all objects first.`}
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}