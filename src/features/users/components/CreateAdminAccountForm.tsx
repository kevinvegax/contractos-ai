import type { Dispatch, FormEvent, SetStateAction } from 'react'

import type {
  CreateAdminErrors,
  CreateAdminForm,
  CreateAdminStatus,
} from '../types'

type CreateAdminAccountFormProps = {
  form: CreateAdminForm
  errors: CreateAdminErrors
  status: CreateAdminStatus
  message: string | null
  setForm: Dispatch<SetStateAction<CreateAdminForm>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function CreateAdminAccountForm({
  form,
  errors,
  status,
  message,
  setForm,
  onSubmit,
}: CreateAdminAccountFormProps) {
  return (
    <form className="workspace-panel" onSubmit={onSubmit}>
      <div className="section-header">
        <p className="eyebrow">Create account</p>
        <h2>New Admin</h2>
      </div>

      {message && (
        <p
          className={
            status === 'success' ? 'status-text success' : 'status-text error'
          }
        >
          {message}
        </p>
      )}

      <div className="form-grid">
        <label>
          <span>First name</span>
          <input
            type="text"
            value={form.firstName}
            aria-invalid={Boolean(errors.firstName)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
          {errors.firstName && <small>{errors.firstName}</small>}
        </label>

        <label>
          <span>Last name</span>
          <input
            type="text"
            value={form.lastName}
            aria-invalid={Boolean(errors.lastName)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
          {errors.lastName && <small>{errors.lastName}</small>}
        </label>

        <label className="full-width">
          <span>Email address</span>
          <input
            type="email"
            value={form.email}
            aria-invalid={Boolean(errors.email)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
          {errors.email && <small>{errors.email}</small>}
        </label>
      </div>

      <button
        type="submit"
        className="primary-button"
        disabled={status === 'submitting'}
      >
        <span aria-hidden="true">+</span>
        {status === 'submitting' ? 'Creating' : 'Create Admin'}
      </button>
    </form>
  )
}
