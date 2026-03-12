// src/routes/pages.js
// GET  /pages          → list owner's pages (protected)
// POST /pages          → create page (protected)
// GET  /pages/:slug    → get page info (public)

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const pages = new Hono()

// ── Slug validation ───────────────────────────────────────────────────────────

function isValidSlug(slug) {
  return /^[a-z0-9-]{3,40}$/.test(slug)
}

// ── GET /pages — list all pages for the logged-in user ───────────────────────

pages.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const { results } = await c.env.DB
    .prepare(`
      SELECT
        p.id,
        p.slug,
        p.title,
        p.question,
        p.created_at,
        COUNT(r.id) as response_count
      FROM pages p
      LEFT JOIN responses r ON r.page_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `)
    .bind(userId)
    .all()

  return c.json({ pages: results })
})

// ── POST /pages — create a new feedback page ─────────────────────────────────

pages.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { title, question, slug } = await c.req.json()

  if (!title || !question || !slug) {
    return c.json({ error: 'title, question and slug are required' }, 400)
  }

  if (!isValidSlug(slug)) {
    return c.json({
      error: 'Slug must be 3–40 characters, lowercase letters, numbers and hyphens only'
    }, 400)
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM pages WHERE slug = ?')
    .bind(slug)
    .first()

  if (existing) {
    return c.json({ error: 'This slug is already taken' }, 409)
  }

  const result = await c.env.DB
    .prepare(`
      INSERT INTO pages (user_id, slug, title, question)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `)
    .bind(userId, slug, title, question)
    .first()

  return c.json({ page: result }, 201)
})

// ── GET /pages/:slug — get page info publicly ─────────────────────────────────

pages.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  const page = await c.env.DB
    .prepare('SELECT id, slug, title, question, created_at FROM pages WHERE slug = ?')
    .bind(slug)
    .first()

  if (!page) {
    return c.json({ error: 'Page not found' }, 404)
  }

  return c.json({ page })
})

// ── GET /pages/:slug/check — check slug availability ─────────────────────────

pages.get('/:slug/check', async (c) => {
  const { slug } = c.req.param()

  if (!isValidSlug(slug)) {
    return c.json({ available: false, reason: 'Invalid slug format' })
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM pages WHERE slug = ?')
    .bind(slug)
    .first()

  return c.json({ available: !existing })
})

export default pages