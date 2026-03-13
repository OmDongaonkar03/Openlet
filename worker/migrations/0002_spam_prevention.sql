-- Migration v2: spam prevention
-- Run against production:
--   npx wrangler d1 execute openlet --remote --file=./schema_v2_migration.sql

CREATE TABLE IF NOT EXISTS submission_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id      INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  ip           TEXT    NOT NULL,
  fingerprint  TEXT,                        -- null if client didn't send one
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sublog_page_ip          ON submission_log(page_id, ip);
CREATE INDEX IF NOT EXISTS idx_sublog_page_fingerprint ON submission_log(page_id, fingerprint);
