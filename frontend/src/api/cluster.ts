import { api } from './client'
import type {
  ApplyLayoutResult,
  BlockError,
  ClusterHealth,
  ClusterLayout,
  ClusterStatistics,
  ClusterStatus,
  LayoutParameters,
  LayoutPreview,
  MultiResponse,
  NodeInfoDetail,
  NodeRoleChange,
  NodeStatistics,
  RepairTypeValue,
  WorkerInfo,
} from './types'

const enc = encodeURIComponent

export const getClusterHealth = () => api.get<ClusterHealth>('/cluster/health')
export const getClusterStatus = () => api.get<ClusterStatus>('/cluster/status')
export const getClusterStatistics = () => api.get<ClusterStatistics>('/cluster/statistics')

// ---- Layout ----

export const getClusterLayout = () => api.get<ClusterLayout>('/cluster/layout')

export function stageLayoutChange(body: {
  roles?: NodeRoleChange[]
  parameters?: LayoutParameters
}) {
  return api.post<ClusterLayout>('/cluster/layout', body)
}

export const previewLayout = () => api.post<LayoutPreview>('/cluster/layout/preview')

export const applyLayout = (version: number) =>
  api.post<ApplyLayoutResult>('/cluster/layout/apply', { version })

export const revertLayout = () => api.post<ClusterLayout>('/cluster/layout/revert')

export function skipDeadNodes(input: { version: number; allowMissingData: boolean }) {
  return api.post<{ ackUpdated: string[]; syncUpdated: string[] }>(
    '/cluster/layout/skip-dead-nodes',
    input,
  )
}

// ---- Per-node operations ----

export const getNodeInfo = (nodeId: string) =>
  api.get<MultiResponse<NodeInfoDetail>>(`/cluster/nodes/${enc(nodeId)}`)

export const getNodeStatistics = (nodeId: string) =>
  api.get<MultiResponse<NodeStatistics>>(`/cluster/nodes/${enc(nodeId)}/statistics`)

export const createMetadataSnapshot = (nodeId: string) =>
  api.post<MultiResponse<null>>(`/cluster/nodes/${enc(nodeId)}/snapshot`, {})

export const launchRepair = (nodeId: string, repairType: RepairTypeValue) =>
  api.post<MultiResponse<null>>(`/cluster/nodes/${enc(nodeId)}/repair`, { repairType })

export const listWorkers = (
  nodeId: string,
  body: { busyOnly?: boolean; errorOnly?: boolean } = {},
) => api.post<MultiResponse<WorkerInfo[]>>(`/cluster/nodes/${enc(nodeId)}/workers`, body)

export const listBlockErrors = (nodeId: string) =>
  api.get<MultiResponse<BlockError[]>>(`/cluster/nodes/${enc(nodeId)}/block-errors`)