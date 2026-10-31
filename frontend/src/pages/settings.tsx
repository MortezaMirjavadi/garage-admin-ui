import type { ReactNode } from 'react'
import { Globe, Server, ShieldCheck } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSettings } from '@/hooks/use-cluster'

function SettingRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-xs break-all sm:text-right">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const settings = useSettings()

  if (settings.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (settings.isError || !settings.data) {
    return (
      <div>
        <PageHeader title="Settings" description="Connection details for this UI." />
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {settings.error instanceof Error
                ? settings.error.message
                : 'Could not load settings.'}
            </p>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => void settings.refetch()}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = settings.data

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Connection details used by the backend proxy."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4" />
              Garage connection
            </CardTitle>
            <CardDescription>
              The Flask backend talks to these endpoints. Tokens stay server-side.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow label="Admin API" value={data.adminUrl} />
            <SettingRow label="S3 endpoint" value={data.s3Endpoint} />
            <SettingRow label="S3 region" value={data.s3Region} />
            <SettingRow
              label="Service access key"
              value={
                <span className="inline-flex items-center gap-1">
                  {data.serviceAccessKey || '(not configured)'}
                  {data.serviceAccessKey ? (
                    <CopyButton value={data.serviceAccessKey} />
                  ) : null}
                </span>
              }
            />
            <SettingRow label="Max upload" value={`${data.maxUploadMb} MB`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-4" />
              Website hosting
            </CardTitle>
            <CardDescription>
              Buckets with website access enabled are served on port 3902.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Each bucket is published at a host built from its global alias:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {`http://<bucket-alias>.${data.websiteDomain}:3902/`}
            </pre>
            <p className="text-muted-foreground">
              Enable it from a bucket's <span className="font-medium">Website</span> tab,
              upload an <code>index.html</code>, then open the URL above.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Security notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This UI has no login and binds to <code>127.0.0.1</code>. Do not expose port
            5000 to a network you do not trust.
          </p>
          <p>
            The Garage admin token and the service secret key live in
            <code> backend/.env</code> and are never sent to the browser. The browser only
            sees the access key ID.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}