import { apiRequest, postJson } from '../../lib/apiClient'
import type { SessionResponse } from './types'

export function getSuperAdminSession() {
  return apiRequest<SessionResponse>('/api/super-admin/session')
}

export function createSuperAdminSession(credentials: {
  email: string
  password: string
}) {
  return postJson<SessionResponse>('/api/super-admin/session', credentials)
}

export function destroySuperAdminSession() {
  return apiRequest<{ ok: boolean }>('/api/super-admin/session', {
    method: 'DELETE',
  })
}

export function getAdminSession() {
  return apiRequest<SessionResponse>('/api/admin/session')
}

export function createAdminSession(credentials: {
  email: string
  temporaryPassword: string
}) {
  return postJson<SessionResponse>('/api/admin/session', credentials)
}

export function destroyAdminSession() {
  return apiRequest<{ ok: boolean }>('/api/admin/session', {
    method: 'DELETE',
  })
}
