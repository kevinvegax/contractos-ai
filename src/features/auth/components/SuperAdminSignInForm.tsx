import type { Dispatch, FormEvent, SetStateAction } from 'react'

type SuperAdminSignInFormProps = {
  error: string | null
  login: { email: string; password: string }
  setLogin: Dispatch<SetStateAction<{ email: string; password: string }>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function SuperAdminSignInForm({
  error,
  login,
  setLogin,
  onSubmit,
}: SuperAdminSignInFormProps) {
  return (
    <form className="auth-panel" onSubmit={onSubmit}>
      <div className="section-header">
        <p className="eyebrow">Bootstrap account</p>
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
        <span>Password</span>
        <input
          type="password"
          value={login.password}
          autoComplete="current-password"
          onChange={(event) =>
            setLogin((current) => ({
              ...current,
              password: event.target.value,
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
