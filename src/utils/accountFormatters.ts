import type { AdminAccount } from '../features/users/types'

export function formatAccountDate(value: string | null) {
  if (!value) {
    return 'Not used'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getAdminStatusLabel(status: AdminAccount['status']) {
  return status === 'active' ? 'Active' : 'Pending activation'
}
