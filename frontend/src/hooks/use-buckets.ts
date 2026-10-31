import { useQuery } from '@tanstack/react-query'

import { getBucket, listBuckets } from '@/api/buckets'
import { queryKeys } from '@/keys/query-keys'

export function useBuckets() {
  return useQuery({
    queryKey: queryKeys.buckets,
    queryFn: listBuckets,
    refetchInterval: 20_000,
  })
}

export function useBucket(id: string) {
  return useQuery({
    queryKey: queryKeys.bucket(id),
    queryFn: () => getBucket(id),
    enabled: Boolean(id),
    refetchInterval: 20_000,
  })
}