import { useEffect, useState } from 'react'
import './App.css'

type PostgresInfo = {
  current_time: string
  current_date: string
  database_name: string
}

type ApiState =
  | { status: 'loading'; info: PostgresInfo | null; error: null }
  | { status: 'ready'; info: PostgresInfo; error: null }
  | { status: 'error'; info: PostgresInfo | null; error: string }

async function fetchPostgresInfo() {
  const response = await fetch('/api/postgres')
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error ?? 'No se pudo cargar la API')
  }

  return payload.postgres as PostgresInfo
}

function App() {
  const [apiState, setApiState] = useState<ApiState>({
    status: 'loading',
    info: null,
    error: null,
  })

  async function reloadPostgresInfo() {
    setApiState((current) => ({
      status: 'loading',
      info: current.info,
      error: null,
    }))

    try {
      const info = await fetchPostgresInfo()

      setApiState({
        status: 'ready',
        info,
        error: null,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar la API'

      setApiState((current) => ({
        status: 'error',
        info: current.info,
        error: message,
      }))
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialPostgresInfo() {
      try {
        const info = await fetchPostgresInfo()

        if (!ignore) {
          setApiState({
            status: 'ready',
            info,
            error: null,
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo cargar la API'

        if (!ignore) {
          setApiState({
            status: 'error',
            info: null,
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

        {apiState.status === 'loading' && !apiState.info && (
          <p className="status">Consultando /api/postgres...</p>
        )}

        {apiState.info && (
          <dl className="postgres-info">
            <div>
              <dt>Base de datos</dt>
              <dd>{apiState.info.database_name}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{apiState.info.current_date}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{apiState.info.current_time}</dd>
            </div>
          </dl>
        )}
      </section>
    </main>
  )
}

export default App
