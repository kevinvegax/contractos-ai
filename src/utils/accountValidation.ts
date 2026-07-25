import type {
  CreateAdminErrors,
  CreateAdminForm,
} from '../features/users/types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCreateAdminForm(form: CreateAdminForm) {
  const errors: CreateAdminErrors = {}

  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required.'
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required.'
  }

  if (!form.email.trim()) {
    errors.email = 'Email address is required.'
  } else if (!emailPattern.test(form.email.trim().toLowerCase())) {
    errors.email = 'Enter a valid email address.'
  }

  return errors
}
