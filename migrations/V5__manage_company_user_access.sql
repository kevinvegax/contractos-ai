ALTER TABLE company_memberships ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE company_memberships ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
ALTER TABLE company_memberships ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS company_memberships_status_idx ON company_memberships(company_id, status);
