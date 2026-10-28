// Logged-in shell (PRD §8.2): sticky glass header (logo left; tabs + hold timer + profile right)
// and a floating bottom nav on mobile.
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Building2, CalendarDays, CalendarPlus, Sparkles, Ticket, type LucideIcon } from 'lucide-react'
import HoldTimerPill from '@/features/booking/HoldTimerPill'
import { useAuth } from '@/lib/auth'
import { APP_NAME } from '@/lib/config'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuroraBackground } from '@/ui'
import ProfileMenu from './ProfileMenu'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  primary?: boolean
}

const TABS: Record<Role, Tab[]> = {
  customer: [
    { to: '/events', label: 'Events', icon: Sparkles },
    { to: '/bookings', label: 'My Bookings', icon: Ticket },
  ],
  organiser: [
    { to: '/organiser/venues', label: 'Venues', icon: Building2 },
    { to: '/organiser/events', label: 'My Events', icon: CalendarDays },
    { to: '/organiser/host', label: 'Host Event', icon: CalendarPlus, primary: true },
  ],
}

export default function AppShell() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const tabs = user?.role ? TABS[user.role] : []

  return (
    <div className="min-h-screen">
      <AuroraBackground />
      <header className="sticky top-0 z-40 border-b border-glass-border bg-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/" className="text-gradient font-display text-2xl font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              {tabs.map((t) =>
                t.primary ? (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className="btn-shine relative ml-2 inline-flex h-9 items-center gap-2 overflow-hidden rounded-md bg-gradient-to-r from-primary-from to-primary-to px-4 text-sm font-semibold text-[#1A0F0A]"
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                  </NavLink>
                ) : (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) =>
                      cn(
                        'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'text-text' : 'text-muted hover:text-text',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="header-tab"
                            className="absolute inset-0 rounded-md bg-white/10"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative">{t.label}</span>
                      </>
                    )}
                  </NavLink>
                ),
              )}
            </nav>
            <HoldTimerPill />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main className="pb-28 md:pb-12">
        <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      {tabs.length > 0 && (
        <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 md:hidden">
          <div className="flex items-center gap-1 rounded-full border border-glass-border bg-bg-elev/80 p-1.5 shadow-2xl backdrop-blur-xl">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-w-20 flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'text-text' : 'text-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="bottom-tab"
                        className="absolute inset-0 rounded-full bg-white/10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <t.icon className={cn('relative h-5 w-5', isActive && 'text-primary-to')} />
                    <span className="relative">{t.label.replace('My ', '')}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
