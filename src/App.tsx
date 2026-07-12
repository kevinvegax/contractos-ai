import { useEffect, useState } from 'react'
import './App.css'

type Contractor = {
  id: number
  name: string
  specialty: string
  city: string
}

type ApiState =
  | { status: 'loading'; contractors: Contractor[]; error: null }
  | { status: 'ready'; contractors: Contractor[]; error: null }
  | { status: 'error'; contractors: Contractor[]; error: string }

async function fetchContractors() {
  const response = await fetch('/api/contractors')
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error ?? 'No se pudo cargar la API')
  }

  return payload.contractors as Contractor[]
}

function App() {
  const [apiState, setApiState] = useState<ApiState>({
    status: 'loading',
    contractors: [],
    error: null,
  })

  async function reloadContractors() {
    setApiState((current) => ({
      status: 'loading',
      contractors: current.contractors,
      error: null,
    }))

    try {
      const contractors = await fetchContractors()

      setApiState({
        status: 'ready',
        contractors,
        error: null,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar la API'

      setApiState((current) => ({
        status: 'error',
        contractors: current.contractors,
        error: message,
      }))
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadInitialContractors() {
      try {
        const contractors = await fetchContractors()

        if (!ignore) {
          setApiState({
            status: 'ready',
            contractors,
            error: null,
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo cargar la API'

        if (!ignore) {
          setApiState({
            status: 'error',
            contractors: [],
            error: message,
          })
        }
      }
    }

    void loadInitialContractors()

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
            <h1>Contratistas</h1>
          </div>
          <button
            type="button"
            onClick={() => void reloadContractors()}
            disabled={apiState.status === 'loading'}
          >
            {apiState.status === 'loading' ? 'Cargando' : 'Recargar'}
          </button>
        </div>

        {apiState.status === 'error' && (
          <p className="status error">{apiState.error}</p>
        )}

        {apiState.status === 'loading' && apiState.contractors.length === 0 && (
          <p className="status">Consultando /api/contractors...</p>
        )}

        {apiState.contractors.length > 0 && (
          <ul className="contractor-list">
            {apiState.contractors.map((contractor) => (
              <li key={contractor.id}>
                <strong>{contractor.name}</strong>
                <span>{contractor.specialty}</span>
                <small>{contractor.city}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
