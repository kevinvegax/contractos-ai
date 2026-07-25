export type SessionRole = 'super_admin' | 'admin'

export type Session = {
  role: SessionRole
  email: string
}

export type AuthState =
  | { status: 'checking'; session: null; error: null }
  | { status: 'signed_out'; session: null; error: string | null }
  | { status: 'signed_in'; session: Session; error: null }

export type SessionResponse = {
  session: Session
}
