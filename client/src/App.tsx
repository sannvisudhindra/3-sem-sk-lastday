// Router: every route from WORK_DISTRIBUTION §4.5. Owned by P4 — P3 only fills in page files.
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppShell from '@/layouts/AppShell'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'

import LoginPage from '@/pages/auth/LoginPage'
import RoleOnboardingPage from '@/pages/auth/RoleOnboardingPage'
import SignupPage from '@/pages/auth/SignupPage'

import BookingPage from '@/pages/customer/BookingPage'
import CheckoutPage from '@/pages/customer/CheckoutPage'
import EventsPage from '@/pages/customer/EventsPage'
import MockPayPage from '@/pages/customer/MockPayPage'
import MyBookingsPage from '@/pages/customer/MyBookingsPage'
import WaitingRoomPage from '@/pages/customer/WaitingRoomPage'

import EventDashboardPage from '@/pages/organiser/EventDashboardPage'
import HostEventPage from '@/pages/organiser/HostEventPage'
import MyEventsPage from '@/pages/organiser/MyEventsPage'
import VenueDetailPage from '@/pages/organiser/VenueDetailPage'
import VenuesPage from '@/pages/organiser/VenuesPage'

const HOME: Record<Role, string> = { customer: '/events', organiser: '/organiser/venues' }

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary-from" />
    </div>
  )
}

/** Signed in (any role, or no role yet for first-time Google users). */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

/** Signed in with a specific role; otherwise bounce to the right home. */
function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!user.role) return <Navigate to="/onboarding/role" replace />
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />
  return <Outlet />
}

/** Public-only pages (login/signup): signed-in users go home. */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user?.role) return <Navigate to={HOME[user.role]} replace />
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!user.role) return <Navigate to="/onboarding/role" replace />
  return <Navigate to={HOME[user.role]} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
        <Route path="/onboarding/role" element={<RequireAuth><RoleOnboardingPage /></RequireAuth>} />
        {/* Public: opened from the QR code / email link, possibly on another device */}
        <Route path="/pay/:token" element={<MockPayPage />} />

        <Route element={<AppShell />}>
          <Route element={<RequireRole role="customer" />}>
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id/queue" element={<WaitingRoomPage />} />
            <Route path="/events/:id/book" element={<BookingPage />} />
            <Route path="/checkout/:holdId" element={<CheckoutPage />} />
            <Route path="/bookings" element={<MyBookingsPage />} />
          </Route>
          <Route element={<RequireRole role="organiser" />}>
            <Route path="/organiser/venues" element={<VenuesPage />} />
            <Route path="/organiser/venues/:id" element={<VenueDetailPage />} />
            <Route path="/organiser/host" element={<HostEventPage />} />
            <Route path="/organiser/events" element={<MyEventsPage />} />
            <Route path="/organiser/events/:id" element={<EventDashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
