import { useEffect, useState } from 'react'
import './App.css'

type PostgresInfo = {
  current_time: string
  current_date: string
  database_name: string
}

type MigrationDemoItem = {
  id: number
  label: string
  created_at: string
}

type PostgresPayload = {
  postgres: PostgresInfo
  migrationDemoItems: MigrationDemoItem[]
}

type ApiState =
  | { status: 'loading'; payload: PostgresPayload | null; error: null }
  | { status: 'ready'; payload: PostgresPayload; error: null }
  | { status: 'error'; payload: PostgresPayload | null; error: string }

async function fetchPostgresInfo() {
  const response = await fetch('/api/postgres')
  const payload = (await response.json()) as Partial<PostgresPayload> & {
    error?: string
    detail?: string
  }

  if (!response.ok) {
    const message = [payload.error, payload.detail].filter(Boolean).join(': ')

    throw new Error(message || 'No se pudo cargar la API')
  }

  return payload as PostgresPayload
}

function App() {
  const [apiState, setApiState] = useState<ApiState>({
    status: 'loading',
    payload: null,
    error: null,
  })

  async function reloadPostgresInfo() {
    setApiState((current) => ({
      status: 'loading',
      payload: current.payload,
      error: null,
    }))

    try {
      const payload = await fetchPostgresInfo()

      setApiState({
        status: 'ready',
        payload,
        error: null,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar la API'

      setApiState((current) => ({
        status: 'error',
        payload: current.payload,
        error: message,
      }))
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialPostgresInfo() {
      try {
        const payload = await fetchPostgresInfo()

        if (!ignore) {
          setApiState({
            status: 'ready',
            payload,
            error: null,
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo cargar la API'

        if (!ignore) {
          setApiState({
            status: 'error',
            payload: null,
            error: message,
          })
        }
      }
    }

    void loadInitialPostgresInfo()

    return () => {
      ignore = true
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Vercel API + Postgres local</p>
            <h1>Postgres</h1>
          </div>
          <button
            type="button"
            onClick={() => void reloadPostgresInfo()}
            disabled={apiState.status === 'loading'}
          >
            {apiState.status === 'loading' ? 'Cargando' : 'Recargar'}
          </button>
        </div>

        {apiState.status === 'error' && (
          <p className="status error">{apiState.error}</p>
        )}

        {apiState.status === 'loading' && !apiState.payload && (
          <p className="status">Consultando /api/postgres...</p>
        )}

        {apiState.payload && (
          <div className="panel-body">
            <dl className="postgres-info">
              <div>
                <dt>Base de datos</dt>
                <dd>{apiState.payload.postgres.database_name}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{apiState.payload.postgres.current_date}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd>{apiState.payload.postgres.current_time}</dd>
              </div>
            </dl>

            <section className="migration-demo" aria-labelledby="migration-title">
              <div className="section-header">
                <p className="eyebrow">Tabla creada por migracion</p>
                <h2 id="migration-title">migration_demo_items</h2>
              </div>

              {apiState.payload.migrationDemoItems.length > 0 ? (
                <ul className="demo-list">
                  {apiState.payload.migrationDemoItems.map((item) => (
                    <li key={item.id}>
                      <span>{item.label}</span>
                      <time dateTime={item.created_at}>{item.created_at}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No hay registros en la tabla.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
