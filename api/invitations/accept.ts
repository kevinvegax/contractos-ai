import type { IncomingMessage, ServerResponse } from 'node:http'
import { getPool, readJson, sendJson } from '../_lib/db.js'
import { createSession, hashPassword, hashSessionToken, setSessionCookie } from '../_lib/auth.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') { response.setHeader('allow', 'POST'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  try {
    const body = await readJson(request)
    const token = typeof body.token === 'string' ? body.token : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!token || fullName.length < 2 || password.length < 8) { sendJson(response, 400, { error: 'Token, name, and a password of at least 8 characters are required' }); return }
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      const invite = await client.query(`SELECT id, company_id, email FROM company_invitations WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() FOR UPDATE`, [hashSessionToken(token)])
      if (!invite.rows[0]) { await client.query('ROLLBACK'); sendJson(response, 400, { error: 'This invitation is invalid, expired, or has been revoked.' }); return }
      const invitation = invite.rows[0]
      const existing = await client.query(`SELECT id, email, full_name FROM users WHERE lower(email) = lower($1)`, [invitation.email])
      const user = existing.rows[0] ?? (await client.query(`INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, full_name`, [invitation.email, fullName, await hashPassword(password)])).rows[0]
      await client.query(`INSERT INTO company_memberships (company_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT (company_id, user_id) DO NOTHING`, [invitation.company_id, user.id])
      await client.query(`UPDATE company_invitations SET accepted_at = now() WHERE id = $1`, [invitation.id])
      await client.query('COMMIT')
      setSessionCookie(response, await createSession(user.id))
      sendJson(response, 200, { user: { id: user.id, email: user.email, full_name: user.full_name }, company_id: invitation.company_id })
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
  } catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to accept invitation' }) }
}
