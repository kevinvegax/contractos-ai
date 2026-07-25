import { apiRequest, postJson } from '../../lib/apiClient'
import type {
  AdminsResponse,
  CreateAdminForm,
  CreateAdminResponse,
} from './types'

export function listAdminAccounts() {
  return apiRequest<AdminsResponse>('/api/super-admin/admins')
}

export function createAdminAccount(form: CreateAdminForm) {
  return postJson<CreateAdminResponse>('/api/super-admin/admins', {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
  })
}
