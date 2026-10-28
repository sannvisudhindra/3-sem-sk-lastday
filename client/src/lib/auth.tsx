// Auth + single active session (PRD R20).
// Flow: Supabase session → POST /session/claim → (409 EXISTING_SESSION → "switch device?" modal) → GET /me.
// The old device learns it was replaced via Realtime on user_sessions, or a SESSION_REVOKED API error.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { Monitor, ShieldAlert } from 'lucide-react'
import { ApiError, SESSION_REVOKED_EVENT, api } from './api'
import { MOCK_ROLE, USE_MOCKS } from './config'
import { formatIST } from './format'
import { supabase } from './supabase'
import type { Role } from './types'
import { Button, Modal } from '@/ui/primitives'

export interface AuthUser {
  id: string
  role: Role | null // null until a first-time Google user picks one
  username: string
  fullName: string
  email: string
}

export interface SignUpInput {
  username: string
  email: string
  password: string
  fullName: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signOut(): Promise<void>
  signInWithPassword(username: string, password: string, roleHint?: Role): Promise<void>
  signInWithGoogle(role: Role): Promise<void>
  signUp(input: SignUpInput): Promise<void>
  chooseRole(role: Role): Promise<void>
}

interface SessionConflict {
  device?: string
  since?: string
}

const PENDING_ROLE_KEY = 'encore:pending-role'

const mockUser = (role: Role, username = `${role}1`): AuthUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  role,
  username,
  fullName: role === 'organiser' ? 'Olivia Organiser' : 'Chris Customer',
  email: `${username}@encore.test`,
})

function deviceLabel(): string {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'device'
  return `${browser} · ${os}`
}

/** Supabase access tokens carry a `session_id` claim; the server compares it with user_sessions. */
function sessionIdOf(session: Session): string | null {
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.session_id ?? null
  } catch {
    return null
  }
}

function readPendingRole(): Role | null {
  try {
    const r = localStorage.getItem(PENDING_ROLE_KEY)
    return r === 'customer' || r === 'organiser' ? r : null
  } catch {
    return null
  }
}

