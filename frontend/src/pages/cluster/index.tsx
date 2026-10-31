import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClusterStatus, useSettings } from '@/hooks/use-cluster'

import { AdminTokensTab } from './admin-tokens-tab'
import { LayoutTab } from './layout-tab'
import { NodesTab } from './nodes-tab'
import { OperationsTab } from './operations-tab'

export default function ClusterPage() {
  const status = useClusterStatus()
  const settings = useSettings()
  const nodes = status.data?.nodes ?? []

  return (
    <div>
      <PageHeader
        title="Cluster"
        description="Nodes, layout and operational controls for the Garage cluster."
      />

      <Tabs defaultValue="nodes" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="tokens">Admin tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="nodes">
          <NodesTab nodes={nodes} loading={status.isLoading} />
        </TabsContent>
        <TabsContent value="layout">
          <LayoutTab nodes={nodes} singleNode={Boolean(settings.data?.singleNode)} />
        </TabsContent>
        <TabsContent value="operations">
          <OperationsTab nodes={nodes} />
        </TabsContent>
        <TabsContent value="tokens">
          <AdminTokensTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}