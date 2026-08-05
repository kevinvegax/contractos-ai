import { Navigate, Route, Routes } from 'react-router-dom'

import { useAdminAuth } from './features/auth/hooks/useAdminAuth'
import { useSuperAdminAuth } from './features/auth/hooks/useSuperAdminAuth'
import { AdminDashboard } from './features/dashboard/components/AdminDashboard'
import { DashboardSidebar } from './features/dashboard/components/DashboardSidebar'
import { SuperAdminDashboard } from './features/dashboard/components/SuperAdminDashboard'
import { useAdminAccounts } from './features/users/hooks/useAdminAccounts'

function App() {
  const adminAccounts = useAdminAccounts()
  const superAdminAuth = useSuperAdminAuth({
    afterSignIn: adminAccounts.loadAdmins,
    afterSignOut: adminAccounts.reset,
  })
  const adminAuth = useAdminAuth()

  return (
    <main className="app-shell">
      <DashboardSidebar
        superAdminAuth={superAdminAuth.auth}
        adminAuth={adminAuth.auth}
      />

      <section className="content-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route
            path="/super-admin"
            element={
              <SuperAdminDashboard
                auth={superAdminAuth}
                adminAccounts={adminAccounts}
              />
            }
          />
          <Route path="/admin" element={<AdminDashboard auth={adminAuth} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </section>
    </main>
  )
}

export default App
