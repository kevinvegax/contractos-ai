import type { Dispatch, FormEvent, SetStateAction } from 'react'

type AdminSignInFormProps = {
  error: string | null
  login: { email: string; temporaryPassword: string }
  setLogin: Dispatch<
    SetStateAction<{ email: string; temporaryPassword: string }>
  >
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function AdminSignInForm({
  error,
  login,
  setLogin,
  onSubmit,
}: AdminSignInFormProps) {
  return (
    <form className="auth-panel" onSubmit={onSubmit}>
      <div className="section-header">
        <p className="eyebrow">Admin account</p>
        <h2>Sign in</h2>
      </div>

      {error && <p className="status-text error">{error}</p>}

      <label>
        <span>Email address</span>
        <input
          type="email"
          value={login.email}
          autoComplete="username"
          onChange={(event) =>
            setLogin((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
        />
      </label>

      <label>
        <span>Temporary password</span>
        <input
          type="password"
          value={login.temporaryPassword}
          autoComplete="current-password"
          onChange={(event) =>
            setLogin((current) => ({
              ...current,
              temporaryPassword: event.target.value,
            }))
          }
        />
      </label>

      <button type="submit" className="primary-button">
        Sign in
      </button>
    </form>
  )
}
