CREATE TABLE IF NOT EXISTS migration_demo_items (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO migration_demo_items (label)
VALUES ('Migracion local funcionando')
ON CONFLICT (label) DO NOTHING;
