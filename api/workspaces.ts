import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJson, sendJson, withUserContext } from './_lib/db.js'
import { requireSession } from './_lib/auth.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const user = await requireSession(request, response)
    if (!user) return
    const userId = user.id
    if (request.method === 'POST') {
      const body = await readJson(request)
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
      if (name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        sendJson(response, 400, { error: 'Name and a valid slug are required' })
        return
      }
      const result = await withUserContext(userId, (client) => client.query(
        `WITH new_company AS (
          INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at
        ), membership AS (
          INSERT INTO company_memberships (company_id, user_id, role)
          SELECT id, $3::uuid, 'admin' FROM new_company
        ) SELECT * FROM new_company`, [name, slug, userId]))
      sendJson(response, 201, { workspace: result.rows[0] })
      return
    }

    const result = await withUserContext(userId, (client) => client.query(
      `SELECT c.id, c.name, c.slug, cm.role, c.created_at
       FROM companies c JOIN company_memberships cm ON cm.company_id = c.id
       WHERE cm.user_id = $1::uuid ORDER BY c.created_at`, [userId]))
    sendJson(response, 200, { workspaces: result.rows })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    sendJson(response, 500, { error: 'Unable to process workspace request', detail })
  }
}
