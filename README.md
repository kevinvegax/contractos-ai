# Contractors AI MVP

MVP en React + Vite para operar el esquema definido en
`migrations/V1__create_migration_demo_items.sql`.

## Desarrollo

```bash
npm install
npm run dev
```

La app intenta cargar `/api/postgres`. Si Postgres no esta disponible, entra en
modo demo local con los mismos datos semilla que deja la migracion.

## Base de datos local

```bash
npm run db:up
npm run db:migrate
npm run dev
```

Conexion local usada por la API si no defines `DATABASE_URL`:

```bash
postgres://postgres:postgres@localhost:5432/postgres
```

PgAdmin queda disponible en `http://localhost:8080` con:

```text
kevin@postgres.com
postgres
```

## API

`GET /api/postgres` devuelve usuarios, proyectos, actividades, evidencias y
facturas del esquema real.

`POST /api/postgres` soporta:

- `create_project`
- `start_activity`
- `submit_evidence`
- `review_evidence`

En desarrollo Vite monta este endpoint con un middleware local. En despliegues
tipo Vercel, el mismo archivo queda disponible desde `api/postgres.ts`.
