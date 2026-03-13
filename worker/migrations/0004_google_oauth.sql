-- Migration v4: Google OAuth
-- Removes password requirement, adds google_id
-- Run: npx wrangler d1 execute openlet --remote --file=./migrations/0004_google_oauth.sql

ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;

-- password is now nullable for OAuth-only users
-- SQLite doesn't support DROP NOT NULL, so we recreate the table

CREATE TABLE users_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL UNIQUE,
  password    TEXT,                          -- NULL for OAuth users
  name        TEXT    NOT NULL,
  google_id   TEXT    UNIQUE,
  avatar      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, email, password, name, created_at)
SELECT id, email, password, name, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);