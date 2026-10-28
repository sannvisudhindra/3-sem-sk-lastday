import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Input, Tabs } from '@/ui'
import AuthLayout from './AuthLayout'
import { ROLE_TABS, authErrorMessage } from './authShared'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function passwordScore(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STRENGTH = [
  { label: 'Too weak', color: 'bg-danger' },
  { label: 'Weak', color: 'bg-danger' },
  { label: 'Okay', color: 'bg-warning' },
  { label: 'Good', color: 'bg-secondary-from' },
  { label: 'Strong', color: 'bg-success' },
]

export default function SignupPage() {
  const { signUp } = useAuth()
  const [role, setRole] = useState<Role>('customer')
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' })
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'username' ? e.target.value.toLowerCase() : e.target.value }))

  const errors = useMemo(
    () => ({
      fullName: form.fullName.trim().length < 2 ? 'Enter your name' : undefined,
      username: !USERNAME_RE.test(form.username) ? '3–20 characters: a–z, 0–9 or _' : undefined,
      email: !EMAIL_RE.test(form.email) ? 'Enter a valid email' : undefined,
      password: form.password.length < 8 ? 'At least 8 characters' : undefined,
    }),
    [form],
  )
  const valid = !Object.values(errors).some(Boolean)
  const score = passwordScore(form.password)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    setServerError(null)
    setBusy(true)
    try {
      await signUp({ ...form, fullName: form.fullName.trim(), role })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setServerError(err.message)
      else setServerError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined)

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold">Create your account</h2>
      <p className="mt-1 text-sm text-muted">One account, one role. Pick how you'll use Encore.</p>

      <Tabs tabs={ROLE_TABS} value={role} onChange={setRole} className="mt-6 flex w-full" />

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={show('fullName')} />
        <Input
          label="Username"
          autoComplete="username"
          value={form.username}
          onChange={set('username')}
          error={show('username')}
          hint={form.username && !errors.username ? <span className="text-success">✓ Looks good</span> : undefined}
        />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={show('email')} />
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={show('password')}
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn('h-1 flex-1 rounded-full bg-white/10 transition', i < score && STRENGTH[score].color)}
                  />
                ))}
              </div>
              <span className="text-xs text-muted">{STRENGTH[score].label}</span>
            </div>
          )}
        </div>
        {serverError && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create {role} account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-to hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
