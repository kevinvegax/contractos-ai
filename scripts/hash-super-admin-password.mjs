import { randomBytes, scryptSync } from 'node:crypto'
import { exit } from 'node:process'

const password = process.argv[2]
const keyLength = 64
const n = 16384
const r = 8
const p = 1
const maxmem = 64 * 1024 * 1024

if (!password || password.length < 12) {
  console.error('Usage: npm run security:hash-password -- "long random password"')
  console.error('Password must be at least 12 characters.')
  exit(1)
}

const salt = randomBytes(16).toString('base64url')
const hash = scryptSync(password, salt, keyLength, {
  N: n,
  r,
  p,
  maxmem,
}).toString('base64url')
const sessionSecret = randomBytes(32).toString('base64url')

console.log(`BOOTSTRAP_SUPER_ADMIN_PASSWORD_HASH=scrypt$${n}$${r}$${p}$${salt}$${hash}`)
console.log(`SESSION_SECRET=${sessionSecret}`)
