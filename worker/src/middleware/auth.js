// src/middleware/auth.js
// Verifies JWT and attaches userId to context

export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET)
    c.set('userId', payload.userId)
    c.set('userEmail', payload.email)
    await next()
  } catch (e) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

// ── JWT helpers (Web Crypto API — works in Workers) ──────────────────────────

const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }

  const encode = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const now = Math.floor(Date.now() / 1000)

  const headerB64  = encode(header)
  const payloadB64 = encode({
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS, // ← token expires in 7 days
  })
  const signingInput = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signingInput}.${sigB64}`
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')

  const [headerB64, payloadB64, sigB64] = parts
  const signingInput = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0)
  )

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(signingInput)
  )

  if (!valid) throw new Error('Invalid signature')

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
  )

  // ← check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}
