import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import { HttpError } from './http.ts'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024

export async function hashSecret(secret: string) {
  const salt = randomBytes(16).toString('base64url')
  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEMORY,
  })) as Buffer

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt,
    derivedKey.toString('base64url'),
  ].join('$')
}

export async function verifySecret(secret: string, storedHash: string) {
  const [scheme, nRaw, rRaw, pRaw, salt, encodedHash] = storedHash.split('$')

  if (scheme !== 'scrypt' || !nRaw || !rRaw || !pRaw || !salt || !encodedHash) {
    throw new HttpError(500, 'Stored password hash is not supported.')
  }

  const n = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  const expected = Buffer.from(encodedHash, 'base64url')
  const actual = (await scrypt(secret, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: SCRYPT_MAX_MEMORY,
  })) as Buffer

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function generateTemporaryPassword() {
  return randomBytes(24).toString('base64url')
}

export function getTemporaryPasswordExpiresAt() {
  const minutes = Number(process.env.TEMPORARY_PASSWORD_TTL_MINUTES ?? '60')
  const ttlMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 60

  return new Date(Date.now() + ttlMinutes * 60 * 1000)
}
