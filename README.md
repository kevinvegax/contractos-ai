# Northstar — Evidence workspace foundation

This repository contains the first vertical slice of the SaaS evidence-management platform: US-001, an isolated company workspace for administrators.

## Structure

- `src/` — React dashboard and the product visual system.
- `api/_lib/db.ts` — pooled Postgres access, transaction context, and JSON helpers.
- `api/workspaces.ts` — list a user’s workspaces or create one and its initial admin membership.
- `api/workspace.ts` — read a workspace only after membership authorization; queries run with `app.company_id` set.
- `api/auth/` — sign-in, session validation, and sign-out handlers.
- `api/invitations.ts` and `api/invitations/accept.ts` — administrator invite management and single-use acceptance.
- `migrations/` — ordered SQL migrations. `V2` is the US-001 schema and includes row-level security policies.

## Run locally

1. Copy the database variables used by `docker-compose.yml` into `.env`.
2. Start Postgres with `docker compose up -d postgres`.
3. Apply migrations V1 through V6 in filename order.
5. Set `DATABASE_URL`, then run `npm run dev`. The Vite development server also mounts the local `/api/*` handlers, so the invitation flow works at `http://localhost:5173`.

The local seeded account is `admin@northstar.build` with password `demo-password`. Change or remove it before production. Sessions expire after 8 hours, are invalidated on sign-out, and use an HTTP-only, same-site cookie. Passwords are scrypt hashes and are never returned by an API.

Invitations expire after 7 days, store only a token hash, can be revoked by an administrator, and can be accepted once. The acceptance URL is sent by the configured transactional email provider.

Company access is stored on `company_memberships.status`. Deactivating a member does not delete their user or project/task history. A user with no active company memberships cannot create a new session, and existing sessions are revoked when their last active membership is deactivated.

## Email delivery

Invitation delivery uses Resend’s HTTPS email API. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (a verified sender/domain), and `APP_URL` in the server environment. For local testing, use `APP_URL=http://localhost:5173`; the recipient must open the link on the same computer. For another device, use a public tunnel URL instead. The invitation is rolled back if the provider rejects the email, so the UI never reports a successful invite that was not delivered. Resend requires an API key, verified domain, and `from`/`to`/`subject`/`html` message fields. See the [Resend send email API](https://resend.com/docs/api-reference/emails/send-email).

## Verification

`npm run build` and `npm run lint` are the baseline checks.
