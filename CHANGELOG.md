# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-03-13

Initial release.

### Added

- Create anonymous feedback pages with a custom slug, title, and question
- Public submission form with star rating (1–5) and optional written message
- Owner dashboard - list pages, view response counts, copy share link
- Responses view - full response list with average rating stats
- CSV export of all responses
- Edit and delete feedback pages
- Auth - Google OAuth only, no passwords. One click to sign in
- Two-token auth system - 15-minute access token in `localStorage`, 7-day refresh token in `httpOnly` cookie
- Silent token refresh on expiry with request deduplication
- Refresh token rotation - used tokens are immediately blacklisted by SHA-256 hash
- Lazy blacklist cleanup via `waitUntil` on each refresh call
- Spam prevention - Cloudflare Turnstile (bot check) + IP deduplication + browser fingerprint deduplication + cookie check
- Rate limiting - 3 req/min on auth, 10 req/min on response submission
- Wrangler D1 migration system with four migrations
- Cursor-based pagination on responses - 20 per page, load more on demand
- Responsive layout across all pages, mobile-first
- SEO - Open Graph, Twitter Card, JSON-LD structured data, favicons