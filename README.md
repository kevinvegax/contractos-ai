# Northstar — Evidence workspace foundation

This repository contains the first vertical slice of the SaaS evidence-management platform: US-001, an isolated company workspace for administrators.

## Structure

- `src/` — React dashboard and the product visual system.
- `api/_lib/db.ts` — pooled Postgres access, transaction context, and JSON helpers.
- `api/workspaces.ts` — list a user’s workspaces or create one and its initial admin membership.
- `api/workspace.ts` — read a workspace only after membership authorization; queries run with `app.company_id` set.
- `api/auth/` — sign-in, session validation, and sign-out handlers.
- `migrations/` — ordered SQL migrations. `V2` is the US-001 schema and includes row-level security policies.

## Run locally

1. Copy the database variables used by `docker-compose.yml` into `.env`.
2. Start Postgres with `docker compose up -d postgres`.
3. Apply `migrations/V1__create_migration_demo_items.sql` and `migrations/V2__create_company_workspace.sql` to the database.
4. Apply `migrations/V3__create_secure_sessions.sql`.
5. Set `DATABASE_URL`, then run `npm run dev`.

The local seeded account is `admin@northstar.build` with password `demo-password`. Change or remove it before production. Sessions expire after 8 hours, are invalidated on sign-out, and use an HTTP-only, same-site cookie. Passwords are scrypt hashes and are never returned by an API.

## Verification

`npm run build` and `npm run lint` are the baseline checks.
