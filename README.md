# Openlet — Worker

Anonymous feedback pages for anyone. Create a page, share a link, get honest responses.

This is the backend — a Cloudflare Worker built with Hono + D1 (SQLite).

---

## Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono v4
- **Database:** Cloudflare D1 (SQLite)
- **Auth:** JWT via Web Crypto API (no external deps)
- **Password hashing:** PBKDF2 (native, no bcrypt)

---

## Project Structure

```
worker/
├── src/
│   ├── index.js                 # Entry point, CORS, route mounting
│   ├── middleware/
│   │   └── auth.js              # JWT sign/verify + auth middleware
│   └── routes/
│       ├── auth.js              # Register + login
│       ├── pages.js             # Feedback page CRUD
│       └── responses.js         # Submit + view responses
├── schema.sql                   # D1 table definitions
├── wrangler.toml                # Cloudflare config
└── package.json
```

---

## Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — installed via npm
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the D1 database

```bash
npx wrangler d1 create openlet
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding       = "DB"
database_name = "openlet"
database_id   = "PASTE_YOUR_ID_HERE"   # ← here
```

### 3. Set your JWT secret

In `wrangler.toml`, replace the placeholder:

```toml
[vars]
JWT_SECRET = "replace-with-a-long-random-string"
```

> For production, use `wrangler secret put JWT_SECRET` instead of storing it in the toml.

### 4. Run the schema migration

```bash
npm run db:migrate:local
```

### 5. Start the dev server

```bash
npm run dev
```

Worker is now live at `http://localhost:8787`.

---

## API Reference

All requests/responses are JSON. Protected routes require:
```
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Login, returns JWT |

**Register body:**
```json
{ "email": "om@example.com", "password": "minimum8chars", "name": "Om" }
```

**Login body:**
```json
{ "email": "om@example.com", "password": "yourpassword" }
```

Both return:
```json
{ "token": "jwt...", "user": { "id": 1, "email": "...", "name": "..." } }
```

---

### Pages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pages` | ✅ | List all your pages |
| POST | `/pages` | ✅ | Create a new feedback page |
| GET | `/pages/:slug` | — | Get page info (public) |
| GET | `/pages/:slug/check` | — | Check if slug is available |

**Create page body:**
```json
{
  "title": "Roast my portfolio",
  "question": "What's the one thing you'd change about my portfolio?",
  "slug": "roast-my-portfolio"
}
```

Slug rules: 3–40 characters, lowercase letters, numbers, hyphens only.

**List pages response:**
```json
{
  "pages": [
    {
      "id": 1,
      "slug": "roast-my-portfolio",
      "title": "Roast my portfolio",
      "question": "What's the one thing...",
      "created_at": "2025-03-12 10:00:00",
      "response_count": 14
    }
  ]
}
```

---

### Responses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/responses/:slug` | — | Submit anonymous feedback (public) |
| GET | `/responses/:slug` | ✅ | View all responses (owner only) |

**Submit response body:**
```json
{ "message": "Your hero section copy is too vague.", "rating": 4 }
```

Rating must be an integer 1–5. Message max 2000 characters.

**View responses:**
```json
{
  "page": { "slug": "roast-my-portfolio", "title": "...", "question": "..." },
  "stats": { "total": 14, "avg_rating": 3.8 },
  "responses": [
    { "id": 5, "message": "...", "rating": 4, "created_at": "..." }
  ]
}
```

---

## Deployment

### 1. Push secrets to Cloudflare (don't commit JWT_SECRET)

```bash
npx wrangler secret put JWT_SECRET
```

### 2. Run schema on remote D1

```bash
npm run db:migrate:remote
```

### 3. Deploy

```bash
npm run deploy
```

Your worker is live at `https://openlet-worker.<your-subdomain>.workers.dev`.

---

## Frontend

The frontend (React + Vite + shadcn/ui) lives in `../frontend/`.

Set the API base URL in `frontend/.env`:

```
VITE_API_URL=http://localhost:8787       # local
VITE_API_URL=https://openlet-worker.xxx.workers.dev  # production
```

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `JWT_SECRET` | `wrangler.toml` / CF secret | Signs and verifies JWTs |
| `VITE_API_URL` | Frontend `.env` | Points frontend to the worker |

---

## Scripts

```bash
npm run dev                  # local dev server (localhost:8787)
npm run deploy               # deploy to Cloudflare
npm run db:create            # create D1 database
npm run db:migrate:local     # apply schema locally
npm run db:migrate:remote    # apply schema on production D1
```

---

## License

MIT