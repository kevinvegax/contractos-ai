# Contractors AI

React + TypeScript + Vite app with Vercel API routes for account control.

## Super Admin account setup

The Super Admin account is a bootstrap account configured from environment
variables. Its credentials are not stored in source.

Generate a password hash and session secret:

```bash
npm run security:hash-password -- "replace-with-a-long-random-password"
```

Configure these environment variables in local, staging, and production:

```bash
BOOTSTRAP_SUPER_ADMIN_EMAIL=super-admin@example.com
BOOTSTRAP_SUPER_ADMIN_PASSWORD_HASH=scrypt$...
SESSION_SECRET=...
TEMPORARY_PASSWORD_TTL_MINUTES=60
ADMIN_TEMP_PASSWORD_DELIVERY_WEBHOOK_URL=https://secure-delivery.example.com/admin-temporary-password
ADMIN_TEMP_PASSWORD_DELIVERY_TOKEN=replace-with-delivery-token
DATABASE_URL=postgres://...
```

`ADMIN_TEMP_PASSWORD_DELIVERY_WEBHOOK_URL` receives a `POST` payload with the
new Admin email, name, temporary password, expiration, and template key. Account
creation fails if this secure delivery method is not configured or rejects the
delivery request.

## Database migrations

Flyway migrations live in `migrations/` and run through the GitHub Actions
workflow in `.github/workflows/database-migrations.yml`.

The Admin account schema enforces:

- required first name, last name, and lower-cased email
- case-insensitive unique emails across user accounts
- Admin role creation through the Super Admin API
- temporary password expiration and first-use activation tracking

## Development

```bash
npm install
npm run dev
```

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
