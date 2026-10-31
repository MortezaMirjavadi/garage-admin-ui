import { api } from './client'
import type { AdminTokenInfo, CreateAdminTokenResult } from './types'

const enc = encodeURIComponent

export function listAdminTokens() {
  return api.get<AdminTokenInfo[]>('/admin-tokens')
}

export function createAdminToken(input: {
  name: string
  expiration?: string
  neverExpires?: boolean
  scope?: string[]
}) {
  return api.post<CreateAdminTokenResult>('/admin-tokens', input)
}

export function deleteAdminToken(id: string) {
  return api.post<{ deleted: string }>(`/admin-tokens/${enc(id)}/delete`)
}