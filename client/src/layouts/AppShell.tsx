// Basic shell for the scaffold. Polished header, profile dropdown and mobile bottom nav land in Step 5.
import { NavLink, Outlet } from 'react-router-dom'
import HoldTimerPill from '@/features/booking/HoldTimerPill'
import { useAuth } from '@/lib/auth'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'

const TABS = {
  customer: [
    { to: '/events', label: 'Events' },
    { to: '/bookings', label: 'My Bookings' },
  ],
  organiser: [
    { to: '/organiser/venues', label: 'Venues' },
    { to: '/organiser/events', label: 'My Events' },
    { to: '/organiser/host', label: 'Host Event' },
  ],
}

export default function AppShell() {
  const { user, signOut } = useAuth()
  const tabs = user?.role ? TABS[user.role] : []

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-glass-border bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <span className="bg-gradient-to-r from-primary-from to-primary-to bg-clip-text font-display text-xl font-bold text-transparent">
            {APP_NAME}
          </span>
          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition',
                    isActive ? 'bg-white/10 text-text' : 'text-muted hover:text-text',
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
            <HoldTimerPill />
            <button
              onClick={signOut}
              className="ml-2 rounded-md px-3 py-1.5 text-sm text-muted hover:text-text"
              title={user?.email}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
