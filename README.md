# Openlet

Anonymous feedback pages. Create a link, share it, get honest responses — no accounts required for respondents.

---

## What it is

Openlet lets anyone create a personal feedback page in 30 seconds. Share the link with your audience. They leave a star rating and an optional message. You read the responses. They stay completely anonymous.

No login, no app, no friction for the person giving feedback.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui |
| Backend | Cloudflare Workers + Hono.js |
| Database | Cloudflare D1 (SQLite) |
| Auth | JWT via Web Crypto API (no external deps) |
| Spam prevention | Cloudflare Turnstile + FingerprintJS + cookie |
| Hosting | Cloudflare Pages (frontend) + Workers (backend) |

---

## Project structure

```
openlet/
├── frontend/                       # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx           # Login / Register
│   │   │   ├── Dashboard.tsx       # Your feedback pages
│   │   │   ├── Create.tsx          # Create a new page
│   │   │   ├── PublicPage.tsx      # Public submission form (/p/:slug)
│   │   │   └── Responses.tsx       # View responses (owner only)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Auth state + bootstrap refresh on mount
│   │   ├── lib/
│   │   │   └── api.ts              # All API calls + silent token refresh
│   │   └── components/
│   │       └── ProtectedRoute.tsx
│   └── .env                        # VITE_API_URL, VITE_TURNSTILE_SITE_KEY
│
└── worker/                         # Cloudflare Worker + Hono.js
    ├── src/
    │   ├── index.js                # Hono app, CORS, route mounting
    │   ├── middleware/
    │   │   └── auth.js             # JWT sign/verify (Web Crypto), authMiddleware
    │   └── routes/
    │       ├── auth.js             # register, login, refresh, logout
    │       ├── pages.js            # GET/POST/PUT/DELETE /pages
    │       └── responses.js        # POST /responses/:slug, GET /responses/:slug
    ├── migrations/
    │   ├── 0001_initial_schema.sql  # users, pages, responses tables
    │   ├── 0002_spam_prevention.sql # submission_log table
    │   └── 0003_blacklist_token.sql # refresh_token_blacklist table
    ├── wrangler.toml
    └── .dev.vars                   # Local secrets (gitignored)
```

---

## API

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | `{email, password, name}` → `{accessToken, user}` + sets refresh cookie |
| POST | `/auth/login` | — | `{email, password}` → `{accessToken, user}` + sets refresh cookie |
| POST | `/auth/refresh` | — | Rotates refresh cookie → `{accessToken}` |
| POST | `/auth/logout` | — | Blacklists refresh token + clears cookie |
| GET | `/pages` | ✅ | List your pages with response counts |
| POST | `/pages` | ✅ | Create a page `{title, question, slug}` |
| GET | `/pages/:slug` | — | Public page info |
| GET | `/pages/:slug/check` | — | Slug availability check |
| PUT | `/pages/:slug` | ✅ | Update `{title, question}` |
| DELETE | `/pages/:slug` | ✅ | Delete page + all responses |
| POST | `/responses/:slug` | — | Submit `{rating, message, fingerprint, turnstileToken}` anonymously |
| GET | `/responses/:slug` | ✅ | `{page, stats, responses[]}` — owner only |

---

## Spam prevention

Every anonymous submission passes through three layers before being saved:

1. **Cookie** — checked instantly on page load. If the user has already submitted to this slug, the form is never shown. No server round-trip.
2. **Cloudflare Turnstile** — invisible bot challenge loaded in the form. Submit button is disabled until the token is issued. Token is verified server-side against CF's API before anything else runs.
3. **IP + Fingerprint** — after Turnstile passes, the worker checks `submission_log` for a matching `(page_id, ip)` or `(page_id, fingerprint)` pair. Either match blocks the submission with a `429`.

On success, the IP and fingerprint are written to `submission_log` for future checks.

---

## Local development

### Worker

