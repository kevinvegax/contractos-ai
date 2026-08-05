import { Navigate, Route, Routes } from 'react-router-dom'

import { useAdminAuth } from './features/auth/hooks/useAdminAuth'
import { useSuperAdminAuth } from './features/auth/hooks/useSuperAdminAuth'
import { AdminPortalPage } from './features/dashboard/components/AdminPortalPage'
import { DashboardSidebar } from './features/dashboard/components/DashboardSidebar'
import { SuperAdminPortalPage } from './features/dashboard/components/SuperAdminPortalPage'
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
              <SuperAdminPortalPage
                auth={superAdminAuth}
                adminAccounts={adminAccounts}
              />
            }
          />
          <Route
            path="/admin"
            element={<AdminPortalPage auth={adminAuth} />}
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </section>
    </main>
  )
}

export default App
