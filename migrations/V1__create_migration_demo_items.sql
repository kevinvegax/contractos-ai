BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Funciones auxiliares
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =========================================================
-- Catálogos de seguridad
-- =========================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- =========================================================
-- Usuarios
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_email_not_blank CHECK (BTRIM(email) <> ''),
    CONSTRAINT users_name_not_blank CHECK (BTRIM(name) <> '')
);

CREATE UNIQUE INDEX users_email_unique_active
    ON users (LOWER(email))
    WHERE deleted_at IS NULL;

CREATE INDEX users_role_id_idx ON users(role_id);
CREATE INDEX users_is_active_idx ON users(is_active) WHERE deleted_at IS NULL;

-- =========================================================
-- Proyectos
-- =========================================================

CREATE TYPE project_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CLOSED',
    'CANCELLED'
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'DRAFT',
    starts_at DATE,
    ends_at DATE,
    closed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT projects_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT projects_valid_date_range CHECK (
        ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at
    ),
    CONSTRAINT projects_closed_state_consistency CHECK (
        (status = 'CLOSED' AND closed_at IS NOT NULL)
        OR
        (status <> 'CLOSED')
    )
);

CREATE INDEX projects_status_idx ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX projects_created_by_idx ON projects(created_by);

CREATE TABLE project_users (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    PRIMARY KEY (project_id, user_id, assigned_at),
    CONSTRAINT project_users_valid_assignment_dates CHECK (
        unassigned_at IS NULL OR unassigned_at >= assigned_at
    )
);

CREATE UNIQUE INDEX project_users_unique_active_assignment
    ON project_users(project_id, user_id)
    WHERE unassigned_at IS NULL;

CREATE INDEX project_users_user_id_idx
    ON project_users(user_id)
    WHERE unassigned_at IS NULL;

-- =========================================================
-- Actividades
-- =========================================================

CREATE TYPE activity_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status activity_status NOT NULL DEFAULT 'PENDING',
    due_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT activities_title_not_blank CHECK (BTRIM(title) <> ''),
    CONSTRAINT activities_completed_state_consistency CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL)
        OR
        (status <> 'COMPLETED')
    )
);

CREATE INDEX activities_project_id_idx
    ON activities(project_id)
    WHERE deleted_at IS NULL;

CREATE INDEX activities_status_idx
    ON activities(status)
    WHERE deleted_at IS NULL;

CREATE TABLE activity_users (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    PRIMARY KEY (activity_id, user_id, assigned_at),
    CONSTRAINT activity_users_valid_assignment_dates CHECK (
        unassigned_at IS NULL OR unassigned_at >= assigned_at
    )
);

CREATE UNIQUE INDEX activity_users_unique_active_assignment
    ON activity_users(activity_id, user_id)
    WHERE unassigned_at IS NULL;

CREATE INDEX activity_users_user_id_idx
    ON activity_users(user_id)
    WHERE unassigned_at IS NULL;

-- =========================================================
-- Evidencias
-- =========================================================

CREATE TYPE evidence_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status evidence_status NOT NULL DEFAULT 'DRAFT',
    description TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_comment TEXT,
    revision_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT evidence_revision_positive CHECK (revision_number > 0),
    CONSTRAINT evidence_submit_state_consistency CHECK (
        (status = 'DRAFT' AND submitted_at IS NULL)
        OR
        (status <> 'DRAFT' AND submitted_at IS NOT NULL)
    ),
    CONSTRAINT evidence_review_state_consistency CHECK (
        (
            status IN ('APPROVED', 'REJECTED')
            AND reviewed_at IS NOT NULL
            AND reviewed_by IS NOT NULL
        )
        OR
        (
            status IN ('DRAFT', 'SUBMITTED')
            AND reviewed_at IS NULL
            AND reviewed_by IS NULL
        )
    ),
    CONSTRAINT evidence_reviewer_is_not_submitter CHECK (
        reviewed_by IS NULL OR reviewed_by <> submitted_by
    )
);

CREATE INDEX evidence_activity_id_idx
    ON evidence(activity_id)
    WHERE deleted_at IS NULL;

CREATE INDEX evidence_submitted_by_idx
    ON evidence(submitted_by)
    WHERE deleted_at IS NULL;

CREATE INDEX evidence_status_idx
    ON evidence(status)
    WHERE deleted_at IS NULL;

CREATE TABLE evidence_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT evidence_comments_not_blank CHECK (BTRIM(comment) <> '')
);

CREATE INDEX evidence_comments_evidence_id_idx
    ON evidence_comments(evidence_id)
    WHERE deleted_at IS NULL;

-- =========================================================
-- Archivos, documentos y facturas
-- =========================================================

CREATE TYPE file_category AS ENUM (
    'PHOTO',
    'INVOICE',
    'DOCUMENT',
    'OTHER'
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category file_category NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type VARCHAR(150) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 CHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT files_size_positive CHECK (size_bytes > 0),
    CONSTRAINT files_owner_scope CHECK (
        evidence_id IS NOT NULL OR project_id IS NOT NULL
    ),
    CONSTRAINT files_original_name_not_blank CHECK (BTRIM(original_name) <> ''),
    CONSTRAINT files_storage_key_not_blank CHECK (BTRIM(storage_key) <> '')
);

