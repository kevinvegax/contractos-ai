CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) >= 2),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_memberships (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

-- Every future resource carries company_id. This makes accidental cross-company
-- queries harder and gives the database enough context for row-level security.
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  name text NOT NULL,
  storage_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_memberships_user_idx ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS projects_company_idx ON projects(company_id);
CREATE INDEX IF NOT EXISTS tasks_company_idx ON tasks(company_id);
CREATE INDEX IF NOT EXISTS evidence_files_company_idx ON evidence_files(company_id);
CREATE INDEX IF NOT EXISTS activity_records_company_idx ON activity_records(company_id, created_at DESC);

-- The API sets this per transaction after authenticating the request. It is
-- intentionally NULL by default: no request context means no rows are visible.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_user_company_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM company_memberships
  WHERE user_id::text = current_setting('app.user_id', true)
$$;

DROP POLICY IF EXISTS company_member_access ON companies;
CREATE POLICY company_member_access ON companies USING (
  id::text = current_setting('app.company_id', true)
  OR id IN (SELECT app_user_company_ids())
);

DROP POLICY IF EXISTS company_membership_access ON company_memberships;
CREATE POLICY company_membership_access ON company_memberships USING (
  company_id::text = current_setting('app.company_id', true)
  OR user_id::text = current_setting('app.user_id', true)
);

DROP POLICY IF EXISTS projects_company_access ON projects;
CREATE POLICY projects_company_access ON projects USING (
  company_id::text = current_setting('app.company_id', true)
);

DROP POLICY IF EXISTS tasks_company_access ON tasks;
CREATE POLICY tasks_company_access ON tasks USING (
  company_id::text = current_setting('app.company_id', true)
);

DROP POLICY IF EXISTS evidence_files_company_access ON evidence_files;
CREATE POLICY evidence_files_company_access ON evidence_files USING (
  company_id::text = current_setting('app.company_id', true)
);

DROP POLICY IF EXISTS activity_records_company_access ON activity_records;
CREATE POLICY activity_records_company_access ON activity_records USING (
  company_id::text = current_setting('app.company_id', true)
);

-- A deterministic local user keeps the first story demonstrable before an
-- identity provider is wired in. Production authentication must replace this.
INSERT INTO users (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@northstar.build', 'Maya Rodriguez')
ON CONFLICT (id) DO NOTHING;
