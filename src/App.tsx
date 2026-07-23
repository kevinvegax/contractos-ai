import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import heroImage from './assets/hero.png'
import './App.css'

type RoleCode = 'ADMIN' | 'APP_USER'
type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'
type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type EvidenceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
type FileCategory = 'PHOTO' | 'INVOICE' | 'DOCUMENT' | 'OTHER'
type DataSource = 'database' | 'demo'
type AdminView = 'home' | 'projects' | 'evidence' | 'invoices' | 'users'
type UserView = 'home' | 'projects' | 'activities' | 'upload' | 'profile'

type Session = {
  roleCode: RoleCode
  userId: string
}

type PostgresInfo = {
  current_time: string
  current_date: string
  database_name: string
}

type AppUser = {
  id: string
  name: string
  email: string
  role_code: RoleCode
  is_active: boolean
  created_at: string
}

type Project = {
  id: string
  name: string
  description: string
  status: ProjectStatus
  starts_at: string | null
  ends_at: string | null
  created_by: string
  created_at: string
  assigned_user_ids: string[]
  assigned_user_names: string[]
  activity_count: number
  completed_activity_count: number
  evidence_count: number
  invoice_count: number
}

type Activity = {
  id: string
  project_id: string
  title: string
  description: string
  status: ActivityStatus
  due_at: string | null
  completed_at: string | null
  created_by: string
  assigned_user_ids: string[]
  assigned_user_names: string[]
}

type Evidence = {
  id: string
  activity_id: string
  project_id: string
  submitted_by: string
  status: EvidenceStatus
  description: string
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_comment: string
  revision_number: number
  file_names: string[]
  file_categories: FileCategory[]
  comments: string[]
}

type Invoice = {
  id: string
  project_id: string
  evidence_id: string | null
  uploaded_by: string
  invoice_number: string
  supplier_name: string
  issued_at: string | null
  total_amount: number
  currency: string
  file_name: string
  created_at: string
}

type DashboardData = {
  postgres: PostgresInfo | null
  users: AppUser[]
  projects: Project[]
  activities: Activity[]
  evidence: Evidence[]
  invoices: Invoice[]
}

type ApiErrorPayload = {
  error?: string
  detail?: string
}

const CURRENT_DATE = new Date('2026-07-22T12:00:00-06:00')
const CURRENT_TIMESTAMP = '2026-07-22T12:00:00-06:00'

const demoIds = {
  admin: '00000000-0000-4000-8000-000000000001',
  luis: '00000000-0000-4000-8000-000000000002',
  marta: '00000000-0000-4000-8000-000000000003',
  plaza: '10000000-0000-4000-8000-000000000001',
  encino: '10000000-0000-4000-8000-000000000002',
  bodega: '10000000-0000-4000-8000-000000000003',
  electrica: '20000000-0000-4000-8000-000000000001',
  pintura: '20000000-0000-4000-8000-000000000002',
  piso: '20000000-0000-4000-8000-000000000003',
  materiales: '20000000-0000-4000-8000-000000000004',
}

