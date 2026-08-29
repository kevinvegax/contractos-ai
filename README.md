# Northstar — Evidence workspace foundation

This repository contains the first vertical slice of the SaaS evidence-management platform: US-001, an isolated company workspace for administrators.

## Structure

- `src/` — React dashboard and the product visual system.
- `api/_lib/db.ts` — pooled Postgres access, transaction context, and JSON helpers.
- `api/workspaces.ts` — list a user’s workspaces or create one and its initial admin membership.
- `api/workspace.ts` — read a workspace only after membership authorization; queries run with `app.company_id` set.
- `migrations/` — ordered SQL migrations. `V2` is the US-001 schema and includes row-level security policies.

## Run locally

1. Copy the database variables used by `docker-compose.yml` into `.env`.
2. Start Postgres with `docker compose up -d postgres`.
3. Apply `migrations/V1__create_migration_demo_items.sql` and `migrations/V2__create_company_workspace.sql` to the database.
4. Set `DATABASE_URL`, then run `npm run dev`.

The dashboard has a safe visual fallback when API routes are not running, so the UI can be reviewed with Vite alone. The API uses the deterministic local admin `admin@northstar.build` until an identity provider is connected; production should replace the `x-user-id` development seam with verified session claims.

## Verification

`npm run build` and `npm run lint` are the baseline checks.
