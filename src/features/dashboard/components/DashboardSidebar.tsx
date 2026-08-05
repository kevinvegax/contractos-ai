import { NavLink } from 'react-router-dom'

import type { AuthState } from '../../auth/types'

type DashboardSidebarProps = {
  superAdminAuth: AuthState
  adminAuth: AuthState
}

export function DashboardSidebar({
  superAdminAuth,
  adminAuth,
}: DashboardSidebarProps) {
  return (
    <aside className="sidebar">
      <NavLink className="brand" to="/admin" aria-label="Contractors AI home">
        <img src="/favicon.svg" alt="" />
        <span>
          <strong>Contractors AI</strong>
          <small>Account control</small>
        </span>
      </NavLink>

      <nav className="portal-tabs" aria-label="Portal selection">
        <NavLink
          to="/super-admin"
          className={({ isActive }) => (isActive ? 'active' : undefined)}
        >
          <span aria-hidden="true">SA</span>
          Super Admin
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) => (isActive ? 'active' : undefined)}
        >
          <span aria-hidden="true">A</span>
          Admin Portal
        </NavLink>
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
