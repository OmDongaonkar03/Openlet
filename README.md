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
| Hosting | Cloudflare Pages (frontend) + Workers (backend) |

---

## Project structure

```
openlet/
├── fe/                         # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx       # Login / Register
│   │   │   ├── Dashboard.tsx   # Your feedback pages
│   │   │   ├── Create.tsx      # Create a new page
│   │   │   ├── PublicPage.tsx  # Public submission form (/p/:slug)
│   │   │   └── Responses.tsx   # View responses (owner only)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Auth state + redirect logic
│   │   ├── lib/
│   │   │   └── api.ts          # All API calls
│   │   └── components/
│   │       └── ProtectedRoute.tsx
│   └── .env                    # VITE_API_URL
│
└── be/                         # Backend (Cloudflare Worker)
    ├── src/
    │   ├── index.js            # Hono app, CORS, route mounting
    │   ├── middleware/
    │   │   └── auth.js         # JWT sign/verify (Web Crypto), authMiddleware
    │   └── routes/
    │       ├── auth.js         # POST /auth/register, POST /auth/login
    │       ├── pages.js        # GET/POST /pages, GET /pages/:slug
    │       └── responses.js    # POST /responses/:slug, GET /responses/:slug
    ├── schema.sql
    ├── wrangler.toml
    └── .dev.vars               # Local secrets (gitignored)
```

---

## API

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | `{email, password, name}` → `{token, user}` |
| POST | `/auth/login` | — | `{email, password}` → `{token, user}` |
| GET | `/pages` | ✅ | List your pages with response counts |
| POST | `/pages` | ✅ | Create a page `{title, question, slug}` |
| GET | `/pages/:slug` | — | Public page info |
| GET | `/pages/:slug/check` | — | Slug availability check |
| POST | `/responses/:slug` | — | Submit `{rating, message}` anonymously |
| GET | `/responses/:slug` | ✅ | `{page, stats, responses[]}` — owner only |

---

## Local development

### Backend

```bash
cd be
npm install

# Create D1 database
npx wrangler d1 create openlet
# Copy the database_id printed above into wrangler.toml

# Create local secrets file
echo "JWT_SECRET=your_local_secret_here" > .dev.vars

# Apply schema
npx wrangler d1 execute openlet --local --file=./schema.sql

# Start dev server
npm run dev
# → http://localhost:8787
```

### Frontend

```bash
cd fe
npm install

# Set API URL
echo "VITE_API_URL=http://localhost:8787" > .env

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## Deploy

### 1. Deploy the worker

```bash
cd be
npm install

# Set JWT secret in Cloudflare (never put this in wrangler.toml)
npx wrangler secret put JWT_SECRET

# Apply schema to production DB
npx wrangler d1 execute openlet --remote --file=./schema.sql

# Deploy
npm run deploy
# → prints your worker URL: https://openlet-worker.<subdomain>.workers.dev
```

### 2. Update CORS

In `be/src/index.js`, add your Cloudflare Pages domain to the allowed origins list, then redeploy the worker.

### 3. Deploy the frontend

```bash
cd fe
npm install

# Update API URL to your live worker
echo "VITE_API_URL=https://openlet-worker.<subdomain>.workers.dev" > .env

npm run build
npx wrangler pages deploy dist --project-name=openlet
```

Or connect the repo to Cloudflare Pages via the dashboard with:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` = your worker URL

---

## Environment variables

### Backend

| Variable | Where | Description |
|---|---|---|
| `JWT_SECRET` | CF Secret (via `wrangler secret put`) | Signs and verifies JWTs. Never commit this. |

For local dev, put it in `be/.dev.vars` (already gitignored):
```
JWT_SECRET=your_local_secret_here
```

### Frontend

| Variable | Where | Description |
|---|---|---|
| `VITE_API_URL` | `.env` / CF Pages env | Base URL of the deployed worker |

---

## Database schema

```sql
users      → id, email, password (PBKDF2), name, created_at
pages      → id, user_id, slug (UNIQUE), title, question, created_at
responses  → id, page_id, message (nullable), rating (1–5), created_at
```

Passwords are hashed with PBKDF2 + SHA-256 + random salt, 100k iterations, using the Web Crypto API — no external dependencies.

JWTs are signed with HMAC-SHA256 and expire after 7 days.

---

## Roadmap

- [ ] Spam prevention — Cloudflare Turnstile + browser fingerprint + cookie
- [ ] Delete / edit feedback pages
- [ ] Email notifications on new response
- [ ] Response export to CSV
- [ ] Public responses toggle (opt-in per page)
- [ ] Shareable response count badge for bios and readmes