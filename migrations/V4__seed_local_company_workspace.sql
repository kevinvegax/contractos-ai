INSERT INTO companies (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000010', 'Northstar Construction', 'northstar-construction')
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_memberships (company_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (company_id, user_id) DO NOTHING;

INSERT INTO projects (company_id, name, status)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'Riverside renovation', 'active'),
  ('00000000-0000-0000-0000-000000000010', 'Oak street commercial', 'active')
ON CONFLICT DO NOTHING;
