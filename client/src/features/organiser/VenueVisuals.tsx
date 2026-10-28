import { Armchair, LayoutGrid, Users } from 'lucide-react'
import type { Venue, VenueType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/ui'

export const VENUE_TYPE_META: Record<VenueType, { label: string; tone: 'primary' | 'teal' | 'warning'; icon: typeof Armchair; gradient: string; text: string }> = {
  seated: {
    label: 'Seated',
    tone: 'primary',
    icon: Armchair,
    gradient: 'linear-gradient(135deg,#FF5E62 0%,#FF9F43 100%)',
    text: 'Customers pick individual seats',
  },
  sectioned: {
    label: 'Sections',
    tone: 'teal',
    icon: LayoutGrid,
    gradient: 'linear-gradient(135deg,#14D3B5 0%,#3B82F6 100%)',
    text: 'Customers pick a section and quantity',
  },
  open: {
    label: 'Open',
    tone: 'warning',
    icon: Users,
    gradient: 'linear-gradient(135deg,#FBBF24 0%,#FB7185 100%)',
    text: 'No layout, just a ticket count',
  },
}

export function VenueTypeBadge({ type }: { type: VenueType }) {
  const m = VENUE_TYPE_META[type]
  return (
    <Badge tone={m.tone}>
      <m.icon className="h-3 w-3" /> {m.label}
    </Badge>
  )
}

/** Venue picture, or a gradient banner with the venue's section colours when there is no image. */
export function VenueBanner({ venue, className }: { venue: Venue; className?: string }) {
  const m = VENUE_TYPE_META[venue.venueType]
  if (venue.imageUrl) {
    return <img src={venue.imageUrl} alt={venue.name} className={cn('h-36 w-full object-cover', className)} />
  }
  return (
    <div className={cn('relative h-36 overflow-hidden', className)} style={{ background: m.gradient }}>
      <div
        className="absolute inset-0 opacity-15"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 12px)' }}
      />
      <div className="absolute bottom-3 left-4 flex gap-1.5">
        {venue.sections.slice(0, 8).map((s) => (
          <span key={s.id} className="h-2.5 w-6 rounded-full ring-1 ring-black/10" style={{ background: s.color }} title={s.name} />
        ))}
      </div>
      <m.icon className="absolute -right-4 -top-4 h-32 w-32 text-white/20" strokeWidth={1.2} />
    </div>
  )
}