const demoData: DashboardData = {
  postgres: null,
  users: [
    {
      id: demoIds.admin,
      name: 'Ana Torres',
      email: 'ana@constructora.mx',
      role_code: 'ADMIN',
      is_active: true,
      created_at: '2026-07-01T09:00:00-06:00',
    },
    {
      id: demoIds.luis,
      name: 'Luis Martinez',
      email: 'luis@contratista.mx',
      role_code: 'APP_USER',
      is_active: true,
      created_at: '2026-07-01T09:15:00-06:00',
    },
    {
      id: demoIds.marta,
      name: 'Marta Lopez',
      email: 'marta@contratista.mx',
      role_code: 'APP_USER',
      is_active: true,
      created_at: '2026-07-01T09:20:00-06:00',
    },
  ],
  projects: [
    {
      id: demoIds.plaza,
      name: 'Remodelacion Plaza Norte',
      description: 'Adecuacion electrica, pintura y acabados de locales.',
      status: 'ACTIVE',
      starts_at: '2026-07-01',
      ends_at: '2026-08-15',
      created_by: demoIds.admin,
      created_at: '2026-07-01T09:30:00-06:00',
      assigned_user_ids: [demoIds.luis],
      assigned_user_names: ['Luis Martinez'],
      activity_count: 2,
      completed_activity_count: 1,
      evidence_count: 2,
      invoice_count: 1,
    },
    {
      id: demoIds.encino,
      name: 'Residencial Encino',
      description: 'Correccion hidrosanitaria y colocacion de piso.',
      status: 'ACTIVE',
      starts_at: '2026-06-18',
      ends_at: '2026-07-28',
      created_by: demoIds.admin,
      created_at: '2026-06-18T10:00:00-06:00',
      assigned_user_ids: [demoIds.marta],
      assigned_user_names: ['Marta Lopez'],
      activity_count: 1,
      completed_activity_count: 0,
      evidence_count: 1,
      invoice_count: 1,
    },
    {
      id: demoIds.bodega,
      name: 'Bodega Santa Catarina',
      description: 'Entrega de materiales, reparacion de tuberia y limpieza.',
      status: 'DRAFT',
      starts_at: '2026-07-10',
      ends_at: '2026-08-05',
      created_by: demoIds.admin,
      created_at: '2026-07-10T12:00:00-06:00',
      assigned_user_ids: [demoIds.luis],
      assigned_user_names: ['Luis Martinez'],
      activity_count: 1,
      completed_activity_count: 0,
      evidence_count: 0,
      invoice_count: 0,
    },
  ],
  activities: [
    {
      id: demoIds.electrica,
      project_id: demoIds.plaza,
      title: 'Instalacion electrica',
      description: 'Canalizacion, cableado y tablero principal.',
      status: 'COMPLETED',
      due_at: '2026-07-18T18:00:00-06:00',
      completed_at: '2026-07-17T17:20:00-06:00',
      created_by: demoIds.admin,
      assigned_user_ids: [demoIds.luis],
      assigned_user_names: ['Luis Martinez'],
    },
    {
      id: demoIds.pintura,
      project_id: demoIds.plaza,
      title: 'Pintura interior',
      description: 'Aplicacion de sellador y pintura final.',
      status: 'IN_PROGRESS',
      due_at: '2026-07-22T18:00:00-06:00',
      completed_at: null,
      created_by: demoIds.admin,
      assigned_user_ids: [demoIds.luis],
      assigned_user_names: ['Luis Martinez'],
    },
    {
      id: demoIds.piso,
      project_id: demoIds.encino,
      title: 'Colocacion de piso',
      description: 'Nivelacion, adhesivo y boquilla.',
      status: 'IN_PROGRESS',
      due_at: '2026-07-20T18:00:00-06:00',
      completed_at: null,
      created_by: demoIds.admin,
      assigned_user_ids: [demoIds.marta],
      assigned_user_names: ['Marta Lopez'],
    },
    {
      id: demoIds.materiales,
      project_id: demoIds.bodega,
      title: 'Entrega de materiales',
      description: 'Recepcion y acomodo de material en bodega.',
      status: 'PENDING',
      due_at: '2026-07-24T18:00:00-06:00',
      completed_at: null,
      created_by: demoIds.admin,
      assigned_user_ids: [demoIds.luis],
      assigned_user_names: ['Luis Martinez'],
    },
  ],
  evidence: [
    {
      id: '30000000-0000-4000-8000-000000000001',
      activity_id: demoIds.electrica,
      project_id: demoIds.plaza,
      submitted_by: demoIds.luis,
      status: 'SUBMITTED',
      description: 'Tablero instalado: tablero nuevo con protecciones etiquetadas.',
      submitted_at: '2026-07-18T09:30:00-06:00',
      reviewed_at: null,
      reviewed_by: null,
      review_comment: '',
      revision_number: 1,
      file_names: ['tablero-final.jpg', 'checklist-electrico.pdf'],
      file_categories: ['PHOTO', 'DOCUMENT'],
      comments: [],
    },
    {
      id: '30000000-0000-4000-8000-000000000002',
      activity_id: demoIds.piso,
      project_id: demoIds.encino,
      submitted_by: demoIds.marta,
      status: 'REJECTED',
      description:
        'Piso terminado area norte: faltan fotos de juntas y factura del adhesivo.',
      submitted_at: '2026-07-20T16:10:00-06:00',
      reviewed_at: '2026-07-21T10:00:00-06:00',
      reviewed_by: demoIds.admin,
      review_comment: 'Agregar factura y una foto clara de la boquilla.',
      revision_number: 1,
      file_names: ['piso-norte.jpg'],
      file_categories: ['PHOTO'],
      comments: ['Agregar factura y una foto clara de la boquilla.'],
    },
    {
      id: '30000000-0000-4000-8000-000000000003',
      activity_id: demoIds.pintura,
      project_id: demoIds.plaza,
      submitted_by: demoIds.luis,
      status: 'APPROVED',
      description: 'Factura pintura: compra de sellador y pintura lavable.',
      submitted_at: '2026-07-22T12:45:00-06:00',
      reviewed_at: '2026-07-22T15:00:00-06:00',
      reviewed_by: demoIds.admin,
      review_comment: 'Factura validada.',
      revision_number: 1,
      file_names: ['F-1048.pdf'],
      file_categories: ['INVOICE'],
      comments: [],
    },
  ],
  invoices: [
    {
      id: '50000000-0000-4000-8000-000000000001',
      project_id: demoIds.plaza,
      evidence_id: '30000000-0000-4000-8000-000000000003',
      uploaded_by: demoIds.luis,
      invoice_number: 'F-1048',
      supplier_name: 'Pinturas del Norte',
      issued_at: '2026-07-22',
      total_amount: 18450,
      currency: 'MXN',
      file_name: 'F-1048.pdf',
      created_at: '2026-07-22T12:45:00-06:00',
    },
    {
      id: '50000000-0000-4000-8000-000000000002',
      project_id: demoIds.encino,
      evidence_id: null,
      uploaded_by: demoIds.marta,
      invoice_number: 'F-2031',
      supplier_name: 'Acabados Monterrey',
      issued_at: '2026-07-20',
      total_amount: 9700,
      currency: 'MXN',
      file_name: 'F-2031.pdf',
      created_at: '2026-07-20T13:20:00-06:00',
    },
  ],
}

