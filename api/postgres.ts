import type { IncomingMessage, ServerResponse } from 'node:http'
import { Pool, type PoolClient } from 'pg'

type DashboardQueryRunner = Pool | PoolClient

let pool: Pool | undefined

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.PRODUCTION_DATABASE_URL ??
        process.env.STAGING_DATABASE_URL ??
        process.env.DATABASE_URL ??
        'postgres://postgres:postgres@localhost:5432/postgres',
      max: 4,
    })
  }

  return pool
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function readRequestBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''

    request.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')
    })

    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

async function readJson(request: IncomingMessage) {
  const body = await readRequestBody(request)

  if (!body.trim()) {
    return {}
  }

  return JSON.parse(body) as Record<string, unknown>
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function nullableTextValue(value: unknown) {
  const text = textValue(value)

  return text ? text : null
}

function requiredText(payload: Record<string, unknown>, key: string) {
  const value = textValue(payload[key])

  if (!value) {
    throw new Error(`Campo requerido: ${key}`)
  }

  return value
}

function evidenceStatus(value: unknown) {
  return textValue(value) === 'DRAFT' ? 'DRAFT' : 'SUBMITTED'
}

function reviewStatus(value: unknown) {
  const status = textValue(value)

  if (status !== 'APPROVED' && status !== 'REJECTED') {
    throw new Error('La revision debe ser APPROVED o REJECTED')
  }

  return status
}

function fileCategory(value: unknown) {
  const category = textValue(value)

  if (
    category === 'PHOTO' ||
    category === 'INVOICE' ||
    category === 'DOCUMENT' ||
    category === 'OTHER'
  ) {
    return category
  }

  return 'PHOTO'
}

async function loadDashboard(queryRunner: DashboardQueryRunner) {
  const [
    postgresResult,
    usersResult,
    projectsResult,
    activitiesResult,
    evidenceResult,
    invoicesResult,
  ] = await Promise.all([
    queryRunner.query(`
      SELECT
        NOW()::text AS current_time,
        CURRENT_DATE::text AS current_date,
        CURRENT_DATABASE() AS database_name
    `),
    queryRunner.query(`
      SELECT
        u.id::text AS id,
        u.name,
        u.email,
        r.code AS role_code,
        u.is_active,
        u.created_at::text AS created_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
      ORDER BY
        CASE r.code WHEN 'ADMIN' THEN 0 ELSE 1 END,
        u.name
    `),
    queryRunner.query(`
      SELECT
        p.id::text AS id,
        p.name,
        COALESCE(p.description, '') AS description,
        p.status::text AS status,
        p.starts_at::text AS starts_at,
        p.ends_at::text AS ends_at,
        p.created_by::text AS created_by,
        p.created_at::text AS created_at,
        COALESCE(assignees.assigned_user_ids, ARRAY[]::text[]) AS assigned_user_ids,
        COALESCE(assignees.assigned_user_names, ARRAY[]::text[]) AS assigned_user_names,
        COALESCE(activity_stats.activity_count, 0)::int AS activity_count,
        COALESCE(activity_stats.completed_activity_count, 0)::int AS completed_activity_count,
        COALESCE(evidence_stats.evidence_count, 0)::int AS evidence_count,
        COALESCE(invoice_stats.invoice_count, 0)::int AS invoice_count
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(pu.user_id::text ORDER BY u.name) AS assigned_user_ids,
          ARRAY_AGG(u.name ORDER BY u.name) AS assigned_user_names
        FROM project_users pu
        JOIN users u ON u.id = pu.user_id
        WHERE pu.project_id = p.id
          AND pu.unassigned_at IS NULL
      ) assignees ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS activity_count,
          COUNT(*) FILTER (WHERE a.status = 'COMPLETED') AS completed_activity_count
        FROM activities a
        WHERE a.project_id = p.id
          AND a.deleted_at IS NULL
      ) activity_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS evidence_count
        FROM evidence e
        JOIN activities a ON a.id = e.activity_id
        WHERE a.project_id = p.id
          AND e.deleted_at IS NULL
      ) evidence_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS invoice_count
        FROM invoices i
        WHERE i.project_id = p.id
          AND i.deleted_at IS NULL
      ) invoice_stats ON TRUE
      WHERE p.deleted_at IS NULL
      ORDER BY
        CASE p.status
          WHEN 'ACTIVE' THEN 0
          WHEN 'DRAFT' THEN 1
          WHEN 'CLOSED' THEN 2
          ELSE 3
        END,
        p.created_at DESC
    `),
    queryRunner.query(`
      SELECT
        a.id::text AS id,
        a.project_id::text AS project_id,
        a.title,
        COALESCE(a.description, '') AS description,
        a.status::text AS status,
        a.due_at::text AS due_at,
        a.completed_at::text AS completed_at,
        a.created_by::text AS created_by,
        COALESCE(assignees.assigned_user_ids, ARRAY[]::text[]) AS assigned_user_ids,
        COALESCE(assignees.assigned_user_names, ARRAY[]::text[]) AS assigned_user_names
      FROM activities a
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(au.user_id::text ORDER BY u.name) AS assigned_user_ids,
          ARRAY_AGG(u.name ORDER BY u.name) AS assigned_user_names
        FROM activity_users au
        JOIN users u ON u.id = au.user_id
        WHERE au.activity_id = a.id
          AND au.unassigned_at IS NULL
      ) assignees ON TRUE
      WHERE a.deleted_at IS NULL
      ORDER BY a.due_at NULLS LAST, a.created_at DESC
    `),
    queryRunner.query(`
      SELECT
        e.id::text AS id,
        e.activity_id::text AS activity_id,
        a.project_id::text AS project_id,
        e.submitted_by::text AS submitted_by,
        e.status::text AS status,
        COALESCE(e.description, '') AS description,
        e.submitted_at::text AS submitted_at,
        e.reviewed_at::text AS reviewed_at,
        e.reviewed_by::text AS reviewed_by,
        COALESCE(e.review_comment, '') AS review_comment,
        e.revision_number,
        COALESCE(files.file_names, ARRAY[]::text[]) AS file_names,
        COALESCE(files.file_categories, ARRAY[]::text[]) AS file_categories,
        COALESCE(comments.comments, ARRAY[]::text[]) AS comments
      FROM evidence e
      JOIN activities a ON a.id = e.activity_id
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(f.original_name ORDER BY f.created_at) AS file_names,
          ARRAY_AGG(f.category::text ORDER BY f.created_at) AS file_categories
        FROM files f
        WHERE f.evidence_id = e.id
          AND f.deleted_at IS NULL
      ) files ON TRUE
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(ec.comment ORDER BY ec.created_at) AS comments
        FROM evidence_comments ec
        WHERE ec.evidence_id = e.id
          AND ec.deleted_at IS NULL
      ) comments ON TRUE
      WHERE e.deleted_at IS NULL
      ORDER BY e.created_at DESC
    `),
    queryRunner.query(`
      SELECT
        i.id::text AS id,
        i.project_id::text AS project_id,
        i.evidence_id::text AS evidence_id,
        i.uploaded_by::text AS uploaded_by,
        COALESCE(i.invoice_number, 'Sin folio') AS invoice_number,
        COALESCE(i.supplier_name, '') AS supplier_name,
        i.issued_at::text AS issued_at,
        COALESCE(i.total_amount, 0)::float8 AS total_amount,
        COALESCE(i.currency, 'MXN') AS currency,
        f.original_name AS file_name,
        i.created_at::text AS created_at
      FROM invoices i
      JOIN files f ON f.id = i.file_id
      WHERE i.deleted_at IS NULL
      ORDER BY i.created_at DESC
    `),
  ])

  return {
    postgres: postgresResult.rows[0],
    users: usersResult.rows,
    projects: projectsResult.rows,
    activities: activitiesResult.rows,
    evidence: evidenceResult.rows,
    invoices: invoicesResult.rows,
  }
}

async function createProject(payload: Record<string, unknown>) {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')

    const createdBy = requiredText(payload, 'createdBy')
    const assignedUserId = requiredText(payload, 'assignedUserId')
    const inserted = await client.query<{ id: string }>(
      `
        INSERT INTO projects (
          name,
          description,
          status,
          starts_at,
          ends_at,
          created_by
        )
        VALUES ($1, $2, 'ACTIVE', $3, $4, $5)
        RETURNING id::text
      `,
      [
        requiredText(payload, 'name'),
        nullableTextValue(payload.description),
        nullableTextValue(payload.startsAt),
        nullableTextValue(payload.endsAt),
        createdBy,
      ],
    )

    await client.query(
      `
        INSERT INTO project_users (project_id, user_id, assigned_by)
        VALUES ($1, $2, $3)
      `,
      [inserted.rows[0].id, assignedUserId, createdBy],
    )

    await client.query('COMMIT')

    return inserted.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function startActivity(payload: Record<string, unknown>) {
  const result = await getPool().query<{ id: string }>(
    `
      UPDATE activities
      SET status = 'IN_PROGRESS'
      WHERE id = $1
        AND deleted_at IS NULL
        AND status <> 'COMPLETED'
      RETURNING id::text
    `,
    [requiredText(payload, 'activityId')],
  )

  return result.rows[0] ?? null
}

async function reviewEvidence(payload: Record<string, unknown>) {
  const result = await getPool().query<{ id: string }>(
    `
      UPDATE evidence
      SET
        status = $2::evidence_status,
        reviewed_at = NOW(),
        reviewed_by = $3,
        review_comment = $4
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id::text
    `,
    [
      requiredText(payload, 'evidenceId'),
      reviewStatus(payload.status),
      requiredText(payload, 'reviewedBy'),
      nullableTextValue(payload.comment),
    ],
  )

  return result.rows[0] ?? null
}

async function submitEvidence(payload: Record<string, unknown>) {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')

    const activityId = requiredText(payload, 'activityId')
    const submittedBy = requiredText(payload, 'submittedBy')
    const status = evidenceStatus(payload.status)
    const activity = await client.query<{ project_id: string }>(
      `
        SELECT project_id::text
        FROM activities
        WHERE id = $1
          AND deleted_at IS NULL
      `,
      [activityId],
    )

    if (!activity.rows[0]) {
      throw new Error('Actividad no encontrada')
    }

    const evidence = await client.query<{ id: string }>(
      `
        INSERT INTO evidence (
          activity_id,
          submitted_by,
          status,
          description,
          submitted_at
        )
        VALUES (
          $1,
          $2,
          $3::evidence_status,
          $4,
          CASE WHEN $3 = 'DRAFT' THEN NULL ELSE NOW() END
        )
        RETURNING id::text
      `,
      [
        activityId,
        submittedBy,
        status,
        requiredText(payload, 'description'),
      ],
    )

    const originalName = textValue(payload.fileName, 'evidencia-demo.jpg')

    await client.query(
      `
        INSERT INTO files (
          evidence_id,
          project_id,
          uploaded_by,
          category,
          original_name,
          storage_key,
          mime_type,
          size_bytes
        )
        VALUES ($1, $2, $3, $4::file_category, $5, $6, $7, $8)
      `,
      [
        evidence.rows[0].id,
        activity.rows[0].project_id,
        submittedBy,
        fileCategory(payload.category),
        originalName,
        `demo/uploads/${evidence.rows[0].id}/${originalName}`,
        textValue(payload.mimeType, 'application/octet-stream'),
        Number(payload.sizeBytes) > 0 ? Number(payload.sizeBytes) : 1,
      ],
    )

    await client.query('COMMIT')

    return evidence.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function handlePost(payload: Record<string, unknown>) {
  const action = textValue(payload.action)

  if (action === 'create_project') {
    return createProject(payload)
  }

  if (action === 'start_activity') {
    return startActivity(payload)
  }

  if (action === 'review_evidence') {
    return reviewEvidence(payload)
  }

  if (action === 'submit_evidence') {
    return submitEvidence(payload)
  }

  throw new Error(`Accion no soportada: ${action}`)
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    if (request.method === 'GET') {
      sendJson(response, 200, await loadDashboard(getPool()))
      return
    }

    if (request.method === 'POST') {
      const result = await handlePost(await readJson(request))

      sendJson(response, 200, { ok: true, result })
      return
    }

    response.setHeader('allow', 'GET, POST')
    sendJson(response, 405, { error: 'Metodo no permitido' })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const statusCode = request.method === 'POST' ? 400 : 500

    sendJson(response, statusCode, {
      error: 'No se pudo ejecutar la consulta en Postgres',
      detail,
    })
  }
}
