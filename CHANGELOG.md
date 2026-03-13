# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-03-13

Initial release.

### Added

- Create anonymous feedback pages with a custom slug, title, and question
- Public submission form with star rating (1–5) and optional written message
- Owner dashboard — list pages, view response counts, copy share link
- Responses view — full response list with average rating stats
- CSV export of all responses
- Edit and delete feedback pages
- Auth — register and login with email + password
- Two-token auth system — 15-minute access token in `localStorage`, 7-day refresh token in `httpOnly` cookie
- Silent token refresh on expiry with request deduplication
- Refresh token rotation — used tokens are immediately blacklisted by SHA-256 hash
- Lazy blacklist cleanup via `waitUntil` on each refresh call
- Spam prevention — Cloudflare Turnstile (bot check) + IP deduplication + browser fingerprint deduplication + cookie check
- Rate limiting — 5 req/min on login, 3 req/min on register, 10 req/min on response submission
- Wrangler D1 migration system with three migrations
- PBKDF2 password hashing — SHA-256, random salt, 100k iterations, Web Crypto API only