import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarDays, MapPin } from 'lucide-react'
import { organiserApi } from '@/features/organiser/api'
import { EmptyState, ErrorState, PageHeader } from '@/features/organiser/States'
import { useAsync } from '@/features/organiser/useAsync'
import { formatINR, formatIST } from '@/lib/format'
import type { OrganiserEvent } from '@/lib/types'
import { Badge, Button, GeneratedPoster, GlassCard, Skeleton, Tabs } from '@/ui'

type Filter = 'upcoming' | 'past'

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary-from to-primary-to"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

function EventRow({ ev }: { ev: OrganiserEvent }) {
  const past = new Date(ev.endsAt) < new Date()
  return (
    <Link to={`/organiser/events/${ev.id}`}>
      <GlassCard interactive className="flex gap-4 p-4 sm:gap-5">
        <div className="w-20 shrink-0 sm:w-24">
          {ev.posterUrl ? (
            <img src={ev.posterUrl} alt="" className="aspect-[5/7] w-full rounded-md object-cover" />
          ) : (
            <GeneratedPoster title={ev.title} venueName={ev.venue.name} startsAt={ev.startsAt} eventType={ev.eventType} compact />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{ev.title}</h2>
            {past ? (
              <Badge>Ended</Badge>
            ) : ev.sold >= ev.capacity ? (
              <Badge tone="danger">Sold out</Badge>
            ) : (
              <Badge tone="success">On sale</Badge>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatIST(ev.startsAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {ev.venue.name}
            </span>
          </p>
          <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>
                  <span className="tabular font-semibold text-text">{ev.sold.toLocaleString('en-IN')}</span> /{' '}
                  {ev.capacity.toLocaleString('en-IN')} sold
                </span>
                <span className="tabular">{ev.capacity ? Math.round((ev.sold / ev.capacity) * 100) : 0}%</span>
              </div>
              <ProgressBar value={ev.sold} max={ev.capacity} />
            </div>
            <div className="sm:text-right">
              <p className="tabular text-lg font-semibold">{formatINR(ev.revenuePaise)}</p>
              <p className="text-xs text-muted">revenue</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  )
}

export default function MyEventsPage() {
  const { data, error, loading, reload } = useAsync(() => organiserApi.myEvents(), [])
  const [filter, setFilter] = useState<Filter>('upcoming')

  const now = new Date()
  const list = (data ?? [])
    .filter((e) => (filter === 'upcoming' ? new Date(e.endsAt) >= now : new Date(e.endsAt) < now))
    .sort((a, b) => (filter === 'upcoming' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="My events"
        subtitle="Sales, seats and payments for everything you host."
        action={
          <Link to="/organiser/host">
            <Button>Host an event</Button>
          </Link>
        }
      />
      <Tabs
        tabs={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
        ]}
        value={filter}
        onChange={setFilter}
        className="mb-6"
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          emoji={filter === 'upcoming' ? '🎪' : '📼'}
          title={filter === 'upcoming' ? 'No upcoming events' : 'No past events yet'}
          text={filter === 'upcoming' ? 'Pick a venue and publish your first event in a couple of minutes.' : 'Events you host will show up here after they end.'}
          action={
            filter === 'upcoming' && (
              <Link to="/organiser/host">
                <Button>Host an event</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {list.map((ev, i) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <EventRow ev={ev} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
