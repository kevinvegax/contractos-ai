import { SuperAdminSignInForm } from '../../auth/components/SuperAdminSignInForm'
import type { SuperAdminAuthModel } from '../../auth/hooks/useSuperAdminAuth'
import { AdminAccountsTable } from '../../users/components/AdminAccountsTable'
import { CreateAdminAccountForm } from '../../users/components/CreateAdminAccountForm'
import type { AdminAccountsModel } from '../../users/hooks/useAdminAccounts'

type SuperAdminDashboardProps = {
  auth: SuperAdminAuthModel
  adminAccounts: AdminAccountsModel
}

export function SuperAdminDashboard({
  auth,
  adminAccounts,
}: SuperAdminDashboardProps) {
  const adminCount = adminAccounts.admins.length
  const pendingAdminCount = adminAccounts.admins.filter(
    (admin) => admin.status === 'pending_activation',
  ).length

  return (
    <div className="portal-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Protected portal</p>
          <h1>Super Admin</h1>
        </div>
        {auth.auth.status === 'signed_in' && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => void auth.signOut()}
          >
            Sign out
          </button>
        )}
      </header>

      {auth.auth.status === 'checking' && (
        <section className="workspace-panel">
          <p className="status-text">Checking session...</p>
        </section>
      )}

      {auth.auth.status === 'signed_out' && (
        <SuperAdminSignInForm
          error={auth.auth.error}
          login={auth.login}
          setLogin={auth.setLogin}
          onSubmit={auth.signIn}
        />
      )}

      {auth.auth.status === 'signed_in' && (
        <>
          <section className="metric-grid" aria-label="Super Admin status">
            <div className="metric-tile">
              <span>Authorized as</span>
              <strong>{auth.auth.session.email}</strong>
            </div>
            <div className="metric-tile">
              <span>Admin accounts</span>
              <strong>{adminCount}</strong>
            </div>
            <div className="metric-tile">
              <span>Pending activation</span>
              <strong>{pendingAdminCount}</strong>
            </div>
          </section>

          <div className="work-grid">
            <CreateAdminAccountForm
              form={adminAccounts.form}
              errors={adminAccounts.formErrors}
              status={adminAccounts.createStatus}
              message={adminAccounts.createMessage}
              setForm={adminAccounts.setForm}
              onSubmit={adminAccounts.createAdmin}
            />

            <AdminAccountsTable
              admins={adminAccounts.admins}
              status={adminAccounts.adminsStatus}
              error={adminAccounts.adminsError}
              onRefresh={adminAccounts.loadAdmins}
            />
          </div>
        </>
      )}
    </div>
  )
}
