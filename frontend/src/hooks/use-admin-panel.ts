import { useQuery } from '@tanstack/react-query'

import {
  getClusterLayout,
  getNodeInfo,
  getNodeStatistics,
  listBlockErrors,
  listWorkers,
} from '@/api/cluster'
import { listAdminTokens } from '@/api/admin-tokens'
import { queryKeys } from '@/keys/query-keys'

export function useClusterLayout() {
  return useQuery({
    queryKey: queryKeys.clusterLayout,
    queryFn: getClusterLayout,
    refetchInterval: 20_000,
  })
}

export function useNodeInfo(nodeId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.nodeInfo(nodeId),
    queryFn: () => getNodeInfo(nodeId),
    enabled: enabled && Boolean(nodeId),
  })
}

export function useNodeStatistics(nodeId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.nodeStatistics(nodeId),
    queryFn: () => getNodeStatistics(nodeId),
    enabled: enabled && Boolean(nodeId),
  })
}

export function useWorkers(nodeId: string) {
  return useQuery({
    queryKey: queryKeys.workers(nodeId),
    queryFn: () => listWorkers(nodeId),
    enabled: Boolean(nodeId),
    refetchInterval: 10_000,
  })
}

export function useBlockErrors(nodeId: string) {
  return useQuery({
    queryKey: queryKeys.blockErrors(nodeId),
    queryFn: () => listBlockErrors(nodeId),
    enabled: Boolean(nodeId),
    refetchInterval: 30_000,
  })
}

export function useAdminTokens() {
  return useQuery({
    queryKey: queryKeys.adminTokens,
    queryFn: listAdminTokens,
  })
}