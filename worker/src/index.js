// src/index.js
// Openlet Worker — entry point

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth.js'
import pages from './routes/pages.js'
import responses from './routes/responses.js'

const app = new Hono()

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:8080',
      'http://localhost:5173',
      'https://openlet.pages.dev', // update to your CF Pages domain
    ]
    // return null for unknown origins — blocks them properly
    return allowed.includes(origin) ? origin : null
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/', (c) => c.json({ status: 'ok', service: 'openlet-worker' }))

// ── Routes ────────────────────────────────────────────────────────────────────

app.route('/auth', auth)
app.route('/pages', pages)
app.route('/responses', responses)

// ── 404 fallback ──────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Route not found' }, 404))

// ── Error handler ─────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
