import { Link, useLocation } from 'react-router-dom'

import type { AuthState } from '../../auth/types'

type DashboardSidebarProps = {
  superAdminAuth: AuthState
  adminAuth: AuthState
}

export function DashboardSidebar({
  superAdminAuth,
  adminAuth,
}: DashboardSidebarProps) {
  const { pathname } = useLocation()
  const isSuperAdminPortal = pathname.startsWith('/super-admin')
  const activeAuth = isSuperAdminPortal ? superAdminAuth : adminAuth
  const portalLabel = isSuperAdminPortal ? 'Super Admin' : 'Admin Portal'

  return (
    <aside className="sidebar">
      <Link
        className="brand"
        to={isSuperAdminPortal ? '/super-admin' : '/admin'}
        aria-label={`${portalLabel} home`}
      >
        <img src="/favicon.svg" alt="" />
        <span>
          <strong>Contractors AI</strong>
          <small>{portalLabel}</small>
        </span>
      </Link>

      <div className="session-stack">
        <p>{portalLabel}</p>
        <strong>
          {activeAuth.status === 'signed_in'
            ? activeAuth.session.email
            : 'Signed out'}
        </strong>
      </div>
    </aside>
  )
}
