DROP POLICY IF EXISTS activity_records_company_insert ON activity_records;
CREATE POLICY activity_records_company_insert ON activity_records FOR INSERT WITH CHECK (
  company_id::text = current_setting('app.company_id', true)
  AND actor_id::text = current_setting('app.user_id', true)
);
