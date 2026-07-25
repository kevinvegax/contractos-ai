import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  clearSessionCookie,
  createSessionToken,
  requireSession,
  setSessionCookie,
} from '../_shared/sessions.ts'
import { HttpError, readJsonObject, requireMethod, sendError, sendJson } from '../_shared/http.ts'
import { normalizeEmail, requireText } from '../_shared/validation.ts'
import { verifySecret } from '../_shared/passwords.ts'

function getBootstrapCredentials() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL
  const passwordHash = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD_HASH

  if (!email || !passwordHash) {
    throw new HttpError(
      503,
      'Bootstrap Super Admin credentials are not configured.',
    )
  }

  return {
    email: normalizeEmail(email),
    passwordHash,
  }
}

async function createBootstrapSession(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const payload = await readJsonObject(request)
  const email = normalizeEmail(requireText(payload, 'email', 'Email address'))
  const password = requireText(payload, 'password', 'Password')
  const bootstrap = getBootstrapCredentials()
  const passwordMatches = await verifySecret(password, bootstrap.passwordHash)

  if (email !== bootstrap.email || !passwordMatches) {
    throw new HttpError(401, 'Invalid Super Admin credentials.')
  }

  const token = createSessionToken({
    role: 'super_admin',
    subject: 'bootstrap-super-admin',
    email: bootstrap.email,
  })

  setSessionCookie(response, 'super_admin', token)

  sendJson(response, 200, {
    session: {
      role: 'super_admin',
      email: bootstrap.email,
    },
  })
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    requireMethod(request, response, ['GET', 'POST', 'DELETE'])

    if (request.method === 'POST') {
      await createBootstrapSession(request, response)
      return
    }

    if (request.method === 'DELETE') {
      clearSessionCookie(response, 'super_admin')
      sendJson(response, 200, { ok: true })
      return
    }

    const session = requireSession(request, 'super_admin')

    sendJson(response, 200, {
      session: {
        role: session.role,
        email: session.email,
      },
    })
  } catch (error) {
    sendError(response, error)
  }
}
