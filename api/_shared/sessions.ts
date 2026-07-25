import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'

import { HttpError } from './http.ts'

export type SessionRole = 'super_admin' | 'admin'

export type SessionPayload = {
  role: SessionRole
  subject: string
  email: string
  expiresAt: string
}

const SESSION_COOKIE_NAMES: Record<SessionRole, string> = {
  super_admin: 'contractors_super_admin_session',
  admin: 'contractors_admin_session',
}

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ?? process.env.SUPER_ADMIN_SESSION_SECRET

  if (!secret || secret.length < 32) {
    throw new HttpError(500, 'Session secret is not configured securely.')
  }

  return secret
}

function getSessionMaxAgeSeconds() {
  const seconds = Number(process.env.SESSION_MAX_AGE_SECONDS ?? '28800')

  return Number.isFinite(seconds) && seconds > 0 ? seconds : 28800
}

function encodeJson(payload: unknown) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function sign(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url')
}

function verifySignature(value: string, signature: string) {
  const expected = Buffer.from(sign(value), 'base64url')
  const actual = Buffer.from(signature, 'base64url')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function createSessionToken(payload: Omit<SessionPayload, 'expiresAt'>) {
  const maxAgeSeconds = getSessionMaxAgeSeconds()
  const body = encodeJson({
    ...payload,
    expiresAt: new Date(Date.now() + maxAgeSeconds * 1000).toISOString(),
  })

  return `${body}.${sign(body)}`
}

function readCookie(request: IncomingMessage, name: string) {
  const cookieHeader = request.headers.cookie

  if (!cookieHeader) {
    return undefined
  }

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim())
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

function parseSessionToken(token: string, expectedRole: SessionRole) {
  const [body, signature] = token.split('.')

  if (!body || !signature || !verifySignature(body, signature)) {
    throw new HttpError(401, 'Session is invalid.')
  }

  let payload: SessionPayload | undefined

  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as
      | SessionPayload
      | undefined
  } catch {
    throw new HttpError(401, 'Session is invalid.')
  }

  if (!payload || payload.role !== expectedRole) {
    throw new HttpError(403, 'This portal is not available for this account.')
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new HttpError(401, 'Session has expired.')
  }

  return payload
}

export function requireSession(
  request: IncomingMessage,
  expectedRole: SessionRole,
) {
  const cookieName = SESSION_COOKIE_NAMES[expectedRole]
  const token = readCookie(request, cookieName)

  if (!token) {
    throw new HttpError(401, 'Sign in is required.')
  }

  return parseSessionToken(token, expectedRole)
}

export function setSessionCookie(
  response: ServerResponse,
  role: SessionRole,
  token: string,
) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const cookie = [
    `${SESSION_COOKIE_NAMES[role]}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${getSessionMaxAgeSeconds()}`,
    secure,
  ]
    .filter(Boolean)
    .join('; ')

  response.setHeader('set-cookie', cookie)
}

export function clearSessionCookie(response: ServerResponse, role: SessionRole) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const cookie = [
    `${SESSION_COOKIE_NAMES[role]}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
    secure,
  ]
    .filter(Boolean)
    .join('; ')

  response.setHeader('set-cookie', cookie)
}
