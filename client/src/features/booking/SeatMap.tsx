// STUB created by P4's scaffold. OWNED BY P3 — replace freely. Props are the contract (WORK_DISTRIBUTION §4.4).
import type { Seat, SectionInfo, VenueLayout } from '@/lib/types'

export interface SeatMapProps {
  layout: VenueLayout
  seats?: Seat[]
  sections?: SectionInfo[]
  selected?: string[]
  onToggleSeat?(id: string): void
  onSelectSection?(id: string): void
  readOnly?: boolean
  highlightBooked?: boolean
}

export default function SeatMap(props: SeatMapProps) {
  return (
    <div className="flex aspect-[5/4] items-center justify-center rounded-lg border border-dashed border-glass-border text-sm text-muted">
      Seat map ({props.layout.sections.length} sections){props.readOnly ? ' · read only' : ''}
    </div>
  )
}
