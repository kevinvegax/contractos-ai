import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson, withCompanyContext, withUserContext } from './_lib/db.js'
import { requireSession } from './_lib/auth.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  const url = new URL(request.url ?? '/', 'http://localhost')
  const companyId = url.searchParams.get('company_id')
  if (!companyId) { sendJson(response, 400, { error: 'company_id is required' }); return }

  try {
    const user = await requireSession(request, response)
    if (!user) return
    const userId = user.id
    const membership = await withUserContext(userId, (client) => client.query(
      `SELECT c.id, c.name, c.slug, cm.role, c.created_at
       FROM companies c JOIN company_memberships cm ON cm.company_id = c.id
       WHERE c.id = $1::uuid AND cm.user_id = $2::uuid AND cm.status = 'active'`, [companyId, userId]))
    if (!membership.rows[0]) { sendJson(response, 403, { error: 'Workspace access denied' }); return }
    const data = await withCompanyContext(companyId, async (client) => {
      const [projects, activity] = await Promise.all([
        client.query(`SELECT id, name, description, objectives, start_date, due_date, requirements, status, created_at FROM projects ORDER BY created_at DESC`),
        client.query(`SELECT action, entity_type, created_at FROM activity_records ORDER BY created_at DESC LIMIT 8`),
      ])
      return { projects: projects.rows, activity: activity.rows }
    }, userId)
    sendJson(response, 200, { workspace: membership.rows[0], ...data })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    sendJson(response, 500, { error: 'Unable to load workspace', detail })
  }
}
