CREATE TABLE IF NOT EXISTS company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (position('@' in email) > 1),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_invitations_company_idx ON company_invitations(company_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_email_idx ON company_invitations(company_id, lower(email)) WHERE accepted_at IS NULL AND revoked_at IS NULL;
