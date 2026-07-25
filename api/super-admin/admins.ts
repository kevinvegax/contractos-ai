import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'

import { deliverTemporaryPassword } from '../_shared/secure-delivery.ts'
import { generateTemporaryPassword, getTemporaryPasswordExpiresAt, hashSecret } from '../_shared/passwords.ts'
import { getPool } from '../_shared/postgres.ts'
import { HttpError, readJsonObject, requireMethod, sendError, sendJson } from '../_shared/http.ts'
import { normalizeEmail, requireText } from '../_shared/validation.ts'
import { requireSession } from '../_shared/sessions.ts'

type AdminAccountRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'admin'
  status: string
  temporary_password_expires_at: string | null
  temporary_password_used_at: string | null
  created_at: string
}

function serializeAdmin(row: AdminAccountRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    status: row.status,
    temporaryPasswordExpiresAt: row.temporary_password_expires_at,
    temporaryPasswordUsedAt: row.temporary_password_used_at,
    createdAt: row.created_at,
  }
}

async function listAdmins(response: ServerResponse) {
  const result = await getPool().query<AdminAccountRow>(`
    SELECT
      id,
      first_name,
      last_name,
      email,
      role,
      status,
      temporary_password_expires_at::text AS temporary_password_expires_at,
      temporary_password_used_at::text AS temporary_password_used_at,
      created_at::text AS created_at
    FROM user_accounts
    WHERE role = 'admin'
    ORDER BY created_at DESC
    LIMIT 25
  `)

  sendJson(response, 200, {
    admins: result.rows.map(serializeAdmin),
  })
}

async function createAdmin(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const payload = await readJsonObject(request)
  const firstName = requireText(payload, 'firstName', 'First name')
  const lastName = requireText(payload, 'lastName', 'Last name')
  const email = normalizeEmail(requireText(payload, 'email', 'Email address'))
  const temporaryPassword = generateTemporaryPassword()
  const temporaryPasswordHash = await hashSecret(temporaryPassword)
  const temporaryPasswordExpiresAt = getTemporaryPasswordExpiresAt()
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')

    const insertResult = await client.query<AdminAccountRow>(
      `
        INSERT INTO user_accounts (
          id,
          first_name,
          last_name,
          email,
          role,
          status,
          temporary_password_hash,
          temporary_password_expires_at
        )
        VALUES ($1, $2, $3, $4, 'admin', 'pending_activation', $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING
          id,
          first_name,
          last_name,
          email,
          role,
          status,
          temporary_password_expires_at::text AS temporary_password_expires_at,
          temporary_password_used_at::text AS temporary_password_used_at,
          created_at::text AS created_at
      `,
      [
        randomUUID(),
        firstName,
        lastName,
        email,
        temporaryPasswordHash,
        temporaryPasswordExpiresAt,
      ],
    )

    if (insertResult.rowCount === 0) {
      await client.query('ROLLBACK')
      throw new HttpError(409, 'An account with this email already exists.')
    }

    const admin = insertResult.rows[0]
    const delivery = await deliverTemporaryPassword({
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name,
      temporaryPassword,
      expiresAt: temporaryPasswordExpiresAt.toISOString(),
    })

    await client.query('COMMIT')

    sendJson(response, 201, {
      admin: serializeAdmin(admin),
      delivery,
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
    requireMethod(request, response, ['GET', 'POST'])
    requireSession(request, 'super_admin')

    if (request.method === 'POST') {
      await createAdmin(request, response)
      return
    }

    await listAdmins(response)
  } catch (error) {
    sendError(response, error)
  }
}
