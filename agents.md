# Agent Instructions

## React structure

Follow this structure for all React changes:

```text
src/
  features/
    auth/
      components/
      hooks/
      api.ts
      types.ts
    users/
      components/
      hooks/
      api.ts
      types.ts
    dashboard/
      components/
      hooks/
  components/        # componentes verdaderamente compartidos (Button, Modal, etc.)
  hooks/             # hooks globales (useDebounce, useAuth)
  lib/               # clientes API, config de fetch/axios, etc.
  services/          # integraciones o servicios client-side compartidos
  utils/
  types/
  App.tsx
```

Do not create `src/app`, `src/domains`, or `src/shared` for React code. Use the
folders above instead.

`src/features/<feature>` owns user-facing workflows. Each feature should keep
its own components, hooks, API wrappers, and feature-specific types together.

`src/components` is only for truly shared UI primitives used by multiple
features, such as `Button`, `Modal`, or `TextField`.

`src/hooks` is only for global hooks that are not owned by one feature, such as
`useDebounce`.

`src/lib` is for technical clients and configuration, such as the shared fetch
client. `src/services` is for shared client-side integrations or service
adapters when they are larger than a simple client helper.

`src/utils` is for reusable pure utility functions. `src/types` is for app-wide
types that are not owned by one feature.

Keep the application entry component at `src/App.tsx`.

## API and security

Serverless API routes stay under `api/`. Shared API server helpers stay under
`api/_shared/`.

Do not hard-code credentials, bootstrap users, delivery secrets, or temporary
passwords in application code. Use environment variables and documented setup
scripts instead.
