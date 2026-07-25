import { useState } from 'react'

import { useAdminAuth } from './features/auth/hooks/useAdminAuth'
import { useSuperAdminAuth } from './features/auth/hooks/useSuperAdminAuth'
import { AdminDashboard } from './features/dashboard/components/AdminDashboard'
import { DashboardSidebar } from './features/dashboard/components/DashboardSidebar'
import { SuperAdminDashboard } from './features/dashboard/components/SuperAdminDashboard'
import { useAdminAccounts } from './features/users/hooks/useAdminAccounts'
import type { Portal } from './types/portal'

function App() {
  const [activePortal, setActivePortal] = useState<Portal>('super-admin')
  const adminAccounts = useAdminAccounts()
  const superAdminAuth = useSuperAdminAuth({
    afterSignIn: adminAccounts.loadAdmins,
    afterSignOut: adminAccounts.reset,
  })
  const adminAuth = useAdminAuth()

  return (
    <main className="app-shell">
      <DashboardSidebar
        activePortal={activePortal}
        superAdminAuth={superAdminAuth.auth}
        adminAuth={adminAuth.auth}
        onPortalChange={setActivePortal}
      />

      <section className="content-shell">
        {activePortal === 'super-admin' ? (
          <SuperAdminDashboard
            auth={superAdminAuth}
            adminAccounts={adminAccounts}
          />
        ) : (
          <AdminDashboard auth={adminAuth} />
        )}
      </section>
    </main>
  )
}

export default App
