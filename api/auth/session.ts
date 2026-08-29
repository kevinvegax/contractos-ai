import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../_lib/db.js'
import { getSessionUser } from '../_lib/auth.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') { response.setHeader('allow', 'GET'); sendJson(response, 405, { error: 'Method not allowed' }); return }
  const user = await getSessionUser(request)
  if (!user) { sendJson(response, 401, { error: 'Authentication required' }); return }
  sendJson(response, 200, { user, expires_in: 60 * 60 * 8 })
}
