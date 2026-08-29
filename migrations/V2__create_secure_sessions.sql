ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions(expires_at);

-- Local-only account. The value is a scrypt hash; no plaintext password is stored.
UPDATE users
SET password_hash = 'northstar-local-salt:478e7ab403ab2ff6ae5ba082af79d0f7bfad7121b9ffc0d801a436a41f20025dc28410e989dc7417ec558dc1071804aaa09c839e268e2b915d610898d0d0f673'
WHERE id = '00000000-0000-0000-0000-000000000001' AND password_hash IS NULL;

DELETE FROM user_sessions WHERE expires_at < now();
