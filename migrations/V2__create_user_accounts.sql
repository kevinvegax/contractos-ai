CREATE TABLE user_accounts (
  id uuid PRIMARY KEY,
  first_name text NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name text NOT NULL CHECK (length(trim(last_name)) > 0),
  email text NOT NULL CHECK (email = lower(email)),
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'contractor')),
  status text NOT NULL CHECK (status IN ('pending_activation', 'active')),
  temporary_password_hash text,
  temporary_password_expires_at timestamptz,
  temporary_password_used_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_admin_temporary_password_required CHECK (
    status <> 'pending_activation'
    OR (
      temporary_password_hash IS NOT NULL
      AND temporary_password_expires_at IS NOT NULL
      AND temporary_password_used_at IS NULL
    )
  )
);

CREATE UNIQUE INDEX user_accounts_email_lower_unique
  ON user_accounts (lower(email));

CREATE INDEX user_accounts_role_created_at_idx
  ON user_accounts (role, created_at DESC);