CREATE INDEX files_evidence_id_idx
    ON files(evidence_id)
    WHERE deleted_at IS NULL;

CREATE INDEX files_project_id_idx
    ON files(project_id)
    WHERE deleted_at IS NULL;

CREATE INDEX files_uploaded_by_idx
    ON files(uploaded_by)
    WHERE deleted_at IS NULL;

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    file_id UUID NOT NULL UNIQUE REFERENCES files(id) ON DELETE RESTRICT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100),
    supplier_name VARCHAR(200),
    issued_at DATE,
    total_amount NUMERIC(14, 2),
    currency CHAR(3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT invoices_total_non_negative CHECK (
        total_amount IS NULL OR total_amount >= 0
    ),
    CONSTRAINT invoices_currency_format CHECK (
        currency IS NULL OR currency ~ '^[A-Z]{3}$'
    )
);

CREATE INDEX invoices_project_id_idx
    ON invoices(project_id)
    WHERE deleted_at IS NULL;

-- =========================================================
-- Auditoría básica
-- =========================================================

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_entity_idx
    ON audit_log(entity_type, entity_id);

CREATE INDEX audit_log_user_id_idx
    ON audit_log(user_id);

CREATE INDEX audit_log_created_at_idx
    ON audit_log(created_at);

-- =========================================================
-- Triggers updated_at
-- =========================================================

CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER projects_set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER activities_set_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER evidence_set_updated_at
BEFORE UPDATE ON evidence
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER evidence_comments_set_updated_at
BEFORE UPDATE ON evidence_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invoices_set_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- Datos iniciales
-- =========================================================

INSERT INTO roles (code, name, description)
VALUES
    ('ADMIN', 'Administrador', 'Acceso administrativo completo.'),
    ('APP_USER', 'Usuario de la aplicación', 'Acceso a proyectos y actividades asignadas.');

INSERT INTO permissions (code, name) VALUES
    ('projects.create', 'Crear proyectos'),
    ('projects.update', 'Editar proyectos'),
    ('projects.close', 'Cerrar proyectos'),
    ('projects.view_all', 'Consultar todos los proyectos'),
    ('projects.view_assigned', 'Consultar proyectos asignados'),
    ('projects.view_progress', 'Consultar avance de proyectos'),
    ('users.create', 'Crear usuarios'),
    ('users.update', 'Editar usuarios'),
    ('users.assign_projects', 'Asignar usuarios a proyectos'),
    ('evidence.view_all', 'Consultar todas las evidencias'),
    ('evidence.view_own', 'Consultar evidencias propias'),
    ('evidence.upload', 'Subir evidencias'),
    ('evidence.comment', 'Agregar comentarios'),
    ('evidence.submit', 'Enviar evidencias a revisión'),
    ('evidence.review', 'Revisar evidencias'),
    ('evidence.approve', 'Aprobar evidencias'),
    ('evidence.reject', 'Rechazar evidencias'),
    ('evidence.correct', 'Corregir evidencias rechazadas'),
    ('files.download', 'Descargar archivos'),
    ('invoices.view', 'Consultar facturas'),
    ('invoices.upload', 'Subir facturas'),
    ('documents.upload', 'Subir documentos'),
    ('reports.generate', 'Generar reportes');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
    ON p.code IN (
        'projects.view_assigned',
        'evidence.view_own',
        'evidence.upload',
        'evidence.comment',
        'evidence.submit',
        'evidence.correct',
        'invoices.upload',
        'documents.upload',
        'files.download'
    )
WHERE r.code = 'APP_USER';

-- =========================================================
-- Datos demo para MVP
-- =========================================================

INSERT INTO users (id, role_id, name, email, password_hash)
VALUES
    (
        '00000000-0000-4000-8000-000000000001',
        (SELECT id FROM roles WHERE code = 'ADMIN'),
        'Ana Torres',
        'ana@constructora.mx',
        'demo-password-hash'
    ),
    (
        '00000000-0000-4000-8000-000000000002',
        (SELECT id FROM roles WHERE code = 'APP_USER'),
        'Luis Martinez',
        'luis@contratista.mx',
        'demo-password-hash'
    ),
    (
        '00000000-0000-4000-8000-000000000003',
        (SELECT id FROM roles WHERE code = 'APP_USER'),
        'Marta Lopez',
        'marta@contratista.mx',
        'demo-password-hash'
    );

INSERT INTO projects (
    id,
    name,
    description,
    status,
    starts_at,
    ends_at,
    created_by
)
VALUES
    (
        '10000000-0000-4000-8000-000000000001',
        'Remodelacion Plaza Norte',
        'Adecuacion electrica, pintura y acabados de locales.',
        'ACTIVE',
        '2026-07-01',
        '2026-08-15',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        'Residencial Encino',
        'Correccion hidrosanitaria y colocacion de piso.',
        'ACTIVE',
        '2026-06-18',
        '2026-07-28',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '10000000-0000-4000-8000-000000000003',
        'Bodega Santa Catarina',
        'Entrega de materiales, reparacion de tuberia y limpieza.',
        'DRAFT',
        '2026-07-10',
        '2026-08-05',
        '00000000-0000-4000-8000-000000000001'
    );

