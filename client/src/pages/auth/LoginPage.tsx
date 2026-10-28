import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { USE_MOCKS } from '@/lib/config'
import type { Role } from '@/lib/types'
import { Button, Input, Tabs } from '@/ui'
import AuthLayout from './AuthLayout'
import { ROLE_TABS, authErrorMessage } from './authShared'
import GoogleButton from './GoogleButton'

export default function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const [role, setRole] = useState<Role>('customer')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!USE_MOCKS && (!username.trim() || !password)) {
      setError('Enter your username and password.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await signInWithPassword(username, password, role)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle() {
    setError(null)
    try {
      await signInWithGoogle(role)
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">
        {role === 'customer' ? 'Sign in to book your next night out.' : 'Sign in to host and manage events.'}
      </p>

      <Tabs tabs={ROLE_TABS} value={role} onChange={setRole} className="mt-6 flex w-full" />

      <div className="mt-6">
        <GoogleButton onClick={onGoogle} disabled={busy} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-glass-border" /> or <span className="h-px flex-1 bg-glass-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-primary-to hover:underline">
          Create an account
        </Link>
      </p>
      {USE_MOCKS && (
        <p className="mt-4 rounded-md border border-dashed border-glass-border px-3 py-2 text-center text-xs text-muted">
          Mock mode: any username works. Type <code className="text-text">conflict</code> to preview the
          switch-device prompt.
        </p>
      )}
    </AuthLayout>
  )
}
