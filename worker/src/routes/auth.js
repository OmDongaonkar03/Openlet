// POST /auth/register  → issue access token + set refresh cookie
// POST /auth/login     → issue access token + set refresh cookie
// POST /auth/refresh   → rotate refresh token, issue new access token
// POST /auth/logout    → blacklist refresh token + clear cookie

import { Hono } from "hono";
import { rateLimit } from "@elithrar/workers-hono-rate-limit";
import {
  signAccessJWT,
  signRefreshJWT,
  verifyJWT,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  REFRESH_TOKEN_TTL,
} from "../middleware/auth.js";

const auth = new Hono();

// Password helpers (Web Crypto PBKDF2)

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, storedHash] = stored.split(":");
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)),
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex === storedHash;
}

// Shared: issue both tokens and set cookie

async function issueTokens(c, user) {
  const jwtPayload = { userId: user.id, email: user.email };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessJWT(jwtPayload, c.env.JWT_SECRET),
    signRefreshJWT(jwtPayload, c.env.JWT_SECRET),
  ]);

  setRefreshCookie(c, refreshToken);

  return {
    accessToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

// POST /auth/register

auth.post(
  "/register",
  (c, next) =>
    rateLimit(
      c.env.RL_REGISTER,
      (c) => c.req.header("CF-Connecting-IP") || "unknown",
    )(c, next),
  async (c) => {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "email, password and name are required" }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const existing = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?",
    )
      .bind(email.toLowerCase())
      .first();

    if (existing) return c.json({ error: "Email already registered" }, 409);

    const hashed = await hashPassword(password);

    const result = await c.env.DB.prepare(
      "INSERT INTO users (email, password, name) VALUES (?, ?, ?) RETURNING id",
    )
      .bind(email.toLowerCase(), hashed, name)
      .first();

    const { accessToken, user } = await issueTokens(c, {
      id: result.id,
      email: email.toLowerCase(),
      name,
    });

    return c.json({ accessToken, user }, 201);
  },
);

// POST /auth/login

auth.post(
  "/login",
  (c, next) =>
    rateLimit(
      c.env.RL_LOGIN,
      (c) => c.req.header("CF-Connecting-IP") || "unknown",
    )(c, next),
  async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "email and password are required" }, 400);
    }

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email.toLowerCase())
      .first();

    if (!user) return c.json({ error: "Invalid email or password" }, 401);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return c.json({ error: "Invalid email or password" }, 401);

    const { accessToken, user: userData } = await issueTokens(c, user);

    return c.json({ accessToken, user: userData });
  },
);

// POST /auth/refresh

auth.post("/refresh", async (c) => {
  const rawToken = getRefreshCookie(c);

  if (!rawToken) {
    return c.json({ error: "No refresh token" }, 401);
  }

  // 1. Verify JWT signature + expiry
  let payload;
  try {
    payload = await verifyJWT(rawToken, c.env.JWT_SECRET);
    if (payload.type !== "refresh") throw new Error("Wrong token type");
  } catch (e) {
    clearRefreshCookie(c);
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }

  // 2. Check blacklist
  const tokenHash = await hashToken(rawToken);
  const blacklisted = await c.env.DB.prepare(
    "SELECT 1 FROM refresh_token_blacklist WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first();

  if (blacklisted) {
    clearRefreshCookie(c);
    return c.json({ error: "Refresh token revoked" }, 401);
  }

  // 3. Blacklist the used token (rotation — one-time use)
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO refresh_token_blacklist (token_hash, expires_at) VALUES (?, ?)",
  )
    .bind(tokenHash, payload.exp)
    .run();

  // 4. Lazily clean up expired blacklist entries (best-effort)
  c.executionCtx.waitUntil(
    c.env.DB.prepare("DELETE FROM refresh_token_blacklist WHERE expires_at < ?")
      .bind(Math.floor(Date.now() / 1000))
      .run()
      .catch(() => {}),
  );

  // 5. Look up user (ensure they still exist)
  const user = await c.env.DB.prepare(
    "SELECT id, email, name FROM users WHERE id = ?",
  )
    .bind(payload.userId)
    .first();

  if (!user) {
    clearRefreshCookie(c);
    return c.json({ error: "User not found" }, 401);
  }

  // 6. Issue fresh token pair
  const { accessToken } = await issueTokens(c, user);

  return c.json({ accessToken });
});

// POST /auth/logout

auth.post("/logout", async (c) => {
  const rawToken = getRefreshCookie(c);

  if (rawToken) {
    try {
      const payload = await verifyJWT(rawToken, c.env.JWT_SECRET);
      const tokenHash = await hashToken(rawToken);

      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO refresh_token_blacklist (token_hash, expires_at) VALUES (?, ?)",
      )
        .bind(tokenHash, payload.exp)
        .run();
    } catch {
      // Token was already invalid - still clear the cookie
    }
  }

  clearRefreshCookie(c);
  return c.json({ success: true });
});

export default auth;