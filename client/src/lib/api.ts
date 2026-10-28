import { API_URL } from './config'
import { supabase } from './supabase'
import type { ApiErrorBody } from './types'

export { USE_MOCKS } from './config'

/** Fired on window when the server says this device's session was replaced (PRD R20). */
export const SESSION_REVOKED_EVENT = 'encore:session-revoked'

export class ApiError extends Error {
  code: string
  status: number
  details?: any

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  opts?: { idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const { data } = await supabase.auth.getSession()
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`
  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey

  let res: Response
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.')
  }

  const json = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error
    const apiErr = new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
    )
    if (apiErr.code === 'SESSION_REVOKED') window.dispatchEvent(new Event(SESSION_REVOKED_EVENT))
    throw apiErr
  }
  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }) =>
    request<T>('POST', path, body, opts),
}
