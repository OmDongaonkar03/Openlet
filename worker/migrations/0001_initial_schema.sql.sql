-- Openlet D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT    NOT NULL UNIQUE,
  title       TEXT    NOT NULL,
  question    TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS responses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  message     TEXT,   -- nullable: written feedback is optional
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_slug     ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_user     ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_page ON responses(page_id);
