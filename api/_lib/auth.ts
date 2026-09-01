import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promisify } from 'node:util'
import { getPool, sendJson } from './db.js'

const scryptAsync = promisify(scrypt)
export const SESSION_COOKIE = 'northstar_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8

function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }

function parseCookies(request: IncomingMessage) {
  return Object.fromEntries((request.headers.cookie ?? '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=')
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
  }))
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex) return false
  const derived = await scryptAsync(password, salt, 64) as Buffer
  const expected = Buffer.from(expectedHex, 'hex')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  await getPool().query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '8 hours')`,
    [userId, tokenHash(token)],
  )
  return token
}

export function setSessionCookie(response: ServerResponse, token: string) {
  response.setHeader('set-cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
}

export function clearSessionCookie(response: ServerResponse) {
  response.setHeader('set-cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`)
}

export async function getSessionUser(request: IncomingMessage) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) return null
  const result = await getPool().query(
    `SELECT u.id, u.email, u.full_name FROM user_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()
       AND EXISTS (SELECT 1 FROM company_memberships cm WHERE cm.user_id = u.id AND cm.status = 'active')`, [tokenHash(token)])
  return result.rows[0] ?? null
}

export async function requireSession(request: IncomingMessage, response: ServerResponse) {
  const user = await getSessionUser(request)
  if (!user) { sendJson(response, 401, { error: 'Authentication required' }); return null }
  return user as { id: string; email: string; full_name: string }
}

export function getSessionToken(request: IncomingMessage) { return parseCookies(request)[SESSION_COOKIE] }
export function hashSessionToken(token: string) { return tokenHash(token) }