```bash
cd worker
npm install

# Create D1 database
npx wrangler d1 create openlet
# Copy the database_id printed above into wrangler.toml

# Create local secrets file
cat > .dev.vars << EOF
JWT_SECRET=your_local_jwt_secret
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
EOF
# TURNSTILE_SECRET above is CF's official test key — always passes locally

# Apply all migrations
npx wrangler d1 migrations apply openlet --local

# Start dev server
npm run dev
# → http://localhost:8787
```

### Frontend

```bash
cd frontend
npm install

# Set env vars
cat > .env << EOF
VITE_API_URL=http://localhost:8787
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
EOF
# VITE_TURNSTILE_SITE_KEY above is CF's official test site key — always passes locally

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## Deploy

### 1. Create a Turnstile widget

Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add widget → add your domain → copy the **Site Key** and **Secret Key**.

### 2. Deploy the worker

```bash
cd worker
npm install

# Set secrets in Cloudflare
npx wrangler secret put JWT_SECRET
npx wrangler secret put TURNSTILE_SECRET

# Apply all migrations to production DB
npx wrangler d1 migrations apply openlet --remote

# Deploy
npm run deploy
# → prints your worker URL: https://openlet.<subdomain>.workers.dev
```

### 3. Update CORS

In `worker/src/index.js`, add your Cloudflare Pages domain to the allowed origins list, then redeploy the worker.

### 4. Deploy the frontend

```bash
cd frontend
npm install

# Update env vars with real production values
cat > .env << EOF
VITE_API_URL=https://openlet.<subdomain>.workers.dev
VITE_TURNSTILE_SITE_KEY=your_real_turnstile_site_key
EOF

npm run build
npx wrangler pages deploy dist --project-name=openlet
```

Or connect the repo to Cloudflare Pages via the dashboard with:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_API_URL` and `VITE_TURNSTILE_SITE_KEY`

---

## Environment variables

### Worker

| Variable | Where | Description |
|---|---|---|
| `JWT_SECRET` | CF Secret (`wrangler secret put`) | Signs and verifies JWTs. Never commit this. |
| `TURNSTILE_SECRET` | CF Secret (`wrangler secret put`) | Verifies Turnstile tokens server-side. Never commit this. |

For local dev, put both in `worker/.dev.vars` (already gitignored):
```
JWT_SECRET=your_local_jwt_secret
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
```

### Frontend

| Variable | Where | Description |
|---|---|---|
| `VITE_API_URL` | `.env` / CF Pages env | Base URL of the deployed worker |
| `VITE_TURNSTILE_SITE_KEY` | `.env` / CF Pages env | Public site key from Cloudflare Turnstile dashboard |

---

## Database schema

```sql
users                   → id, email, password (PBKDF2), name, created_at
pages                   → id, user_id, slug (UNIQUE), title, question, created_at
responses               → id, page_id, message (nullable), rating (1–5), created_at
submission_log          → id, page_id, ip, fingerprint, submitted_at
refresh_token_blacklist → token_hash (PK, SHA-256 hex), expires_at (unix timestamp)
```

Passwords are hashed with PBKDF2 + SHA-256 + random salt, 100k iterations, using the Web Crypto API — no external dependencies.

Auth uses a two-token system. A 15-minute access token is stored in `localStorage` and sent as a `Bearer` header on every request. A 7-day refresh token is stored in an `httpOnly; Secure; SameSite=None` cookie and only sent to `/auth/*` endpoints. On expiry the client silently calls `POST /auth/refresh` to rotate the pair. Used refresh tokens are immediately blacklisted by their SHA-256 hash so they cannot be reused. Blacklist entries are lazily cleaned up on each refresh call via `waitUntil`.

Migrations are managed via Wrangler's built-in D1 migration system under `worker/migrations/`.

---

## Roadmap

- [x] Spam prevention — Cloudflare Turnstile + browser fingerprint + cookie
- [x] Delete / edit feedback pages
- [x] Response export to CSV
- [x] Secure token management — httpOnly refresh cookie + access token rotation + blacklist
- [ ] Public responses toggle (opt-in per page)
- [ ] Shareable response count badge for bios and readmes