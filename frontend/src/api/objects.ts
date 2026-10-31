import { api } from './client'
import type { ObjectListing } from './types'

const enc = encodeURIComponent

export type ObjectListParams = {
  prefix: string
  token?: string | null
}

export function listObjects(bucketId: string, params: ObjectListParams) {
  const query = new URLSearchParams()
  if (params.prefix) query.set('prefix', params.prefix)
  if (params.token) query.set('token', params.token)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return api.get<ObjectListing>(`/buckets/${enc(bucketId)}/objects${suffix}`)
}

export function uploadObjects(bucketId: string, files: File[], prefix: string) {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  if (prefix) form.append('prefix', prefix)
  return api.upload<{ uploaded: string[] }>(`/buckets/${enc(bucketId)}/objects`, form)
}

export function deleteObject(bucketId: string, key: string) {
  return api.delete<{ deleted: string }>(
    `/buckets/${enc(bucketId)}/objects?key=${enc(key)}`,
  )
}

export function objectDownloadUrl(bucketId: string, key: string) {
  return `/api/buckets/${enc(bucketId)}/objects/download?key=${enc(key)}`
}