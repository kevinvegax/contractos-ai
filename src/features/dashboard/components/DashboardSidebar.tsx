import type { AuthState } from '../../auth/types'
import type { Portal } from '../../../types/portal'

type DashboardSidebarProps = {
  activePortal: Portal
  superAdminAuth: AuthState
  adminAuth: AuthState
  onPortalChange: (portal: Portal) => void
}

export function DashboardSidebar({
  activePortal,
  superAdminAuth,
  adminAuth,
  onPortalChange,
}: DashboardSidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Contractors AI home">
        <img src="/favicon.svg" alt="" />
        <span>
          <strong>Contractors AI</strong>
          <small>Account control</small>
        </span>
      </a>

      <nav className="portal-tabs" aria-label="Portal selection">
        <button
          type="button"
          className={activePortal === 'super-admin' ? 'active' : ''}
          onClick={() => onPortalChange('super-admin')}
        >
          <span aria-hidden="true">SA</span>
          Super Admin
        </button>
        <button
          type="button"
          className={activePortal === 'admin' ? 'active' : ''}
          onClick={() => onPortalChange('admin')}
        >
          <span aria-hidden="true">A</span>
          Admin Portal
        </button>
      </nav>

      <div className="session-stack">
        <p>Super Admin</p>
        <strong>
          {superAdminAuth.status === 'signed_in'
            ? superAdminAuth.session.email
            : 'Signed out'}
        </strong>
        <p>Admin</p>
        <strong>
          {adminAuth.status === 'signed_in'
            ? adminAuth.session.email
            : 'Signed out'}
        </strong>
      </div>
    </aside>
  )
}
