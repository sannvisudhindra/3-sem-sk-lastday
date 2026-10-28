import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { MapPin, Users } from 'lucide-react'
import { organiserApi } from '@/features/organiser/api'
import { ErrorState, PageHeader } from '@/features/organiser/States'
import { useAsync } from '@/features/organiser/useAsync'
import { VenueBanner, VenueTypeBadge } from '@/features/organiser/VenueVisuals'
import { Button, GlassCard, Skeleton } from '@/ui'

export default function VenuesPage() {
  const { data: venues, error, loading, reload } = useAsync(() => organiserApi.venues(), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Venues"
        subtitle="Pick a space that fits your event, then host it in a few steps."
        action={
          <Link to="/organiser/host">
            <Button>Host an event</Button>
          </Link>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading || !venues
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)
            : venues.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/organiser/venues/${v.id}`} className="block h-full">
                    <GlassCard interactive className="h-full overflow-hidden p-0">
                      <VenueBanner venue={v} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-lg font-semibold">{v.name}</h2>
                          <VenueTypeBadge type={v.venueType} />
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                          <MapPin className="h-3.5 w-3.5" /> {v.city}
                        </p>
                        <div className="mt-4 flex gap-6 text-sm">
                          <div>
                            <p className="tabular text-lg font-semibold">{v.capacity.toLocaleString('en-IN')}</p>
                            <p className="flex items-center gap-1 text-xs text-muted">
                              <Users className="h-3 w-3" /> capacity
                            </p>
                          </div>
                          <div>
                            <p className="tabular text-lg font-semibold">{v.sections.length || '—'}</p>
                            <p className="text-xs text-muted">sections</p>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
        </div>
      )}
    </div>
  )
}
