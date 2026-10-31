import { useQuery } from '@tanstack/react-query'

import { getKey, listKeys } from '@/api/keys'
import { queryKeys } from '@/keys/query-keys'

export function useKeys() {
  return useQuery({
    queryKey: queryKeys.keys,
    queryFn: listKeys,
  })
}

export function useKey(id: string, reveal = false) {
  return useQuery({
    queryKey: [...queryKeys.key(id), { reveal }],
    queryFn: () => getKey(id, reveal),
    enabled: Boolean(id),
  })
}