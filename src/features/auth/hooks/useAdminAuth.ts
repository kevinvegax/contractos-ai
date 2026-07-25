import { useEffect, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

import {
  createAdminSession,
  destroyAdminSession,
  getAdminSession,
} from '../api'
import type { AuthState } from '../types'

export type AdminAuthModel = {
  auth: AuthState
  login: { email: string; temporaryPassword: string }
  setLogin: Dispatch<
    SetStateAction<{ email: string; temporaryPassword: string }>
  >
  signIn: (event: FormEvent<HTMLFormElement>) => Promise<void>
  signOut: () => Promise<void>
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useAdminAuth(): AdminAuthModel {
  const [auth, setAuth] = useState<AuthState>({
    status: 'checking',
    session: null,
    error: null,
  })
  const [login, setLogin] = useState({
    email: '',
    temporaryPassword: '',
  })

  useEffect(() => {
    let ignore = false

    async function checkSession() {
      try {
        const payload = await getAdminSession()

        if (!ignore) {
          setAuth({
            status: 'signed_in',
            session: payload.session,
            error: null,
          })
        }
      } catch {
        if (!ignore) {
          setAuth({ status: 'signed_out', session: null, error: null })
        }
      }
    }

    void checkSession()

    return () => {
      ignore = true
    }
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuth({ status: 'signed_out', session: null, error: null })

    try {
      const payload = await createAdminSession(login)

      setAuth({
        status: 'signed_in',
        session: payload.session,
        error: null,
      })
      setLogin((current) => ({ ...current, temporaryPassword: '' }))
    } catch (error) {
      setAuth({
        status: 'signed_out',
        session: null,
        error: getErrorMessage(error, 'Unable to sign in.'),
      })
    }
  }

  async function signOut() {
    await destroyAdminSession().catch(() => undefined)

    setAuth({ status: 'signed_out', session: null, error: null })
  }

  return {
    auth,
    login,
    setLogin,
    signIn,
    signOut,
  }
}
