import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { getPool, readJson, sendJson, withUserContext } from './_lib/db.js'
import { requireSession, hashSessionToken } from './_lib/auth.js'
import { sendInvitationEmail } from './_lib/mailer.js'

function publicInvite(row: Record<string, unknown>) { return { id: row.id, email: row.email, expires_at: row.expires_at, created_at: row.created_at, status: 'pending' } }

function getAppUrl(request: IncomingMessage) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const host = request.headers['x-forwarded-host']?.toString() ?? request.headers.host
  const protocol = request.headers['x-forwarded-proto']?.toString() ?? 'http'
  if (!host) throw new Error('APP_URL is not configured and the request host is unavailable')
  return `${protocol}://${host}`
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (!['GET', 'POST', 'DELETE'].includes(request.method ?? '')) { response.setHeader('allow', 'GET, POST, DELETE'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  const user = await requireSession(request, response)
  if (!user) return
  const url = new URL(request.url ?? '/', 'http://localhost')
  const companyId = url.searchParams.get('company_id')
  if (!companyId) { sendJson(response, 400, { error: 'company_id is required' }); return }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    sendJson(response, 400, { error: 'company_id must be a valid workspace identifier' }); return
  }
  try {
    const membership = await getPool().query(`SELECT role FROM company_memberships WHERE company_id = $1::uuid AND user_id = $2::uuid`, [companyId, user.id])
    if (membership.rows[0]?.role !== 'admin') { sendJson(response, 403, { error: 'Only company administrators can manage invitations' }); return }
    if (request.method === 'GET') {
      const result = await getPool().query(`SELECT id, email, expires_at, created_at FROM company_invitations WHERE company_id = $1::uuid AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC`, [companyId])
      sendJson(response, 200, { invitations: result.rows.map(publicInvite) }); return
    }
    if (request.method === 'DELETE') {
      const invitationId = url.searchParams.get('id')
      if (!invitationId) { sendJson(response, 400, { error: 'Invitation id is required' }); return }
      const result = await getPool().query(`UPDATE company_invitations SET revoked_at = now() WHERE id = $1::uuid AND company_id = $2::uuid AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`, [invitationId, companyId])
      if (!result.rows[0]) { sendJson(response, 404, { error: 'Pending invitation not found' }); return }
      sendJson(response, 200, { revoked: true }); return
    }
    const body = await readJson(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { sendJson(response, 400, { error: 'Enter a valid email address' }); return }
    const token = randomBytes(32).toString('base64url')
    const result = await withUserContext(user.id, (client) => client.query(`INSERT INTO company_invitations (company_id, invited_by, email, token_hash) VALUES ($1::uuid, $2::uuid, $3, $4) RETURNING id, email, expires_at, created_at`, [companyId, user.id, email, hashSessionToken(token)]))
    const acceptanceUrl = `${getAppUrl(request)}/accept-invitation?token=${encodeURIComponent(token)}`
    try {
      const company = await getPool().query(`SELECT name FROM companies WHERE id = $1::uuid`, [companyId])
      await sendInvitationEmail(email, company.rows[0]?.name ?? 'your company', acceptanceUrl)
    } catch (error) {
      await getPool().query(`DELETE FROM company_invitations WHERE id = $1::uuid AND accepted_at IS NULL`, [result.rows[0].id])
      sendJson(response, 502, { error: error instanceof Error ? error.message : 'Unable to send invitation email' }); return
    }
    sendJson(response, 201, { invitation: publicInvite(result.rows[0]), delivered: true })
  } catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to manage invitation' }) }
}

