import { useEffect, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

import {
  createSuperAdminSession,
  destroySuperAdminSession,
  getSuperAdminSession,
} from '../api'
import type { AuthState } from '../types'

type UseSuperAdminAuthOptions = {
  afterSignIn?: () => Promise<void>
  afterSignOut?: () => void
}

export type SuperAdminAuthModel = {
  auth: AuthState
  login: { email: string; password: string }
  setLogin: Dispatch<SetStateAction<{ email: string; password: string }>>
  signIn: (event: FormEvent<HTMLFormElement>) => Promise<void>
  signOut: () => Promise<void>
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useSuperAdminAuth({
  afterSignIn,
  afterSignOut,
}: UseSuperAdminAuthOptions = {}): SuperAdminAuthModel {
  const [auth, setAuth] = useState<AuthState>({
    status: 'checking',
    session: null,
    error: null,
  })
  const [login, setLogin] = useState({ email: '', password: '' })

  useEffect(() => {
    let ignore = false

    async function checkSession() {
      try {
        const payload = await getSuperAdminSession()

        if (ignore) {
          return
        }

        setAuth({
          status: 'signed_in',
          session: payload.session,
          error: null,
        })

        await afterSignIn?.()
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
  }, [afterSignIn])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuth({ status: 'signed_out', session: null, error: null })

    try {
      const payload = await createSuperAdminSession(login)

      setAuth({
        status: 'signed_in',
        session: payload.session,
        error: null,
      })
      setLogin((current) => ({ ...current, password: '' }))
      await afterSignIn?.()
    } catch (error) {
      setAuth({
        status: 'signed_out',
        session: null,
        error: getErrorMessage(error, 'Unable to sign in.'),
      })
    }
  }

  async function signOut() {
    await destroySuperAdminSession().catch(() => undefined)

    setAuth({ status: 'signed_out', session: null, error: null })
    afterSignOut?.()
  }

  return {
    auth,
    login,
    setLogin,
    signIn,
    signOut,
  }
}
