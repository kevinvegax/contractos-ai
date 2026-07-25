import { useCallback, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

import { createAdminAccount, listAdminAccounts } from '../api'
import type {
  AdminAccount,
  AdminsStatus,
  CreateAdminErrors,
  CreateAdminForm,
  CreateAdminStatus,
} from '../types'
import { emptyCreateAdminForm } from '../types'
import { validateCreateAdminForm } from '../../../utils/accountValidation'

export type AdminAccountsModel = {
  admins: AdminAccount[]
  adminsStatus: AdminsStatus
  adminsError: string | null
  form: CreateAdminForm
  setForm: Dispatch<SetStateAction<CreateAdminForm>>
  formErrors: CreateAdminErrors
  createStatus: CreateAdminStatus
  createMessage: string | null
  loadAdmins: () => Promise<void>
  createAdmin: (event: FormEvent<HTMLFormElement>) => Promise<void>
  reset: () => void
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useAdminAccounts(): AdminAccountsModel {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [adminsStatus, setAdminsStatus] = useState<AdminsStatus>('idle')
  const [adminsError, setAdminsError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateAdminForm>(emptyCreateAdminForm)
  const [formErrors, setFormErrors] = useState<CreateAdminErrors>({})
  const [createStatus, setCreateStatus] = useState<CreateAdminStatus>('idle')
  const [createMessage, setCreateMessage] = useState<string | null>(null)

  const loadAdmins = useCallback(async () => {
    setAdminsStatus('loading')
    setAdminsError(null)

    try {
      const payload = await listAdminAccounts()

      setAdmins(payload.admins)
      setAdminsStatus('ready')
    } catch (error) {
      setAdminsStatus('error')
      setAdminsError(getErrorMessage(error, 'Unable to load Admin accounts.'))
    }
  }, [])

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateCreateAdminForm(form)
    setFormErrors(errors)
    setCreateMessage(null)

    if (Object.keys(errors).length > 0) {
      setCreateStatus('error')
      setCreateMessage('Fix the highlighted fields before creating the account.')
      return
    }

    setCreateStatus('submitting')

    try {
      const payload = await createAdminAccount(form)

      setForm(emptyCreateAdminForm)
      setCreateStatus('success')
      setCreateMessage(
        `Admin account created. Temporary password delivered to ${payload.delivery.destination}.`,
      )
      await loadAdmins()
    } catch (error) {
      setCreateStatus('error')
      setCreateMessage(getErrorMessage(error, 'Unable to create Admin account.'))
    }
  }

  function reset() {
    setAdmins([])
    setAdminsStatus('idle')
    setAdminsError(null)
    setForm(emptyCreateAdminForm)
    setFormErrors({})
    setCreateStatus('idle')
    setCreateMessage(null)
  }

  return {
    admins,
    adminsStatus,
    adminsError,
    form,
    setForm,
    formErrors,
    createStatus,
    createMessage,
    loadAdmins,
    createAdmin,
    reset,
  }
}
