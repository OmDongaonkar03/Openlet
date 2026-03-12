// src/routes/responses.js
// POST /responses/:slug   → submit anonymous response (public)
// GET  /responses/:slug   → get all responses for a page (owner only)

import { Hono } from 'hono'
import { verifyJWT } from '../middleware/auth.js' // removed unused authMiddleware import

const responses = new Hono()

// ── POST /responses/:slug — anonymous submission ──────────────────────────────

responses.post('/:slug', async (c) => {
  const { slug } = c.req.param()
  const { message, rating } = await c.req.json()

  if (!rating) {
    return c.json({ error: 'rating is required' }, 400)
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return c.json({ error: 'rating must be an integer between 1 and 5' }, 400)
  }

  const text = (message || '').trim()

  if (text.length > 2000) {
    return c.json({ error: 'Message must be under 2000 characters' }, 400)
  }

  const page = await c.env.DB
    .prepare('SELECT id FROM pages WHERE slug = ?')
    .bind(slug)
    .first()

  if (!page) {
    return c.json({ error: 'Feedback page not found' }, 404)
  }

  const result = await c.env.DB
    .prepare(`
      INSERT INTO responses (page_id, message, rating)
      VALUES (?, ?, ?)
      RETURNING id, created_at
    `)
    .bind(page.id, text, rating)
    .first()

  return c.json({ success: true, id: result.id }, 201)
})

// ── GET /responses/:slug — owner views all responses ─────────────────────────

responses.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  let userId
  try {
    const payload = await verifyJWT(authHeader.split(' ')[1], c.env.JWT_SECRET)
    userId = payload.userId
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const page = await c.env.DB
    .prepare('SELECT * FROM pages WHERE slug = ? AND user_id = ?')
    .bind(slug, userId)
    .first()

  if (!page) {
    return c.json({ error: 'Page not found or access denied' }, 404)
  }

  const { results } = await c.env.DB
    .prepare(`
      SELECT id, message, rating, created_at
      FROM responses
      WHERE page_id = ?
      ORDER BY created_at DESC
    `)
    .bind(page.id)
    .all()

  const avgRating = results.length
    ? (results.reduce((sum, r) => sum + r.rating, 0) / results.length).toFixed(1)
    : null

  return c.json({
    page: { id: page.id, slug: page.slug, title: page.title, question: page.question },
    stats: { total: results.length, avg_rating: avgRating ? parseFloat(avgRating) : null },
    responses: results,
  })
})

export default responses
