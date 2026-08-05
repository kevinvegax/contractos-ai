import type { AdminAuthModel } from '../../auth/hooks/useAdminAuth'
import { AdminDashboard } from './AdminDashboard'

type AdminPortalPageProps = {
  auth: AdminAuthModel
}

export function AdminPortalPage({ auth }: AdminPortalPageProps) {
  return <AdminDashboard auth={auth} />
}
