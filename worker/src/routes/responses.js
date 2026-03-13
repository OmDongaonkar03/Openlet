// src/routes/responses.js
// POST /responses/:slug   → submit anonymous response (public)
// GET  /responses/:slug   → get all responses for a page (owner only)

import { Hono } from "hono";
import { verifyJWT } from "../middleware/auth.js";

const responses = new Hono();

// ── Turnstile verification ────────────────────────────────────────────────────

async function verifyTurnstile(token, secret, ip) {
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      // Cloudflare's siteverify endpoint only accepts form-encoded bodies, not JSON.
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );
  const data = await res.json();
  return data.success === true;
}

// ── POST /responses/:slug — anonymous submission ──────────────────────────────

responses.post("/:slug", async (c) => {
  const { slug } = c.req.param();
  const { message, rating, fingerprint, turnstileToken } = await c.req.json();

  // ── 1. Validate rating ────────────────────────────────────────────────────
  if (!rating) {
    return c.json({ error: "rating is required" }, 400);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return c.json({ error: "rating must be an integer between 1 and 5" }, 400);
  }

  const text = (message || "").trim();
  if (text.length > 2000) {
    return c.json({ error: "Message must be under 2000 characters" }, 400);
  }

  // ── 2. Turnstile verification ─────────────────────────────────────────────
  if (!turnstileToken) {
    return c.json(
      { error: "Bot check token missing. Please refresh and try again." },
      400,
    );
  }

  const ip = c.req.header("CF-Connecting-IP") || "unknown";

  const turnstileValid = await verifyTurnstile(
    turnstileToken,
    c.env.TURNSTILE_SECRET,
    ip,
  );

  if (!turnstileValid) {
    return c.json(
      { error: "Bot check failed. Please refresh and try again." },
      403,
    );
  }

  // ── 3. Look up page ───────────────────────────────────────────────────────
  const page = await c.env.DB.prepare("SELECT id FROM pages WHERE slug = ?")
    .bind(slug)
    .first();

  if (!page) {
    return c.json({ error: "Feedback page not found" }, 404);
  }

  // ── 4. Check IP duplicate ─────────────────────────────────────────────────
  if (ip !== "unknown") {
    const ipDupe = await c.env.DB.prepare(
      "SELECT id FROM submission_log WHERE page_id = ? AND ip = ?",
    )
      .bind(page.id, ip)
      .first();

    if (ipDupe) {
      return c.json({ error: "already_submitted" }, 429);
    }
  }

  // ── 5. Check fingerprint duplicate ───────────────────────────────────────
  if (fingerprint) {
    const fpDupe = await c.env.DB.prepare(
      "SELECT id FROM submission_log WHERE page_id = ? AND fingerprint = ?",
    )
      .bind(page.id, fingerprint)
      .first();

    if (fpDupe) {
      return c.json({ error: "already_submitted" }, 429);
    }
  }

  // ── 6. Insert response + log submission ───────────────────────────────────
  const result = await c.env.DB.prepare(
    `
      INSERT INTO responses (page_id, message, rating)
      VALUES (?, ?, ?)
      RETURNING id, created_at
    `,
  )
    .bind(page.id, text, rating)
    .first();

  // Log ip + fingerprint for future duplicate checks (best-effort, don't fail on error)
  try {
    await c.env.DB.prepare(
      `
        INSERT INTO submission_log (page_id, ip, fingerprint)
        VALUES (?, ?, ?)
      `,
    )
      .bind(page.id, ip, fingerprint || null)
      .run();
  } catch (e) {
    console.error("Failed to log submission:", e);
  }

  return c.json({ success: true, id: result.id }, 201);
});

// ── GET /responses/:slug — owner views all responses ─────────────────────────

responses.get("/:slug", async (c) => {
  const { slug } = c.req.param();

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let userId;
  try {
    const payload = await verifyJWT(authHeader.split(" ")[1], c.env.JWT_SECRET);
    userId = payload.userId;
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const page = await c.env.DB.prepare(
    "SELECT * FROM pages WHERE slug = ? AND user_id = ?",
  )
    .bind(slug, userId)
    .first();

  if (!page) {
    return c.json({ error: "Page not found or access denied" }, 404);
  }

  const { results } = await c.env.DB.prepare(
    `
      SELECT id, message, rating, created_at
      FROM responses
      WHERE page_id = ?
      ORDER BY created_at DESC
    `,
  )
    .bind(page.id)
    .all();

  const avgRating = results.length
    ? (results.reduce((sum, r) => sum + r.rating, 0) / results.length).toFixed(
        1,
      )
    : null;

  return c.json({
    page: {
      id: page.id,
      slug: page.slug,
      title: page.title,
      question: page.question,
    },
    stats: {
      total: results.length,
      avg_rating: avgRating ? parseFloat(avgRating) : null,
    },
    responses: results,
  });
});

export default responses;