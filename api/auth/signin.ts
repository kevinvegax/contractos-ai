import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJson, sendJson, getPool } from '../_lib/db.js'
import { createSession, setSessionCookie, verifyPassword } from '../_lib/auth.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') { response.setHeader('allow', 'POST'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  try {
    const body = await readJson(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const result = await getPool().query(`SELECT id, email, full_name, password_hash FROM users WHERE lower(email) = $1`, [email])
    const user = result.rows[0]
    if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
      sendJson(response, 401, { error: 'Email or password is incorrect.' }); return
    }
    const token = await createSession(user.id)
    setSessionCookie(response, token)
    sendJson(response, 200, { user: { id: user.id, email: user.email, full_name: user.full_name }, expires_in: 60 * 60 * 8 })
  } catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unable to sign in' }) }
}
