-- Add refresh token blacklist table
CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
  token_hash TEXT PRIMARY KEY,  -- SHA-256 hex of the raw refresh token
  expires_at INTEGER NOT NULL   -- unix timestamp; used for lazy cleanup
);

CREATE INDEX IF NOT EXISTS idx_rtb_expires_at ON refresh_token_blacklist (expires_at);