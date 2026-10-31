import { api } from './client'
import type { KeyInfo, KeyListItem } from './types'

const enc = encodeURIComponent

export function listKeys() {
  return api.get<KeyListItem[]>('/keys')
}

export function getKey(id: string, reveal = false) {
  return api.get<KeyInfo>(`/keys/${enc(id)}${reveal ? '?reveal=true' : ''}`)
}

export function createKey(input: { name?: string; createBucket: boolean }) {
  return api.post<KeyInfo>('/keys', input)
}

export function deleteKey(id: string) {
  return api.delete<{ deleted: string }>(`/keys/${enc(id)}`)
}