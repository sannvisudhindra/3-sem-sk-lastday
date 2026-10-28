import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Info, MapPin, Users } from 'lucide-react'
import SeatMap from '@/features/booking/SeatMap'
import { organiserApi } from '@/features/organiser/api'
import { ErrorState } from '@/features/organiser/States'
import { useAsync } from '@/features/organiser/useAsync'
import { VENUE_TYPE_META, VenueBanner, VenueTypeBadge } from '@/features/organiser/VenueVisuals'
import { formatIST } from '@/lib/format'
import { Badge, Button, GlassCard, Skeleton } from '@/ui'

export default function VenueDetailPage() {
  const { id = '' } = useParams()
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([organiserApi.venue(id), organiserApi.myEvents()]),
    [id],
  )

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <ErrorState error={error} onRetry={reload} />
      </div>
    )
  }
  if (loading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const [venue, events] = data
  const upcoming = events
    .filter((e) => e.venue.name === venue.name && new Date(e.endsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const meta = VENUE_TYPE_META[venue.venueType]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/organiser/venues" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> All venues
      </Link>

      <GlassCard className="overflow-hidden p-0">
        <VenueBanner venue={venue} className="h-44" />
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{venue.name}</h1>
              <VenueTypeBadge type={venue.venueType} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-3.5 w-3.5" /> {venue.address ?? venue.city}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary-to" />
              <span className="tabular font-semibold">{venue.capacity.toLocaleString('en-IN')}</span>
              <span className="text-muted">capacity · {meta.text.toLowerCase()}</span>
            </p>
          </div>
          <Link to={`/organiser/host?venue=${venue.id}`}>
            <Button size="lg">Host an event here</Button>
          </Link>
        </div>
      </GlassCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold">Layout</h2>
          {venue.layout ? (
            <SeatMap layout={venue.layout} readOnly />
          ) : (
            <div className="flex aspect-[5/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-glass-border text-center">
              <Users className="h-10 w-10 text-muted" />
              <p className="font-semibold">No fixed layout</p>
              <p className="max-w-xs text-sm text-muted">
                Open floor for up to {venue.capacity} guests. Customers just choose how many tickets they need.
              </p>
            </div>
          )}
        </GlassCard>

        <div className="space-y-6">
          {venue.sections.length > 0 && (
            <GlassCard className="p-0">
              <h2 className="px-5 pt-5 text-lg font-semibold">Sections</h2>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-5 py-2 text-right font-medium">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {venue.sections.map((s) => (
                    <tr key={s.id} className="border-t border-glass-border">
                      <td className="px-5 py-2.5">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </td>
                      <td className="px-2 py-2.5 capitalize text-muted">{s.kind}</td>
                      <td className="tabular px-5 py-2.5 text-right">{s.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          )}

          <GlassCard>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Info className="h-4 w-4 text-secondary-from" /> Venue instructions
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{venue.instructions || 'No special instructions.'}</p>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold">Your upcoming events here</h2>
            {upcoming.length ? (
              <ul className="mt-3 space-y-2">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/organiser/events/${e.id}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] px-3 py-2.5 text-sm hover:bg-white/[0.06]"
                    >
                      <span className="font-medium">{e.title}</span>
                      <Badge>{formatIST(e.startsAt)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Nothing scheduled yet. The venue is free for you.</p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
