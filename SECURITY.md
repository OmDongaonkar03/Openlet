# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Openlet, please report it privately. **Do not open a public GitHub issue.**

Email: **officialom2006@gmail.com**  
Subject line: `[Openlet Security] <brief description>`

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof of concept
- Any relevant request/response payloads

You'll get a response within 48 hours. If the issue is confirmed, a fix will be prioritised and you'll be credited in the changelog unless you prefer otherwise.

---

## Scope

The following are in scope:

- Authentication bypass or token forgery
- Accessing another user's pages or responses
- Submitting responses that bypass spam prevention in a non-trivial way
- SQL injection or data exfiltration via the API
- Cross-site scripting (XSS) in the frontend
- Improper CORS configuration allowing credential leakage

The following are out of scope:

- Rate limit bypasses using distributed IPs (by design — see README)
- Cookie-based spam prevention bypasses (by design — see README)
- Cloudflare infrastructure issues (report directly to Cloudflare)
- Theoretical attacks with no practical exploit path

---

## Security design notes

**Authentication**
- Auth is handled via Google OAuth 2.0. No passwords are stored. The worker exchanges a short-lived authorization code for a Google access token, fetches the user's verified profile, and upserts the user by `google_id`.
- Access tokens are short-lived (15 minutes) and stored in `localStorage`.
- Refresh tokens are long-lived (7 days), stored in `httpOnly; Secure; SameSite=None` cookies, and never exposed to JavaScript.
- Refresh tokens are single-use. Each rotation immediately blacklists the previous token by its SHA-256 hash.
- Token type is verified on every protected endpoint — a refresh token cannot be used as an access token.

**Spam prevention**
- All anonymous submissions are verified server-side with Cloudflare Turnstile before any data is written.
- IP and browser fingerprint are checked against `submission_log` per page.
- Rate limiting is enforced at the Cloudflare edge on auth and submission endpoints.

**Data**
- Response submissions are fully anonymous. No personally identifiable information is stored alongside a response.
- IP addresses are stored in `submission_log` solely for duplicate submission prevention, not linked to response content.