import type { SuperAdminAuthModel } from '../../auth/hooks/useSuperAdminAuth'
import type { AdminAccountsModel } from '../../users/hooks/useAdminAccounts'
import { SuperAdminDashboard } from './SuperAdminDashboard'

type SuperAdminPortalPageProps = {
  auth: SuperAdminAuthModel
  adminAccounts: AdminAccountsModel
}

export function SuperAdminPortalPage({
  auth,
  adminAccounts,
}: SuperAdminPortalPageProps) {
  return <SuperAdminDashboard auth={auth} adminAccounts={adminAccounts} />
}
