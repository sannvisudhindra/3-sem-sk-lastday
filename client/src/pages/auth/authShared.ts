import { ApiError } from '@/lib/api'

export const ROLE_TABS = [
  { value: 'customer' as const, label: 'Customer' },
  { value: 'organiser' as const, label: 'Organiser' },
]

export function authErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'UNAUTHENTICATED' || e.status === 401) return 'Wrong username or password.'
    if (e.code === 'RATE_LIMITED') return 'Too many attempts. Wait a minute and try again.'
    return e.message
  }
  return 'Something went wrong. Please try again.'
}