function writePendingRole(role: Role | null) {
  try {
    if (role) localStorage.setItem(PENDING_ROLE_KEY, role)
    else localStorage.removeItem(PENDING_ROLE_KEY)
  } catch {
    // storage blocked: role onboarding page covers it
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(USE_MOCKS && MOCK_ROLE ? mockUser(MOCK_ROLE) : null)
  const [loading, setLoading] = useState(!USE_MOCKS)
  const [conflict, setConflict] = useState<SessionConflict | null>(null)
  const [revoked, setRevoked] = useState(false)
  const [switching, setSwitching] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const mockPendingRef = useRef<Role>(MOCK_ROLE ?? 'customer')

  /** Session confirmed as the active one → load (and if needed complete) the profile. */
  const loadProfile = useCallback(async () => {
    let me = await api.get<AuthUser>('/me')
    const pending = readPendingRole()
    if (!me.role && pending) {
      const res = await api.post<{ profile: AuthUser }>('/auth/role', { role: pending })
      me = res.profile
    }
    writePendingRole(null)
    setUser(me)
  }, [])

  const establish = useCallback(
    async (session: Session | null) => {
      if (!session) {
        sessionIdRef.current = null
        setUser(null)
        setLoading(false)
        return
      }
      sessionIdRef.current = sessionIdOf(session)
      try {
        await api.post('/session/claim', { force: false, deviceLabel: deviceLabel() })
        await loadProfile()
      } catch (e) {
        if (e instanceof ApiError && e.code === 'EXISTING_SESSION') {
          setConflict((e.details as SessionConflict) ?? {})
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    },
    [loadProfile],
  )

  const revoke = useCallback(async () => {
    setRevoked(true)
    setUser(null)
    if (!USE_MOCKS) await supabase.auth.signOut({ scope: 'local' })
  }, [])

  // Supabase auth events (also fires INITIAL_SESSION on load).
  useEffect(() => {
    if (USE_MOCKS) return
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer: calling Supabase from inside this callback can deadlock its auth lock.
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') setTimeout(() => establish(session), 0)
      if (event === 'SIGNED_OUT') setTimeout(() => establish(null), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [establish])

  // Any API call answered with SESSION_REVOKED → this device was replaced.
  useEffect(() => {
    const onRevoked = () => revoke()
    window.addEventListener(SESSION_REVOKED_EVENT, onRevoked)
    return () => window.removeEventListener(SESSION_REVOKED_EVENT, onRevoked)
  }, [revoke])

  // Realtime: another device claimed the session → sign out here immediately.
  useEffect(() => {
    if (USE_MOCKS || !user) return
    const channel: RealtimeChannel = supabase
      .channel(`user-session-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { session_id?: string } | null)?.session_id
          if (next && sessionIdRef.current && next !== sessionIdRef.current) revoke()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, revoke])

  async function switchHere() {
    setSwitching(true)
    try {
      if (!USE_MOCKS) {
        await api.post('/session/claim', { force: true, deviceLabel: deviceLabel() })
        await supabase.auth.signOut({ scope: 'others' })
        await loadProfile()
      } else {
        setUser(mockUser(mockPendingRef.current))
      }
      setConflict(null)
    } finally {
      setSwitching(false)
    }
  }

  async function cancelSwitch() {
    setConflict(null)
    if (!USE_MOCKS) await supabase.auth.signOut({ scope: 'local' })
  }

  async function signInWithPassword(username: string, password: string, roleHint?: Role) {
    if (USE_MOCKS) {
      const role = roleHint ?? MOCK_ROLE ?? 'customer'
      mockPendingRef.current = role
      // Type "conflict" as the username to preview the switch-device modal.
      if (username.trim().toLowerCase() === 'conflict') {
        setConflict({ device: 'Chrome · Windows', since: new Date(Date.now() - 42 * 60000).toISOString() })
        return
      }
      setUser(mockUser(role, username.trim() || `${role}1`))
      return
    }
    const tokens = await api.post<{ access_token: string; refresh_token: string }>('/auth/username-login', {
      username: username.trim(),
      password,
    })
    setLoading(true)
    // Triggers SIGNED_IN → establish() (claim + profile)
    const { error } = await supabase.auth.setSession(tokens)
    if (error) {
      setLoading(false)
      throw new ApiError(401, 'UNAUTHENTICATED', error.message)
    }
  }

  async function signInWithGoogle(role: Role) {
    if (USE_MOCKS) {
      setUser(mockUser(role))
      return
    }
    writePendingRole(role)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) throw new ApiError(400, 'OAUTH_ERROR', error.message)
  }

  async function signUp(input: SignUpInput) {
    if (USE_MOCKS) {
      setUser({ ...mockUser(input.role, input.username), fullName: input.fullName, email: input.email })
      return
    }
    await api.post('/auth/signup', input)
    await signInWithPassword(input.username, input.password)
  }

  async function chooseRole(role: Role) {
    if (USE_MOCKS) {
      setUser((u) => (u ? { ...u, role } : mockUser(role)))
      return
    }
    const res = await api.post<{ profile: AuthUser }>('/auth/role', { role })
    setUser(res.profile)
  }

  async function signOut() {
    if (!USE_MOCKS) await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signOut, signInWithPassword, signInWithGoogle, signUp, chooseRole }}
    >
      {children}

      <Modal open={!!conflict} title="You're already signed in elsewhere">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-from/15 text-primary-to">
            <Monitor className="h-6 w-6" />
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Your account is active on{' '}
            <span className="font-medium text-text">{conflict?.device ?? 'another device'}</span>
            {conflict?.since && <> since {formatIST(conflict.since)}</>}. Encore allows one active session at a
            time. Continue here and sign out there?
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={cancelSwitch} disabled={switching}>
            Cancel
          </Button>
          <Button onClick={switchHere} loading={switching}>
            Switch to this device
          </Button>
        </div>
      </Modal>

      <Modal open={revoked} title="Signed out on this device">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Your account was just opened on another device, so this session has ended. Any seats you were holding
            stay reserved until their timer runs out.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setRevoked(false)}>OK</Button>
        </div>
      </Modal>
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
