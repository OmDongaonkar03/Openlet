// src/routes/auth.js
// POST /auth/register
// POST /auth/login

import { Hono } from 'hono'
import { signJWT } from '../middleware/auth.js'

const auth = new Hono()

// ── Hash helpers using Web Crypto ─────────────────────────────────────────────

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  )

  const hashHex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password, stored) {
  const [saltHex, storedHash] = stored.split(':')
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)))

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  )

  const hashHex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex === storedHash
}

// ── POST /auth/register ───────────────────────────────────────────────────────

auth.post('/register', async (c) => {
  const { email, password, name } = await c.req.json()

  if (!email || !password || !name) {
    return c.json({ error: 'email, password and name are required' }, 400)
  }

  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first()

  if (existing) {
    return c.json({ error: 'Email already registered' }, 409)
  }

  const hashed = await hashPassword(password)

  const result = await c.env.DB
    .prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?) RETURNING id')
    .bind(email.toLowerCase(), hashed, name)
    .first()

  const token = await signJWT(
    { userId: result.id, email: email.toLowerCase() },
    c.env.JWT_SECRET
  )

  return c.json({ token, user: { id: result.id, email: email.toLowerCase(), name } }, 201)
})

// ── POST /auth/login ──────────────────────────────────────────────────────────

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'email and password are required' }, 400)
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first()

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const valid = await verifyPassword(password, user.password)

  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const token = await signJWT(
    { userId: user.id, email: user.email },
    c.env.JWT_SECRET
  )

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name }
  })
})

export default auth