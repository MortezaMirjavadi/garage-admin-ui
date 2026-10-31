import { api } from './client'
import type { AppSettings } from './types'

export const getSettings = () => api.get<AppSettings>('/settings')