// STUB (scaffold). Real gradient poster lands in P4 Step 6. Props are final.
import { formatIST } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface GeneratedPosterProps {
  title: string
  venueName: string
  startsAt: string
  eventType: string
  className?: string
}

export function GeneratedPoster({ title, venueName, startsAt, eventType, className }: GeneratedPosterProps) {
  return (
    <div
      className={cn(
        'flex aspect-[5/7] flex-col justify-end rounded-lg bg-gradient-to-br from-primary-from to-secondary-to p-5',
        className,
      )}
    >
      <span className="text-xs uppercase tracking-widest text-white/80">{eventType}</span>
      <h3 className="text-2xl font-bold text-white">{title}</h3>
      <p className="text-sm text-white/80">{venueName}</p>
      <p className="text-sm text-white/80">{formatIST(startsAt)}</p>
    </div>
  )
}

export default GeneratedPoster
