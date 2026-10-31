import { useInfiniteQuery } from '@tanstack/react-query'

import { listObjects } from '@/api/objects'
import { queryKeys } from '@/keys/query-keys'

export function useObjects(bucketId: string, prefix: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.objects(bucketId, prefix),
    queryFn: ({ pageParam }) => listObjects(bucketId, { prefix, token: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken,
    enabled: Boolean(bucketId),
  })
}