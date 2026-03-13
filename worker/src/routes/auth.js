// src/routes/auth.js
// POST /auth/google   → exchange Google auth code → issue tokens
// POST /auth/refresh  → rotate refresh token, issue new access token
// POST /auth/logout   → blacklist refresh token + clear cookie

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

// Google token exchange
// The frontend does the OAuth redirect and receives an authorization code.
// It sends that code here. We exchange it for an id_token, verify it with
// Google's tokeninfo endpoint, then upsert the user and issue our own JWTs.

async function exchangeGoogleCode(code, redirectUri, clientId, clientSecret) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || "Google token exchange failed");
  }

  return res.json(); // { access_token, id_token, ... }
}

async function getGoogleUserInfo(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch Google user info");

  return res.json(); // { id, email, name, picture, verified_email }
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
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
  };
}

// POST /auth/google

auth.post(
  "/google",
  (c, next) =>
    rateLimit(
      c.env.RL_REGISTER, // reuse register limiter: 3/min per IP
      (c) => c.req.header("CF-Connecting-IP") || "unknown",
    )(c, next),
  async (c) => {
    const { code, redirectUri } = await c.req.json();

    if (!code || !redirectUri) {
      return c.json({ error: "code and redirectUri are required" }, 400);
    }

    // 1. Exchange code for Google tokens
    let googleTokens;
    try {
      googleTokens = await exchangeGoogleCode(
        code,
        redirectUri,
        c.env.GOOGLE_CLIENT_ID,
        c.env.GOOGLE_CLIENT_SECRET,
      );
    } catch (e) {
      return c.json({ error: e.message || "Google auth failed" }, 400);
    }

    // 2. Get user info from Google
    let googleUser;
    try {
      googleUser = await getGoogleUserInfo(googleTokens.access_token);
    } catch (e) {
      return c.json({ error: "Failed to fetch Google profile" }, 400);
    }

    if (!googleUser.verified_email) {
      return c.json({ error: "Google account email is not verified" }, 400);
    }

    const { id: googleId, email, name, picture: avatar } = googleUser;

    // 3. Upsert user — find by google_id first, then by email (existing users)
    let user = await c.env.DB.prepare("SELECT * FROM users WHERE google_id = ?")
      .bind(googleId)
      .first();

    if (!user) {
      // Check if email already exists (user registered before OAuth was added)
      const byEmail = await c.env.DB.prepare(
        "SELECT * FROM users WHERE email = ?",
      )
        .bind(email.toLowerCase())
        .first();

      if (byEmail) {
        // Link Google account to existing user
        await c.env.DB.prepare(
          "UPDATE users SET google_id = ?, avatar = ? WHERE id = ?",
        )
          .bind(googleId, avatar, byEmail.id)
          .run();
        user = { ...byEmail, google_id: googleId, avatar };
      } else {
        // New user — create
        user = await c.env.DB.prepare(
          "INSERT INTO users (email, name, google_id, avatar) VALUES (?, ?, ?, ?) RETURNING *",
        )
          .bind(email.toLowerCase(), name, googleId, avatar)
          .first();
      }
    } else {
      // Refresh avatar in case it changed
      if (user.avatar !== avatar) {
        await c.env.DB.prepare("UPDATE users SET avatar = ? WHERE id = ?")
          .bind(avatar, user.id)
          .run();
        user = { ...user, avatar };
      }
    }

    // 4. Issue our own JWT pair
    const { accessToken, user: userData } = await issueTokens(c, user);

    return c.json({ accessToken, user: userData }, 200);
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
    "SELECT id, email, name, avatar FROM users WHERE id = ?",
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
