import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  clearSessionCookie,
  createSessionToken,
  requireSession,
  setSessionCookie,
} from '../_shared/sessions.ts'
import { getPool } from '../_shared/postgres.ts'
import { HttpError, readJsonObject, requireMethod, sendError, sendJson } from '../_shared/http.ts'
import { normalizeEmail, requireText } from '../_shared/validation.ts'
import { verifySecret } from '../_shared/passwords.ts'

type AdminLoginRow = {
  id: string
  email: string
  role: 'admin'
  status: string
  temporary_password_hash: string | null
  temporary_password_expires_at: string | null
  temporary_password_used_at: string | null
}

async function createAdminSession(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const payload = await readJsonObject(request)
  const email = normalizeEmail(requireText(payload, 'email', 'Email address'))
  const temporaryPassword = requireText(
    payload,
    'temporaryPassword',
    'Temporary password',
  )
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')

    const userResult = await client.query<AdminLoginRow>(
      `
        SELECT
          id,
          email,
          role,
          status,
          temporary_password_hash,
          temporary_password_expires_at::text AS temporary_password_expires_at,
          temporary_password_used_at::text AS temporary_password_used_at
        FROM user_accounts
        WHERE lower(email) = lower($1)
          AND role = 'admin'
        FOR UPDATE
      `,
      [email],
    )

    const admin = userResult.rows[0]

    if (!admin || !admin.temporary_password_hash) {
      throw new HttpError(401, 'Invalid Admin credentials.')
    }

    if (admin.temporary_password_used_at) {
      throw new HttpError(401, 'Temporary password has already been used.')
    }

    if (
      !admin.temporary_password_expires_at ||
      new Date(admin.temporary_password_expires_at).getTime() <= Date.now()
    ) {
      throw new HttpError(401, 'Temporary password has expired.')
    }

    const passwordMatches = await verifySecret(
      temporaryPassword,
      admin.temporary_password_hash,
    )

    if (!passwordMatches) {
      throw new HttpError(401, 'Invalid Admin credentials.')
    }

    const activatedResult = await client.query<AdminLoginRow>(
      `
        UPDATE user_accounts
        SET
          status = 'active',
          temporary_password_used_at = now(),
          activated_at = coalesce(activated_at, now()),
          updated_at = now()
        WHERE id = $1
          AND temporary_password_used_at IS NULL
        RETURNING id, email, role, status
      `,
      [admin.id],
    )

    const activatedAdmin = activatedResult.rows[0]

    if (!activatedAdmin) {
      throw new HttpError(401, 'Temporary password has already been used.')
    }

    const token = createSessionToken({
      role: 'admin',
      subject: activatedAdmin.id,
      email: activatedAdmin.email,
    })

    await client.query('COMMIT')

    setSessionCookie(response, 'admin', token)

    sendJson(response, 200, {
      session: {
        role: 'admin',
        email: activatedAdmin.email,
      },
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    requireMethod(request, response, ['GET', 'POST', 'DELETE'])

    if (request.method === 'POST') {
      await createAdminSession(request, response)
      return
    }

    if (request.method === 'DELETE') {
      clearSessionCookie(response, 'admin')
      sendJson(response, 200, { ok: true })
      return
    }

    const session = requireSession(request, 'admin')

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
