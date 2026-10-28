// Organiser event dashboard (PRD §8.3 P-10, §11). Every number comes from the server's /stats view;
// the UI only formats it. Auto-refreshes every 10 s.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CalendarDays, Clock, IndianRupee, MapPin, RefreshCw, Ticket, Users } from 'lucide-react'
import SeatMap from '@/features/booking/SeatMap'
import { organiserApi } from '@/features/organiser/api'
import { ErrorState } from '@/features/organiser/States'
import { useAsync } from '@/features/organiser/useAsync'
import { formatINR, formatIST } from '@/lib/format'
import type { OrganiserPayment } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge, Button, GlassCard, Skeleton, Tabs } from '@/ui'

const REFRESH_MS = 10_000

const fmtN = (n: number) => n.toLocaleString('en-IN')
const timeAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h ago` : formatIST(iso)
}

const PAYMENT_TONE: Record<OrganiserPayment['status'], 'success' | 'danger' | 'warning' | 'neutral'> = {
  succeeded: 'success',
  failed: 'danger',
  expired: 'warning',
  pending: 'neutral',
}
const FAILURE_TEXT: Record<string, string> = {
  TIMEOUT: 'Timed out (60 s)',
  OTP_LOCKED: '3 wrong OTPs',
  HOLD_EXPIRED: 'Hold expired',
  SUPERSEDED: 'Replaced by retry',
}

function Kpi({ icon, label, value, sub, accent, live }: { icon: ReactNode; label: string; value: string; sub?: string; accent: string; live?: boolean }) {
  return (
    <GlassCard tint={accent} className="p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          {icon} {label}
        </span>
        {live && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-warning">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" /> live
          </span>
        )}
      </div>
      <motion.p key={value} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="tabular mt-2 text-2xl font-bold">
        {value}
      </motion.p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </GlassCard>
  )
}

export default function EventDashboardPage() {
  const { id = '' } = useParams()
  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([
        organiserApi.event(id),
        organiserApi.stats(id),
        organiserApi.bookings(id),
        organiserApi.payments(id),
      ]),
    [id],
  )
  const seatMap = useAsync(() => organiserApi.seatMap(id).catch(() => null), [id])
  const [tab, setTab] = useState<'bookings' | 'payments'>('bookings')
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    await Promise.all([reload({ silent: true }), seatMap.reload({ silent: true })])
    setUpdatedAt(new Date())
    setRefreshing(false)
  }

  useEffect(() => {
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState error={error} onRetry={reload} />
      </div>
    )
  }
  if (loading || !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const [ev, stats, bookings, payments] = data
  const soldPct = stats.capacity ? (stats.sold / stats.capacity) * 100 : 0
  const heldPct = stats.capacity ? (stats.heldNow / stats.capacity) * 100 : 0
  const attemptsTotal = stats.attempts.succeeded + stats.attempts.failed + stats.attempts.expired
  const layout = seatMap.data?.detail?.venue?.layout

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/organiser/events" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> My events
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{ev.title}</h1>
            <Badge tone="primary">{ev.eventType}</Badge>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatIST(ev.startsAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {ev.venue.name}, {ev.venue.city}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>Updated {updatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Capacity" value={fmtN(stats.capacity)} accent="var(--tint-sky)" />
        <Kpi icon={<Ticket className="h-3.5 w-3.5" />} label="Sold" value={fmtN(stats.sold)} sub={`${soldPct.toFixed(1)}% of capacity`} accent="var(--tint-coral)" />
        <Kpi icon={<Clock className="h-3.5 w-3.5" />} label="Held now" value={fmtN(stats.heldNow)} sub="in 3-min holds" accent="var(--tint-amber)" live />
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Available" value={fmtN(stats.available)} accent="var(--tint-teal)" />
        <Kpi icon={<IndianRupee className="h-3.5 w-3.5" />} label="Revenue" value={formatINR(stats.revenuePaise)} sub="successful payments" accent="var(--tint-lime)" />
        <Kpi icon={<Ticket className="h-3.5 w-3.5" />} label="Bookings" value={fmtN(stats.bookings)} accent="var(--tint-rose)" />
      </div>

      {/* Capacity bar */}
      <GlassCard className="mt-6 p-5">
        <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>Capacity breakdown</span>
          <span className="flex gap-4">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary-from" /> Sold</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-warning" /> Held</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-white/20" /> Available</span>
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-gradient-to-r from-primary-from to-primary-to" animate={{ width: `${soldPct}%` }} transition={{ duration: 0.6 }} />
          <motion.div className="h-full bg-warning" animate={{ width: `${heldPct}%` }} transition={{ duration: 0.6 }} />
        </div>
      </GlassCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Sections */}
        <GlassCard className="overflow-x-auto p-0">
          <h2 className="px-5 pt-5 text-lg font-semibold">By section</h2>
          <table className="mt-3 w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Section</th>
                <th className="px-2 py-2 text-right font-medium">Price</th>
                <th className="px-2 py-2 text-right font-medium">Cap.</th>
                <th className="px-2 py-2 text-right font-medium">Sold</th>
                <th className="px-2 py-2 text-right font-medium">Held</th>
                <th className="px-2 py-2 text-right font-medium">Avail.</th>
                <th className="px-5 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats.sections.map((s) => (
                <tr key={s.sectionId} className="border-t border-glass-border">
                  <td className="px-5 py-3">
                    <p className="font-medium">{s.name}</p>
                    <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-primary-from" style={{ width: `${s.capacity ? (s.sold / s.capacity) * 100 : 0}%` }} />
                    </div>
                  </td>
                  <td className="tabular px-2 py-3 text-right text-muted">{formatINR(s.pricePaise)}</td>
                  <td className="tabular px-2 py-3 text-right">{fmtN(s.capacity)}</td>
                  <td className="tabular px-2 py-3 text-right">{fmtN(s.sold)}</td>
                  <td className="tabular px-2 py-3 text-right text-warning">{fmtN(s.heldNow)}</td>
                  <td className="tabular px-2 py-3 text-right">{fmtN(s.available)}</td>
                  <td className="tabular px-5 py-3 text-right font-medium">{formatINR(s.revenuePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        {/* Payment attempts */}
        <GlassCard>
          <h2 className="text-lg font-semibold">Payment attempts</h2>
          <p className="text-xs text-muted">{fmtN(attemptsTotal)} total</p>
          <div className="mt-5 space-y-4">
            {(
              [
                ['Succeeded', stats.attempts.succeeded, 'bg-success'],
                ['Failed', stats.attempts.failed, 'bg-danger'],
                ['Expired', stats.attempts.expired, 'bg-warning'],
              ] as const
            ).map(([label, n, color]) => (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular font-semibold">{fmtN(n)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${attemptsTotal ? (n / attemptsTotal) * 100 : 0}%` }} transition={{ duration: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted">
            Conversion: <span className="tabular font-semibold text-text">{attemptsTotal ? ((stats.attempts.succeeded / attemptsTotal) * 100).toFixed(0) : 0}%</span> of
            payment attempts
          </p>
        </GlassCard>
      </div>

      {ev.seatingMode === 'assigned' && layout && (
        <GlassCard className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Seat map</h2>
          <div className="mx-auto max-w-3xl">
            <SeatMap layout={layout} seats={seatMap.data?.seats ?? []} readOnly highlightBooked />
          </div>
        </GlassCard>
      )}

      {/* Bookings / payments tables */}
      <GlassCard className="mt-6 p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-semibold">Activity</h2>
          <Tabs
            tabs={[
              { value: 'bookings', label: 'Recent bookings' },
              { value: 'payments', label: 'Payments' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          {tab === 'bookings' ? (
            bookings.length ? (
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Ticket</th>
                    <th className="px-2 py-2 font-medium">Customer</th>
                    <th className="px-2 py-2 font-medium">Seats</th>
                    <th className="px-2 py-2 text-right font-medium">Qty</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="px-5 py-2 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.ticketCode} className="border-t border-glass-border">
                      <td className="px-5 py-3 font-mono text-xs">{b.ticketCode}</td>
                      <td className="px-2 py-3">{b.customerName}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {b.seats.map((s) => (
                            <Badge key={s}>{s}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="tabular px-2 py-3 text-right">{b.ticketCount}</td>
                      <td className="tabular px-2 py-3 text-right font-medium">{formatINR(b.totalPaise)}</td>
                      <td className="px-5 py-3 text-right text-muted">{timeAgo(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-5 pb-8 pt-4 text-sm text-muted">No bookings yet. They'll appear here as soon as someone pays.</p>
            )
          ) : payments.length ? (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Attempt</th>
                  <th className="px-2 py-2 font-medium">Reason</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-5 py-2 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-t border-glass-border">
                    <td className="px-5 py-3">
                      <Badge tone={PAYMENT_TONE[p.status]} className="capitalize">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">{p.method === 'upi_qr' ? 'UPI QR' : 'Net banking'}</td>
                    <td className="tabular px-2 py-3">#{p.attemptNo}</td>
                    <td className="px-2 py-3 text-muted">{p.failureReason ? (FAILURE_TEXT[p.failureReason] ?? p.failureReason) : '—'}</td>
                    <td className="tabular px-2 py-3 text-right">{formatINR(p.amountPaise)}</td>
                    <td className="px-5 py-3 text-right text-muted">{timeAgo(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 pb-8 pt-4 text-sm text-muted">No payment attempts yet.</p>
          )}
        </div>
        <div className="h-3" />
      </GlassCard>
    </div>
  )
}