INSERT INTO project_users (project_id, user_id, assigned_by)
VALUES
    (
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '10000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001'
    );

INSERT INTO activities (
    id,
    project_id,
    title,
    description,
    status,
    due_at,
    created_by,
    completed_at
)
VALUES
    (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'Instalacion electrica',
        'Canalizacion, cableado y tablero principal.',
        'COMPLETED',
        '2026-07-18 18:00:00-06',
        '00000000-0000-4000-8000-000000000001',
        '2026-07-17 17:20:00-06'
    ),
    (
        '20000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        'Pintura interior',
        'Aplicacion de sellador y pintura final.',
        'IN_PROGRESS',
        '2026-07-22 18:00:00-06',
        '00000000-0000-4000-8000-000000000001',
        NULL
    ),
    (
        '20000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000002',
        'Colocacion de piso',
        'Nivelacion, adhesivo y boquilla.',
        'IN_PROGRESS',
        '2026-07-20 18:00:00-06',
        '00000000-0000-4000-8000-000000000001',
        NULL
    ),
    (
        '20000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000003',
        'Entrega de materiales',
        'Recepcion y acomodo de material en bodega.',
        'PENDING',
        '2026-07-24 18:00:00-06',
        '00000000-0000-4000-8000-000000000001',
        NULL
    );

INSERT INTO activity_users (activity_id, user_id, assigned_by)
VALUES
    (
        '20000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '20000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '20000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001'
    ),
    (
        '20000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001'
    );

INSERT INTO evidence (
    id,
    activity_id,
    submitted_by,
    status,
    description,
    submitted_at,
    reviewed_at,
    reviewed_by,
    review_comment
)
VALUES
    (
        '30000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        'SUBMITTED',
        'Tablero instalado: tablero nuevo con protecciones etiquetadas.',
        '2026-07-18 09:30:00-06',
        NULL,
        NULL,
        NULL
    ),
    (
        '30000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000003',
        'REJECTED',
        'Piso terminado area norte: faltan fotos de juntas y factura del adhesivo.',
        '2026-07-20 16:10:00-06',
        '2026-07-21 10:00:00-06',
        '00000000-0000-4000-8000-000000000001',
        'Agregar factura y una foto clara de la boquilla.'
    ),
    (
        '30000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000002',
        'APPROVED',
        'Factura pintura: compra de sellador y pintura lavable.',
        '2026-07-22 12:45:00-06',
        '2026-07-22 15:00:00-06',
        '00000000-0000-4000-8000-000000000001',
        'Factura validada.'
    );

INSERT INTO files (
    id,
    evidence_id,
    project_id,
    uploaded_by,
    category,
    original_name,
    storage_key,
    mime_type,
    size_bytes
)
VALUES
    (
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        'PHOTO',
        'tablero-final.jpg',
        'demo/plaza-norte/tablero-final.jpg',
        'image/jpeg',
        1843200
    ),
    (
        '40000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        'DOCUMENT',
        'checklist-electrico.pdf',
        'demo/plaza-norte/checklist-electrico.pdf',
        'application/pdf',
        742000
    ),
    (
        '40000000-0000-4000-8000-000000000003',
        '30000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003',
        'PHOTO',
        'piso-norte.jpg',
        'demo/residencial-encino/piso-norte.jpg',
        'image/jpeg',
        1260000
    ),
    (
        '40000000-0000-4000-8000-000000000004',
        '30000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        'INVOICE',
        'F-1048.pdf',
        'demo/plaza-norte/F-1048.pdf',
        'application/pdf',
        512000
    ),
    (
        '40000000-0000-4000-8000-000000000005',
        NULL,
        '10000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003',
        'INVOICE',
        'F-2031.pdf',
        'demo/residencial-encino/F-2031.pdf',
        'application/pdf',
        486000
    );

INSERT INTO invoices (
    id,
    project_id,
    evidence_id,
    file_id,
    uploaded_by,
    invoice_number,
    supplier_name,
    issued_at,
    total_amount,
    currency
)
VALUES
    (
        '50000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000003',
        '40000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000002',
        'F-1048',
        'Pinturas del Norte',
        '2026-07-22',
        18450.00,
        'MXN'
    ),
    (
        '50000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000002',
        NULL,
        '40000000-0000-4000-8000-000000000005',
        '00000000-0000-4000-8000-000000000003',
        'F-2031',
        'Acabados Monterrey',
        '2026-07-20',
        9700.00,
        'MXN'
    );

INSERT INTO evidence_comments (evidence_id, user_id, comment)
VALUES
    (
        '30000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
        'Agregar factura y una foto clara de la boquilla.'
    );

COMMIT;
