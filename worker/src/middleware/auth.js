// Constants

export const ACCESS_TOKEN_TTL = 60 * 15; // 15 minutes
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

// authMiddleware — verifies short-lived access token

export async function authMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload.type !== "access") throw new Error("Wrong token type");
    c.set("userId", payload.userId);
    c.set("userEmail", payload.email);
    await next();
  } catch (e) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

// JWT sign helpers

export async function signAccessJWT(payload, secret) {
  return signJWT({ ...payload, type: "access" }, secret, ACCESS_TOKEN_TTL);
}

export async function signRefreshJWT(payload, secret) {
  return signJWT({ ...payload, type: "refresh" }, secret, REFRESH_TOKEN_TTL);
}

// Core JWT helpers (Web Crypto - works in Workers)

export async function signJWT(payload, secret, ttlSeconds) {
  const header = { alg: "HS256", typ: "JWT" };

  const encode = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const now = Math.floor(Date.now() / 1000);

  const headerB64 = encode(header);
  const payloadB64 = encode({ ...payload, iat: now, exp: now + ttlSeconds });
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(signingInput),
  );

  if (!valid) throw new Error("Invalid signature");

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
  );

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

// Token hash - store SHA-256 hex in blacklist, never the raw token

export async function hashToken(token) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Refresh cookie helpers

export function setRefreshCookie(c, token) {
  // httpOnly + Secure + SameSite=None required for cross-origin cookies
  c.header(
    "Set-Cookie",
    `refresh_token=${token}; HttpOnly; Secure; SameSite=None; Path=/auth; Max-Age=${REFRESH_TOKEN_TTL}`,
  );
}

export function clearRefreshCookie(c) {
  c.header(
    "Set-Cookie",
    "refresh_token=; HttpOnly; Secure; SameSite=None; Path=/auth; Max-Age=0",
  );
}

export function getRefreshCookie(c) {
  const cookie = c.req.header("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  return match ? match[1] : null;
}