const projectStatusLabels: Record<ProjectStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

const activityStatusLabels: Record<ActivityStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'En revision',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
}

const categoryLabels: Record<FileCategory, string> = {
  PHOTO: 'Foto',
  INVOICE: 'Factura',
  DOCUMENT: 'Documento',
  OTHER: 'Otro',
}

const adminNav: Array<{ id: AdminView; label: string }> = [
  { id: 'home', label: 'Inicio' },
  { id: 'projects', label: 'Proyectos' },
  { id: 'evidence', label: 'Evidencias' },
  { id: 'invoices', label: 'Facturas' },
  { id: 'users', label: 'Usuarios' },
]

const userNav: Array<{ id: UserView; label: string }> = [
  { id: 'home', label: 'Inicio' },
  { id: 'projects', label: 'Mis proyectos' },
  { id: 'activities', label: 'Mis actividades' },
  { id: 'upload', label: 'Subir evidencia' },
  { id: 'profile', label: 'Perfil' },
]

async function fetchDashboard() {
  const response = await fetch('/api/postgres', {
    headers: { accept: 'application/json' },
  })
  const payload = (await response.json()) as DashboardData & ApiErrorPayload

  if (!response.ok) {
    throw new Error([payload.error, payload.detail].filter(Boolean).join(': '))
  }

  return payload
}

