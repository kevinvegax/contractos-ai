import type { IncomingMessage, ServerResponse } from 'node:http'
import { getPool, sendJson } from './_lib/db.js'
import { requireSession } from './_lib/auth.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET' && request.method !== 'PATCH') { response.setHeader('allow', 'GET, PATCH'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  const user = await requireSession(request, response)
  if (!user) return
  const url = new URL(request.url ?? '/', 'http://localhost')
  const companyId = url.searchParams.get('company_id')
  if (!companyId || !uuidPattern.test(companyId)) { sendJson(response, 400, { error: 'A valid company_id is required' }); return }
  try {
    const admin = await getPool().query(`SELECT 1 FROM company_memberships WHERE company_id = $1::uuid AND user_id = $2::uuid AND role = 'admin' AND status = 'active'`, [companyId, user.id])
    if (!admin.rows[0]) { sendJson(response, 403, { error: 'Only active company administrators can manage users' }); return }
    if (request.method === 'GET') {
      const result = await getPool().query(`SELECT u.id, u.email, u.full_name, cm.role, cm.status, cm.created_at, cm.deactivated_at FROM users u JOIN company_memberships cm ON cm.user_id = u.id WHERE cm.company_id = $1::uuid ORDER BY CASE WHEN cm.status = 'active' THEN 0 ELSE 1 END, u.full_name`, [companyId])
      sendJson(response, 200, { users: result.rows }); return
    }
    const body = await new Promise<Record<string, unknown>>((resolve, reject) => { let raw = ''; request.on('data', (chunk) => { raw += chunk.toString() }); request.on('end', () => { try { resolve(JSON.parse(raw) as Record<string, unknown>) } catch { reject(new Error('Invalid JSON body')) } }); request.on('error', reject) })
    const userId = typeof body.user_id === 'string' ? body.user_id : ''
    const status = body.status === 'active' || body.status === 'inactive' ? body.status : ''
    if (!uuidPattern.test(userId) || !status) { sendJson(response, 400, { error: 'user_id and status (active or inactive) are required' }); return }
    if (userId === user.id) { sendJson(response, 400, { error: 'You cannot deactivate your own administrator account' }); return }
    const result = await getPool().query(`UPDATE company_memberships SET status = $1, deactivated_at = CASE WHEN $1 = 'inactive' THEN now() ELSE NULL END, deactivated_by = CASE WHEN $1 = 'inactive' THEN $2::uuid ELSE NULL END WHERE company_id = $3::uuid AND user_id = $4::uuid RETURNING user_id, status`, [status, user.id, companyId, userId])
    if (!result.rows[0]) { sendJson(response, 404, { error: 'Company user not found' }); return }
    if (status === 'inactive') await getPool().query(`DELETE FROM user_sessions WHERE user_id = $1 AND NOT EXISTS (SELECT 1 FROM company_memberships WHERE user_id = $1 AND status = 'active')`, [userId])
    sendJson(response, 200, { user: result.rows[0] })
  } catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to manage company users' }) }
}
