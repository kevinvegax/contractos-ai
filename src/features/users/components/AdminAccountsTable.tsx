import {
  formatAccountDate,
  getAdminStatusLabel,
} from '../../../utils/accountFormatters'
import type { AdminAccount, AdminsStatus } from '../types'

type AdminAccountsTableProps = {
  admins: AdminAccount[]
  status: AdminsStatus
  error: string | null
  onRefresh: () => Promise<void>
}

export function AdminAccountsTable({
  admins,
  status,
  error,
  onRefresh,
}: AdminAccountsTableProps) {
  return (
    <section className="workspace-panel">
      <div className="section-header horizontal">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>Admin accounts</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void onRefresh()}
          disabled={status === 'loading'}
        >
          Refresh
        </button>
      </div>

      {status === 'error' && error && <p className="status-text error">{error}</p>}

      {status === 'loading' && (
        <p className="status-text">Loading accounts...</p>
      )}

      {admins.length === 0 && status !== 'loading' ? (
        <p className="empty-state">No Admin accounts yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Temporary password</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    {admin.firstName} {admin.lastName}
                  </td>
                  <td>{admin.email}</td>
                  <td>
                    <span className={`chip ${admin.status}`}>
                      {getAdminStatusLabel(admin.status)}
                    </span>
                  </td>
                  <td>
                    {admin.temporaryPasswordUsedAt
                      ? `Used ${formatAccountDate(
                          admin.temporaryPasswordUsedAt,
                        )}`
                      : `Expires ${formatAccountDate(
                          admin.temporaryPasswordExpiresAt,
                        )}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