async function postAction(payload: Record<string, unknown>) {
  const response = await fetch('/api/postgres', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const responsePayload = (await response.json()) as ApiErrorPayload

  if (!response.ok) {
    throw new Error(
      [responsePayload.error, responsePayload.detail].filter(Boolean).join(': '),
    )
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatMoney(value: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function statusClass(status: string) {
  return `status-chip ${status.toLowerCase().replaceAll('_', '-')}`
}

function progressFor(project: Project) {
  if (project.activity_count === 0) {
    return 0
  }

  return Math.round((project.completed_activity_count / project.activity_count) * 100)
}

function evidenceTitle(evidence: Evidence) {
  const [title] = evidence.description.split(':')

  return title || evidence.file_names[0] || 'Evidencia'
}

function createLocalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error inesperado'
}

function App() {
  const [data, setData] = useState<DashboardData>(demoData)
  const [source, setSource] = useState<DataSource>('demo')
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loginRole, setLoginRole] = useState<RoleCode>('ADMIN')
  const [adminView, setAdminView] = useState<AdminView>('home')
  const [userView, setUserView] = useState<UserView>('home')
  const [selectedProjectId, setSelectedProjectId] = useState(demoIds.plaza)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(
    '30000000-0000-4000-8000-000000000001',
  )
  const [notice, setNotice] = useState('Cargando tablero...')

  useEffect(() => {
    void refreshDashboard()
  }, [])

  const appUsers = data.users.filter((user) => user.role_code === 'APP_USER')
  const activeUser =
    data.users.find((user) => user.id === session?.userId) ??
    data.users.find((user) => user.role_code === loginRole) ??
    data.users[0]
  const selectedProject =
    data.projects.find((project) => project.id === selectedProjectId) ??
    data.projects[0]
  const selectedEvidence =
    data.evidence.find((evidence) => evidence.id === selectedEvidenceId) ??
    data.evidence[0]
  const visibleProjects =
    session?.roleCode === 'APP_USER'
      ? data.projects.filter((project) =>
          project.assigned_user_ids.includes(activeUser.id),
        )
      : data.projects
  const visibleActivities =
    session?.roleCode === 'APP_USER'
      ? data.activities.filter((activity) =>
          activity.assigned_user_ids.includes(activeUser.id),
        )
      : data.activities
  const openActivities = visibleActivities.filter(
    (activity) =>
      activity.status !== 'COMPLETED' && activity.status !== 'CANCELLED',
  )
  const overdueActivities = data.activities.filter(
    (activity) =>
      activity.due_at &&
      new Date(activity.due_at) < CURRENT_DATE &&
      activity.status !== 'COMPLETED' &&
      activity.status !== 'CANCELLED',
  )
  const submittedEvidence = data.evidence.filter(
    (evidence) => evidence.status === 'SUBMITTED',
  )
  const rejectedEvidence = data.evidence.filter(
    (evidence) =>
      evidence.status === 'REJECTED' && evidence.submitted_by === activeUser.id,
  )
  const selectedProjectActivities = selectedProject
    ? data.activities.filter((activity) => activity.project_id === selectedProject.id)
    : []
  const selectedProjectEvidence = selectedProject
    ? data.evidence.filter((evidence) => evidence.project_id === selectedProject.id)
    : []
  const selectedProjectInvoices = selectedProject
    ? data.invoices.filter((invoice) => invoice.project_id === selectedProject.id)
    : []
  const invoiceTotal = data.invoices.reduce(
    (total, invoice) => total + invoice.total_amount,
    0,
  )

  async function refreshDashboard() {
    setLoading(true)

    try {
      const payload = await fetchDashboard()

      setData(payload)
      setSource('database')
      setApiError(null)
      setNotice(`Conectado a Postgres: ${payload.postgres?.database_name ?? 'ok'}.`)
    } catch (error) {
      setSource('demo')
      setApiError(getErrorMessage(error))
      setNotice('Modo demo local activo.')
    } finally {
      setLoading(false)
    }
  }

  async function persist(
    payload: Record<string, unknown>,
    applyLocal: () => void,
    successMessage: string,
  ) {
    if (source === 'database') {
      setNotice('Guardando en Postgres...')

      try {
        await postAction(payload)
        const refreshed = await fetchDashboard()

        setData(refreshed)
        setApiError(null)
        setNotice(successMessage)
        return
      } catch (error) {
        const message = getErrorMessage(error)

        setApiError(message)
        setNotice(`No se guardo en Postgres: ${message}`)
        return
      }
    }

    applyLocal()
    setNotice(`${successMessage} (modo demo local).`)
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const user =
      data.users.find((candidate) => candidate.role_code === loginRole) ?? data.users[0]

    setSession({ roleCode: loginRole, userId: user.id })
    setAdminView('home')
    setUserView('home')
    setNotice(`Sesion iniciada como ${user.name}.`)
  }

  function switchRole() {
    const nextRole: RoleCode = session?.roleCode === 'ADMIN' ? 'APP_USER' : 'ADMIN'
    const nextUser =
      data.users.find((candidate) => candidate.role_code === nextRole) ?? data.users[0]

    setSession({ roleCode: nextRole, userId: nextUser.id })
    setAdminView('home')
    setUserView('home')
    setNotice(`Vista cambiada a ${nextUser.name}.`)
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeUser || appUsers.length === 0) {
      setNotice('No hay usuarios disponibles para asignar.')
      return
    }

    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const assignedUserId = String(form.get('assignedUserId') ?? appUsers[0].id)

    if (!name) {
      setNotice('El proyecto necesita nombre.')
      return
    }

    const assignedUser = data.users.find((user) => user.id === assignedUserId)
    const localProject: Project = {
      id: createLocalId(),
      name,
      description: String(form.get('description') ?? '').trim(),
      status: 'ACTIVE',
      starts_at: String(form.get('startsAt') ?? '') || null,
      ends_at: String(form.get('endsAt') ?? '') || null,
      created_by: activeUser.id,
      created_at: CURRENT_TIMESTAMP,
      assigned_user_ids: [assignedUserId],
      assigned_user_names: [assignedUser?.name ?? 'Sin asignar'],
      activity_count: 0,
      completed_activity_count: 0,
      evidence_count: 0,
      invoice_count: 0,
    }

    await persist(
      {
        action: 'create_project',
        name: localProject.name,
        description: localProject.description,
        startsAt: localProject.starts_at,
        endsAt: localProject.ends_at,
        assignedUserId,
        createdBy: activeUser.id,
      },
      () => {
        setData((current) => ({
          ...current,
          projects: [localProject, ...current.projects],
        }))
        setSelectedProjectId(localProject.id)
      },
      'Proyecto creado.',
    )

    event.currentTarget.reset()
  }

  async function markActivityInProgress(activityId: string) {
    await persist(
      { action: 'start_activity', activityId },
      () => {
        setData((current) => ({
          ...current,
          activities: current.activities.map((activity) =>
            activity.id === activityId
              ? { ...activity, status: 'IN_PROGRESS' }
              : activity,
          ),
        }))
      },
      'Actividad marcada en proceso.',
    )
  }

  async function reviewEvidence(
    evidenceId: string,
    status: Extract<EvidenceStatus, 'APPROVED' | 'REJECTED'>,
    comment: string,
  ) {
    if (!activeUser) {
      return
    }

    await persist(
      {
        action: 'review_evidence',
        evidenceId,
        status,
        reviewedBy: activeUser.id,
        comment,
      },
      () => {
        setData((current) => ({
          ...current,
          evidence: current.evidence.map((evidence) =>
            evidence.id === evidenceId
              ? {
                  ...evidence,
                  status,
                  reviewed_at: CURRENT_TIMESTAMP,
                  reviewed_by: activeUser.id,
                  review_comment: comment,
                }
              : evidence,
          ),
        }))
      },
      status === 'APPROVED' ? 'Evidencia aprobada.' : 'Evidencia rechazada.',
    )
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeUser) {
      return
    }

    const form = new FormData(event.currentTarget)
    const activityId = String(form.get('activityId') ?? '')
    const activity = data.activities.find((candidate) => candidate.id === activityId)
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null
    const status: EvidenceStatus =
      submitter?.value === 'DRAFT' ? 'DRAFT' : 'SUBMITTED'
    const file = form.get('file')
    const fileName =
      file instanceof File && file.name ? file.name : 'evidencia-demo.jpg'
    const category = String(form.get('category') ?? 'PHOTO') as FileCategory
    const title = String(form.get('title') ?? '').trim()
    const detail = String(form.get('description') ?? '').trim()

    if (!activity || !title) {
      setNotice('Selecciona una actividad y agrega titulo.')
      return
    }

    const localEvidence: Evidence = {
      id: createLocalId(),
      activity_id: activity.id,
      project_id: activity.project_id,
      submitted_by: activeUser.id,
      status,
      description: `${title}: ${detail || 'Sin descripcion adicional.'}`,
      submitted_at: status === 'DRAFT' ? null : CURRENT_TIMESTAMP,
      reviewed_at: null,
      reviewed_by: null,
      review_comment: '',
      revision_number: 1,
      file_names: [fileName],
      file_categories: [category],
      comments: [],
    }

    await persist(
      {
        action: 'submit_evidence',
        activityId: activity.id,
        submittedBy: activeUser.id,
        status,
        description: localEvidence.description,
        category,
        fileName,
        mimeType: file instanceof File && file.type ? file.type : undefined,
        sizeBytes: file instanceof File ? file.size : 1,
      },
      () => {
        setData((current) => ({
          ...current,
          evidence: [localEvidence, ...current.evidence],
          projects: current.projects.map((project) =>
            project.id === localEvidence.project_id
              ? { ...project, evidence_count: project.evidence_count + 1 }
              : project,
          ),
        }))
        setSelectedEvidenceId(localEvidence.id)
      },
      status === 'DRAFT' ? 'Borrador guardado.' : 'Evidencia enviada.',
    )

    event.currentTarget.reset()
  }

  if (!session) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-copy">
            <p className="eyebrow">MVP operativo</p>
            <h1>Control de proyectos y evidencias</h1>
            <p>
              {source === 'database'
                ? `Base conectada: ${data.postgres?.database_name ?? 'Postgres'}`
                : 'Datos demo listos para navegar.'}
            </p>
            <img aria-hidden="true" src={heroImage} />
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="role-toggle" aria-label="Rol de acceso">
              <button
                className={loginRole === 'ADMIN' ? 'active' : ''}
                type="button"
                onClick={() => setLoginRole('ADMIN')}
              >
                Administrador
              </button>
              <button
                className={loginRole === 'APP_USER' ? 'active' : ''}
                type="button"
                onClick={() => setLoginRole('APP_USER')}
              >
                Contratista
              </button>
            </div>

            <label>
              Correo
              <input
                key={loginRole}
                defaultValue={
                  data.users.find((user) => user.role_code === loginRole)?.email ?? ''
                }
                type="email"
              />
            </label>
            <label>
              Contrasena
              <input defaultValue="demo1234" type="password" />
            </label>
            <button className="primary-button" type="submit">
              Entrar
            </button>
            {apiError && <p className="inline-alert">{apiError}</p>}
          </form>
        </section>
      </main>
    )
  }

  const navItems = session.roleCode === 'ADMIN' ? adminNav : userNav
  const activeView = session.roleCode === 'ADMIN' ? adminView : userView

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CP</span>
          <div>
            <strong>Contractors AI</strong>
            <span>{session.roleCode === 'ADMIN' ? 'Admin' : 'Contratista'}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Principal">
          {navItems.map((item) => (
            <button
              className={activeView === item.id ? 'active' : ''}
              key={item.id}
              type="button"
              onClick={() => {
                if (session.roleCode === 'ADMIN') {
                  setAdminView(item.id as AdminView)
                } else {
                  setUserView(item.id as UserView)
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>{activeUser?.name}</span>
          <button className="ghost-button" type="button" onClick={() => setSession(null)}>
            Salir
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {source === 'database' ? 'Postgres activo' : 'Demo local'}
            </p>
            <h1>{navItems.find((item) => item.id === activeView)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <span className="notice">{loading ? 'Sincronizando...' : notice}</span>
            <button className="secondary-button" type="button" onClick={switchRole}>
              Ver como {session.roleCode === 'ADMIN' ? 'contratista' : 'admin'}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void refreshDashboard()}
            >
              Recargar
            </button>
          </div>
        </header>

        {session.roleCode === 'ADMIN' ? renderAdmin() : renderUser()}
      </section>
    </main>
  )

  function renderAdmin() {
    if (adminView === 'home') {
      return (
        <>
          <section className="metrics-grid" aria-label="Resumen">
            <Metric label="Proyectos activos" value={activeProjectCount(data.projects)} />
            <Metric label="Por revisar" value={submittedEvidence.length} />
            <Metric label="Vencidas" value={overdueActivities.length} />
            <Metric label="Facturado" value={formatMoney(invoiceTotal)} />
          </section>

          <section className="dashboard-grid">
            <Card title="Avance por proyecto" eyebrow="Operacion">
              <ProjectList
                projects={data.projects}
                onSelect={(id) => {
                  setSelectedProjectId(id)
                  setAdminView('projects')
                }}
              />
            </Card>
            <Card title="Cola de revision" eyebrow="Evidencias">
              <EvidenceList
                evidence={submittedEvidence}
                emptyLabel="No hay evidencias pendientes."
                onSelect={(id) => {
                  setSelectedEvidenceId(id)
                  setAdminView('evidence')
                }}
              />
            </Card>
          </section>
        </>
      )
    }

    if (adminView === 'projects') {
      return (
        <section className="split-layout">
          <div className="stack">
            <Card title="Proyectos" eyebrow="Cartera">
              <ProjectList projects={data.projects} onSelect={setSelectedProjectId} />
            </Card>
            <Card title="Nuevo proyecto" eyebrow="Alta">
              <ProjectForm users={appUsers} onSubmit={createProject} />
            </Card>
          </div>
          <ProjectDetail
            activities={selectedProjectActivities}
            evidence={selectedProjectEvidence}
            invoices={selectedProjectInvoices}
            project={selectedProject}
            users={data.users}
          />
        </section>
      )
    }

    if (adminView === 'evidence') {
      return (
        <section className="review-layout">
          <Card title="Evidencias" eyebrow="Revision">
            <EvidenceList
              evidence={data.evidence}
              emptyLabel="No hay evidencias."
              onSelect={setSelectedEvidenceId}
            />
          </Card>
          <EvidenceReview
            evidence={selectedEvidence}
            key={selectedEvidence?.id ?? 'empty'}
            users={data.users}
            onReview={(status, comment) =>
              void reviewEvidence(selectedEvidence.id, status, comment)
            }
          />
        </section>
      )
    }

    if (adminView === 'invoices') {
      return (
        <Card title="Facturas" eyebrow="Finanzas">
          <InvoiceTable
            invoices={data.invoices}
            projects={data.projects}
            users={data.users}
          />
        </Card>
      )
    }

    return (
      <section className="card-grid">
        {data.users.map((user) => (
          <Card
            key={user.id}
            title={user.name}
            eyebrow={user.role_code === 'ADMIN' ? 'Administrador' : 'Usuario'}
          >
            <p className="muted">{user.email}</p>
            <div className="chip-row">
              <span className={statusClass(user.is_active ? 'ACTIVE' : 'CANCELLED')}>
                {user.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <span>{assignedCount(data.projects, user.id)} proyectos</span>
            </div>
          </Card>
        ))}
      </section>
    )
  }

  function renderUser() {
    if (userView === 'home') {
      return (
        <>
          <section className="metrics-grid" aria-label="Mi resumen">
            <Metric label="Mis proyectos" value={visibleProjects.length} />
            <Metric label="Pendientes" value={openActivities.length} />
            <Metric label="Rechazadas" value={rejectedEvidence.length} />
            <Metric label="Evidencias" value={userEvidenceCount(data.evidence, activeUser.id)} />
          </section>

          <section className="dashboard-grid">
            <Card title="Proyectos asignados" eyebrow="Trabajo">
              <ProjectList
                projects={visibleProjects}
                onSelect={(id) => {
                  setSelectedProjectId(id)
                  setUserView('projects')
                }}
              />
            </Card>
            <Card title="Actividades abiertas" eyebrow="Ejecucion">
              <ActivityList
                activities={openActivities}
                projects={data.projects}
                onStart={(id) => void markActivityInProgress(id)}
              />
            </Card>
          </section>
        </>
      )
    }

    if (userView === 'projects') {
      return (
        <section className="split-layout">
          <Card title="Mis proyectos" eyebrow="Asignados">
            <ProjectList projects={visibleProjects} onSelect={setSelectedProjectId} />
          </Card>
          <ProjectDetail
            activities={selectedProjectActivities.filter((activity) =>
              activity.assigned_user_ids.includes(activeUser.id),
            )}
            evidence={selectedProjectEvidence.filter(
              (evidence) => evidence.submitted_by === activeUser.id,
            )}
            invoices={selectedProjectInvoices.filter(
              (invoice) => invoice.uploaded_by === activeUser.id,
            )}
            project={selectedProject}
            users={data.users}
          />
        </section>
      )
    }

    if (userView === 'activities') {
      return (
        <Card title="Mis actividades" eyebrow="Ejecucion">
          <ActivityList
            activities={visibleActivities}
            projects={data.projects}
            onStart={(id) => void markActivityInProgress(id)}
          />
        </Card>
      )
    }

    if (userView === 'upload') {
      return (
        <Card title="Subir evidencia" eyebrow="Entrega">
          <EvidenceForm activities={openActivities} projects={data.projects} onSubmit={submitEvidence} />
        </Card>
      )
    }

    return (
      <Card title="Perfil" eyebrow="Cuenta">
        <div className="profile-card">
          <span className="avatar">{activeUser.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{activeUser.name}</strong>
            <span>{activeUser.email}</span>
            <span>{source === 'database' ? 'Sincronizado con Postgres' : 'Modo demo'}</span>
          </div>
        </div>
      </Card>
    )
  }
}

function activeProjectCount(projects: Project[]) {
  return projects.filter((project) => project.status === 'ACTIVE').length
}

function assignedCount(projects: Project[], userId: string) {
  return projects.filter((project) => project.assigned_user_ids.includes(userId)).length
}

function userEvidenceCount(evidence: Evidence[], userId: string) {
  return evidence.filter((item) => item.submitted_by === userId).length
}

function projectName(projects: Project[], projectId: string) {
  return projects.find((project) => project.id === projectId)?.name ?? 'Proyecto'
}

function userName(users: AppUser[], userId: string | null) {
  return users.find((user) => user.id === userId)?.name ?? 'Sin usuario'
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Card({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function ProjectForm({
  users,
  onSubmit,
}: {
  users: AppUser[]
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="compact-form" onSubmit={onSubmit}>
      <label>
        Nombre
        <input name="name" placeholder="Nombre del proyecto" required />
      </label>
      <label>
        Descripcion
        <textarea name="description" placeholder="Alcance general" />
      </label>
      <div className="form-row">
        <label>
          Inicio
          <input name="startsAt" type="date" />
        </label>
        <label>
          Final
          <input name="endsAt" type="date" />
        </label>
      </div>
      <label>
        Responsable
        <select name="assignedUserId">
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Crear proyecto</button>
    </form>
  )
}

function EvidenceForm({
  activities,
  projects,
  onSubmit,
}: {
  activities: Activity[]
  projects: Project[]
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (activities.length === 0) {
    return <p className="empty-state">No hay actividades abiertas.</p>
  }

  return (
    <form className="upload-form" onSubmit={onSubmit}>
      <div className="form-row">
        <label>
          Actividad
          <select name="activityId">
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.title} - {projectName(projects, activity.project_id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select name="category">
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Titulo
        <input name="title" placeholder="Ej. Avance de pintura" required />
      </label>
      <label className="dropzone">
        <input name="file" type="file" />
        <span>Seleccionar archivo</span>
        <small>Fotos, PDF, XML, comprobantes o documentos</small>
      </label>
      <label>
        Descripcion
        <textarea name="description" placeholder="Describe lo realizado" />
      </label>
      <div className="action-row">
        <button name="intent" type="submit" value="DRAFT">
          Guardar borrador
        </button>
        <button name="intent" type="submit" value="SUBMITTED">
          Enviar evidencia
        </button>
      </div>
    </form>
  )
}

function ProjectList({
  projects,
  onSelect,
}: {
  projects: Project[]
  onSelect: (id: string) => void
}) {
  if (projects.length === 0) {
    return <p className="empty-state">No hay proyectos.</p>
  }

  return (
    <div className="project-list">
      {projects.map((project) => {
        const progress = progressFor(project)

        return (
          <button key={project.id} type="button" onClick={() => onSelect(project.id)}>
            <div>
              <strong>{project.name}</strong>
              <span>{project.description}</span>
              <small>{project.assigned_user_names.join(', ') || 'Sin asignar'}</small>
            </div>
            <div className="progress-block">
              <span className={statusClass(project.status)}>
                {projectStatusLabels[project.status]}
              </span>
              <meter max="100" value={progress} />
              <small>{progress}%</small>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ActivityList({
  activities,
  projects,
  onStart,
}: {
  activities: Activity[]
  projects: Project[]
  onStart: (id: string) => void
}) {
  if (activities.length === 0) {
    return <p className="empty-state">No hay actividades.</p>
  }

  return (
    <div className="activity-list">
      {activities.map((activity) => (
        <article key={activity.id}>
          <div>
            <strong>{activity.title}</strong>
            <p>{activity.description}</p>
            <span>{projectName(projects, activity.project_id)}</span>
            <small>Limite: {formatDate(activity.due_at)}</small>
          </div>
          <div className="activity-actions">
            <span className={statusClass(activity.status)}>
              {activityStatusLabels[activity.status]}
            </span>
            {activity.status !== 'COMPLETED' && activity.status !== 'CANCELLED' && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => onStart(activity.id)}
              >
                En proceso
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function EvidenceList({
  evidence,
  emptyLabel,
  onSelect,
}: {
  evidence: Evidence[]
  emptyLabel: string
  onSelect: (id: string) => void
}) {
  if (evidence.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>
  }

  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
          <div>
            <strong>{evidenceTitle(item)}</strong>
            <span>{item.file_names.join(', ') || 'Sin archivo'}</span>
            <small>{formatDate(item.submitted_at)}</small>
          </div>
          <span className={statusClass(item.status)}>
            {evidenceStatusLabels[item.status]}
          </span>
        </button>
      ))}
    </div>
  )
}

function EvidenceReview({
  evidence,
  users,
  onReview,
}: {
  evidence: Evidence | undefined
  users: AppUser[]
  onReview: (
    status: Extract<EvidenceStatus, 'APPROVED' | 'REJECTED'>,
    comment: string,
  ) => void
}) {
  const [comment, setComment] = useState(evidence?.review_comment ?? '')

  if (!evidence) {
    return (
      <Card title="Revision" eyebrow="Evidencia">
        <p className="empty-state">No hay evidencia seleccionada.</p>
      </Card>
    )
  }

  return (
    <Card title={evidenceTitle(evidence)} eyebrow="Aprobar o rechazar">
      <div className="review-panel">
        <div className="document-preview">
          <span>{categoryLabels[evidence.file_categories[0] ?? 'OTHER']}</span>
          <strong>{evidence.file_names[0] ?? 'Sin archivo'}</strong>
        </div>
        <div className="review-meta">
          <p>{evidence.description}</p>
          <span>Enviado por {userName(users, evidence.submitted_by)}</span>
          <span>Fecha: {formatDate(evidence.submitted_at)}</span>
          <span className={statusClass(evidence.status)}>
            {evidenceStatusLabels[evidence.status]}
          </span>
        </div>
        <label>
          Comentario
          <textarea
            onChange={(event) => setComment(event.target.value)}
            value={comment}
          />
        </label>
        <div className="action-row">
          <button type="button" onClick={() => onReview('REJECTED', comment)}>
            Rechazar
          </button>
          <button type="button" onClick={() => onReview('APPROVED', comment)}>
            Aprobar
          </button>
        </div>
      </div>
    </Card>
  )
}

function ProjectDetail({
  project,
  activities,
  evidence,
  invoices,
  users,
}: {
  project: Project | undefined
  activities: Activity[]
  evidence: Evidence[]
  invoices: Invoice[]
  users: AppUser[]
}) {
  if (!project) {
    return (
      <Card title="Detalle" eyebrow="Proyecto">
        <p className="empty-state">No hay proyecto seleccionado.</p>
      </Card>
    )
  }

  return (
    <Card title={project.name} eyebrow="Detalle">
      <div className="project-detail">
        <div className="summary-grid">
          <span>{project.description}</span>
          <span>{project.assigned_user_names.join(', ') || 'Sin asignar'}</span>
          <span>
            {formatDate(project.starts_at)} - {formatDate(project.ends_at)}
          </span>
          <span className={statusClass(project.status)}>
            {projectStatusLabels[project.status]}
          </span>
        </div>
        <div className="detail-columns">
          <div>
            <h3>Actividades</h3>
            {activities.length === 0 ? (
              <p>No hay actividades.</p>
            ) : (
              activities.map((activity) => (
                <p key={activity.id}>
                  {activity.title} - {activityStatusLabels[activity.status]}
                </p>
              ))
            )}
          </div>
          <div>
            <h3>Evidencias</h3>
            {evidence.length === 0 ? (
              <p>No hay evidencias.</p>
            ) : (
              evidence.map((item) => (
                <p key={item.id}>
                  {evidenceTitle(item)} - {evidenceStatusLabels[item.status]}
                </p>
              ))
            )}
          </div>
          <div>
            <h3>Facturas</h3>
            {invoices.length === 0 ? (
              <p>No hay facturas.</p>
            ) : (
              invoices.map((invoice) => (
                <p key={invoice.id}>
                  {invoice.invoice_number} - {formatMoney(invoice.total_amount)}
                </p>
              ))
            )}
          </div>
        </div>
        <p className="muted">Creado por {userName(users, project.created_by)}</p>
      </div>
    </Card>
  )
}

function InvoiceTable({
  invoices,
  projects,
  users,
}: {
  invoices: Invoice[]
  projects: Project[]
  users: AppUser[]
}) {
  if (invoices.length === 0) {
    return <p className="empty-state">No hay facturas.</p>
  }

  return (
    <div className="table-list">
      {invoices.map((invoice) => (
        <div className="table-row" key={invoice.id}>
          <strong>{invoice.invoice_number}</strong>
          <span>{projectName(projects, invoice.project_id)}</span>
          <span>{invoice.supplier_name || userName(users, invoice.uploaded_by)}</span>
          <span>{formatDate(invoice.issued_at)}</span>
          <span>{formatMoney(invoice.total_amount, invoice.currency)}</span>
          <small>{invoice.file_name}</small>
        </div>
      ))}
    </div>
  )
}

export default App
