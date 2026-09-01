import type { IncomingMessage, ServerResponse } from 'node:http'
import { getPool, readJson, sendJson, withCompanyContext } from './_lib/db.js'
import { requireSession } from './_lib/auth.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST' && request.method !== 'PATCH') { response.setHeader('allow', 'POST, PATCH'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  const user = await requireSession(request, response)
  if (!user) return
  const companyId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('company_id')
  if (!companyId || !uuidPattern.test(companyId)) { sendJson(response, 400, { error: 'A valid company_id is required' }); return }
  try {
    const membership = await getPool().query(`SELECT 1 FROM company_memberships WHERE company_id = $1::uuid AND user_id = $2::uuid AND role IN ('admin', 'project_manager') AND status = 'active'`, [companyId, user.id])
    if (!membership.rows[0]) { sendJson(response, 403, { error: 'Only active company administrators or project managers can manage projects' }); return }
    const body = await readJson(request)
    const projectId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('id')
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const objectives = typeof body.objectives === 'string' ? body.objectives.trim() : ''
    const requirements = typeof body.requirements === 'string' ? body.requirements.trim() : ''
    const startDate = typeof body.start_date === 'string' && body.start_date ? body.start_date : null
    const dueDate = typeof body.due_date === 'string' && body.due_date ? body.due_date : null
    const status = body.status === 'draft' || body.status === 'active' ? body.status : ''
    if (request.method === 'PATCH' && (!projectId || !uuidPattern.test(projectId))) { sendJson(response, 400, { error: 'A valid project id is required' }); return }
    if (name.length < 2) { sendJson(response, 400, { error: 'Project name must be at least 2 characters' }); return }
    if (!status) { sendJson(response, 400, { error: 'Choose Draft or Active' }); return }
    if ((startDate && !datePattern.test(startDate)) || (dueDate && !datePattern.test(dueDate))) { sendJson(response, 400, { error: 'Dates must use the YYYY-MM-DD format' }); return }
    if (startDate && dueDate && dueDate < startDate) { sendJson(response, 400, { error: 'Due date cannot be before the start date' }); return }
    const result = await withCompanyContext(companyId, async (client) => {
      if (request.method === 'PATCH') {
        const updated = await client.query(
          `UPDATE projects SET name = $1, description = $2, objectives = $3, start_date = $4::date, due_date = $5::date, requirements = $6, status = $7
           WHERE id = $8::uuid RETURNING id, name, description, objectives, start_date, due_date, requirements, status, created_at`,
          [name, description, objectives, startDate, dueDate, requirements, status, projectId],
        )
        if (!updated.rows[0]) return null
        await client.query(`INSERT INTO activity_records (company_id, actor_id, action, entity_type, entity_id) VALUES ($1::uuid, $2::uuid, $3, 'project', $4::uuid)`, [companyId, user.id, 'Updated project details', projectId])
        return updated
      }
      return client.query(
        `INSERT INTO projects (company_id, name, description, objectives, start_date, due_date, requirements, status)
         VALUES ($1::uuid, $2, $3, $4, $5::date, $6::date, $7, $8)
         RETURNING id, name, description, objectives, start_date, due_date, requirements, status, created_at`,
        [companyId, name, description, objectives, startDate, dueDate, requirements, status],
      )
    }, user.id)
    if (!result) { sendJson(response, 404, { error: 'Project not found in this company workspace' }); return }
    sendJson(response, request.method === 'PATCH' ? 200 : 201, { project: result.rows[0] })
  } catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to create project' }) }
}
