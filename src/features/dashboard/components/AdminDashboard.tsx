import { AdminSignInForm } from '../../auth/components/AdminSignInForm'
import type { AdminAuthModel } from '../../auth/hooks/useAdminAuth'

type AdminDashboardProps = {
  auth: AdminAuthModel
}

export function AdminDashboard({ auth }: AdminDashboardProps) {
  return (
    <div className="portal-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Regular portal</p>
          <h1>Admin Portal</h1>
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
        <AdminSignInForm
          error={auth.auth.error}
          login={auth.login}
          setLogin={auth.setLogin}
          onSubmit={auth.signIn}
        />
      )}

      {auth.auth.status === 'signed_in' && (
        <>
          <section className="metric-grid" aria-label="Admin status">
            <div className="metric-tile">
              <span>Signed in as</span>
              <strong>{auth.auth.session.email}</strong>
            </div>
            <div className="metric-tile">
              <span>Manager accounts</span>
              <strong>0</strong>
            </div>
            <div className="metric-tile">
              <span>Contractor accounts</span>
              <strong>0</strong>
            </div>
          </section>

          <div className="work-grid">
            <section className="workspace-panel">
              <div className="section-header horizontal">
                <div>
                  <p className="eyebrow">Managers</p>
                  <h2>Manager accounts</h2>
                </div>
                <button type="button" className="secondary-button">
                  New manager
                </button>
              </div>
              <p className="empty-state">No Manager accounts yet.</p>
            </section>

            <section className="workspace-panel">
              <div className="section-header horizontal">
                <div>
                  <p className="eyebrow">Contractors</p>
                  <h2>Contractor accounts</h2>
                </div>
                <button type="button" className="secondary-button">
                  New contractor
                </button>
              </div>
              <p className="empty-state">No Contractor accounts yet.</p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
