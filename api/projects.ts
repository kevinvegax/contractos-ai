import type { IncomingMessage, ServerResponse } from 'node:http'
import { getPool, readJson, sendJson, withCompanyContext } from './_lib/db.js'
import { requireSession } from './_lib/auth.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const projectStatuses = ['draft', 'active', 'on_hold', 'completed', 'archived'] as const

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PATCH') { response.setHeader('allow', 'GET, POST, PATCH'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  const user = await requireSession(request, response)
  if (!user) return
  const companyId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('company_id')
  if (!companyId || !uuidPattern.test(companyId)) { sendJson(response, 400, { error: 'A valid company_id is required' }); return }
  try {
    const membership = await getPool().query(`SELECT role FROM company_memberships WHERE company_id = $1::uuid AND user_id = $2::uuid AND status = 'active'`, [companyId, user.id])
    if (!membership.rows[0]) { sendJson(response, 403, { error: 'Workspace access denied' }); return }
    if (request.method !== 'GET' && !['admin', 'project_manager'].includes(membership.rows[0].role)) { sendJson(response, 403, { error: 'Only active company administrators or project managers can manage projects' }); return }
    const isAdmin = membership.rows[0].role === 'admin'
    const projectId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('id')
    if (request.method === 'GET') {
      if (!projectId || !uuidPattern.test(projectId)) { sendJson(response, 400, { error: 'A valid project id is required' }); return }
      const overview = await withCompanyContext(companyId, async (client) => {
        const [project, tasks, evidence] = await Promise.all([
          client.query(`SELECT id, name, description, objectives, start_date, due_date, requirements, status, created_at FROM projects WHERE id = $1::uuid`, [projectId]),
          client.query(`SELECT id, title, status, due_date, created_at FROM tasks WHERE project_id = $1::uuid ORDER BY CASE WHEN status = 'blocked' THEN 0 WHEN due_date < CURRENT_DATE AND status <> 'done' THEN 1 ELSE 2 END, due_date NULLS LAST, created_at DESC`, [projectId]),
          client.query(`SELECT id, name, storage_key, created_at FROM evidence_files WHERE project_id = $1::uuid ORDER BY created_at DESC`, [projectId]),
        ])
        if (!project.rows[0]) return null
        const taskRows = tasks.rows as Array<{ status: string; due_date: string | null }>
        const total = taskRows.length
        const completed = taskRows.filter((task) => task.status === 'done').length
        return { project: project.rows[0], tasks: tasks.rows, evidence: evidence.rows, metrics: { total_tasks: total, completed_tasks: completed, open_tasks: taskRows.filter((task) => task.status !== 'done').length, overdue_tasks: taskRows.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== 'done').length, blocked_tasks: taskRows.filter((task) => task.status === 'blocked').length, completion_percentage: total ? Math.round((completed / total) * 100) : 0 } }
      }, user.id)
      if (!overview) { sendJson(response, 404, { error: 'Project not found in this company workspace' }); return }
      sendJson(response, 200, overview); return
    }
    const body = await readJson(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const objectives = typeof body.objectives === 'string' ? body.objectives.trim() : ''
    const requirements = typeof body.requirements === 'string' ? body.requirements.trim() : ''
    const startDate = typeof body.start_date === 'string' && body.start_date ? body.start_date : null
    const dueDate = typeof body.due_date === 'string' && body.due_date ? body.due_date : null
    const status = typeof body.status === 'string' && projectStatuses.includes(body.status as typeof projectStatuses[number]) ? body.status : ''
    if (request.method === 'PATCH' && (!projectId || !uuidPattern.test(projectId))) { sendJson(response, 400, { error: 'A valid project id is required' }); return }
    if (name.length < 2) { sendJson(response, 400, { error: 'Project name must be at least 2 characters' }); return }
    if (!status) { sendJson(response, 400, { error: 'Choose Draft or Active' }); return }
    if ((startDate && !datePattern.test(startDate)) || (dueDate && !datePattern.test(dueDate))) { sendJson(response, 400, { error: 'Dates must use the YYYY-MM-DD format' }); return }
    if (startDate && dueDate && dueDate < startDate) { sendJson(response, 400, { error: 'Due date cannot be before the start date' }); return }
    const result = await withCompanyContext(companyId, async (client) => {
      if (request.method === 'PATCH') {
        const current = await client.query(`SELECT status FROM projects WHERE id = $1::uuid`, [projectId])
        if (!current.rows[0]) return null
        const currentStatus = current.rows[0].status as string
        if (currentStatus === 'archived' && status === 'archived') throw new Error('Archived projects are read-only. Restore the project before editing it.')
        if (currentStatus === 'archived' && !isAdmin) throw new Error('Only an administrator can restore an archived project')
        const updated = await client.query(
          `UPDATE projects SET name = $1, description = $2, objectives = $3, start_date = $4::date, due_date = $5::date, requirements = $6, status = $7
           WHERE id = $8::uuid RETURNING id, name, description, objectives, start_date, due_date, requirements, status, created_at`,
          [name, description, objectives, startDate, dueDate, requirements, status, projectId],
        )
        if (!updated.rows[0]) return null
        if (currentStatus !== status) await client.query(`INSERT INTO activity_records (company_id, actor_id, action, entity_type, entity_id) VALUES ($1::uuid, $2::uuid, $3, 'project', $4::uuid)`, [companyId, user.id, `Changed project status from ${currentStatus} to ${status}`, projectId])
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
  } catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to manage project' }) }
}
