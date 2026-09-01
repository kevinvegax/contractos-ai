ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('open', 'in_progress', 'blocked', 'done'));
