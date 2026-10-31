import { useQuery } from '@tanstack/react-query'

import { getClusterHealth, getClusterStatistics, getClusterStatus } from '@/api/cluster'
import { getSettings } from '@/api/settings'
import { queryKeys } from '@/keys/query-keys'

export function useClusterHealth() {
  return useQuery({
    queryKey: queryKeys.clusterHealth,
    queryFn: getClusterHealth,
    refetchInterval: 15_000,
  })
}

export function useClusterStatus() {
  return useQuery({
    queryKey: queryKeys.clusterStatus,
    queryFn: getClusterStatus,
    refetchInterval: 15_000,
  })
}

export function useClusterStatistics() {
  return useQuery({
    queryKey: queryKeys.clusterStatistics,
    queryFn: getClusterStatistics,
    refetchInterval: 30_000,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
    staleTime: 60_000,
  })
}