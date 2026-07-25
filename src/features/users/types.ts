export type AdminAccount = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'admin'
  status: 'pending_activation' | 'active'
  temporaryPasswordExpiresAt: string | null
  temporaryPasswordUsedAt: string | null
  createdAt: string
}

export type CreateAdminForm = {
  firstName: string
  lastName: string
  email: string
}

export type CreateAdminErrors = Partial<Record<keyof CreateAdminForm, string>>

export type AdminsStatus = 'idle' | 'loading' | 'ready' | 'error'

export type CreateAdminStatus = 'idle' | 'submitting' | 'success' | 'error'

export type AdminsResponse = {
  admins: AdminAccount[]
}

export type CreateAdminResponse = {
  admin: AdminAccount
  delivery: {
    method: string
    destination: string
    deliveredAt: string
  }
}

export const emptyCreateAdminForm: CreateAdminForm = {
  firstName: '',
  lastName: '',
  email: '',
}
