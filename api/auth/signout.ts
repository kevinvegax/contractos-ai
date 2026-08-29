import type { IncomingMessage, ServerResponse } from 'node:http'
import { getPool, sendJson } from '../_lib/db.js'
import { clearSessionCookie, getSessionToken, hashSessionToken } from '../_lib/auth.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') { response.setHeader('allow', 'POST'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  const token = getSessionToken(request)
  if (token) await getPool().query('DELETE FROM user_sessions WHERE token_hash = $1', [hashSessionToken(token)])
  clearSessionCookie(response)
  sendJson(response, 200, { signed_out: true })
}
