import { api } from './client'
import type { Bucket } from './types'

const enc = encodeURIComponent

export function listBuckets() {
  return api.get<Bucket[]>('/buckets')
}

export function getBucket(id: string) {
  return api.get<Bucket>(`/buckets/${enc(id)}`)
}

export function createBucket(input: { globalAlias: string; grantServiceKey: boolean }) {
  return api.post<Bucket>('/buckets', input)
}

export function deleteBucket(id: string) {
  return api.delete<{ deleted: string }>(`/buckets/${enc(id)}`)
}

export type BucketUpdate = {
  websiteAccess?: {
    enabled: boolean
    indexDocument?: string | null
    errorDocument?: string | null
  }
  quotas?: {
    maxSize?: number | null
    maxObjects?: number | null
  }
}

export function updateBucket(id: string, body: BucketUpdate) {
  return api.patch<Bucket>(`/buckets/${enc(id)}`, body)
}

export type PermissionInput = {
  accessKeyId: string
  action: 'allow' | 'deny'
  read: boolean
  write: boolean
  owner: boolean
}

export function setPermissions(id: string, input: PermissionInput) {
  return api.post<Bucket>(`/buckets/${enc(id)}/permissions`, input)
}

export function addAlias(id: string, globalAlias: string) {
  return api.post<Bucket>(`/buckets/${enc(id)}/aliases`, { globalAlias })
}

export function removeAlias(id: string, globalAlias: string) {
  return api.delete<Bucket>(`/buckets/${enc(id)}/aliases?globalAlias=${enc(globalAlias)}`)
}