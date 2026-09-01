ALTER TABLE projects ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS objectives text NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS requirements text NOT NULL DEFAULT '';
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE company_memberships DROP CONSTRAINT IF EXISTS company_memberships_role_check;
ALTER TABLE company_memberships ADD CONSTRAINT company_memberships_role_check CHECK (role IN ('admin', 'project_manager', 'member'));

DROP POLICY IF EXISTS projects_company_insert ON projects;
CREATE POLICY projects_company_insert ON projects FOR INSERT WITH CHECK (
  company_id::text = current_setting('app.company_id', true)
);
