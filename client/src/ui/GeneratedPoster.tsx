// Fallback poster when an organiser uploads none (PRD §8.3 P-9): gradient by event type,
// big title, venue and date/time, with a soft pattern. Props are the contract P3 relies on.
import { formatIST } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface GeneratedPosterProps {
  title: string
  venueName: string
  startsAt: string
  eventType: string
  className?: string
  /** Thumbnail mode: title only, small padding (lists, tables). */
  compact?: boolean
}

const THEMES: Record<string, { from: string; to: string; glow: string; emoji: string }> = {
  concert: { from: '#FF5E62', to: '#FF9F43', glow: '#FFD166', emoji: '🎤' },
  comedy: { from: '#F59E0B', to: '#FB7185', glow: '#FDE68A', emoji: '😂' },
  sports: { from: '#14D3B5', to: '#3B82F6', glow: '#A7F3D0', emoji: '🏏' },
  theatre: { from: '#FB7185', to: '#7C3AED', glow: '#FBCFE8', emoji: '🎭' },
  festival: { from: '#38BDF8', to: '#14D3B5', glow: '#BAE6FD', emoji: '🎪' },
  workshop: { from: '#A3E635', to: '#14B8A6', glow: '#ECFCCB', emoji: '🛠️' },
}
const DEFAULT_THEME = { from: '#FF5E62', to: '#3B82F6', glow: '#FFD166', emoji: '✨' }

function themeFor(eventType: string) {
  const key = eventType.toLowerCase().replace(/s$/, '')
  return THEMES[key] ?? DEFAULT_THEME
}

export function GeneratedPoster({ title, venueName, startsAt, eventType, className, compact = false }: GeneratedPosterProps) {
  const t = themeFor(eventType)
  const long = title.length > 18

  if (compact) {
    return (
      <div
        className={cn('relative flex aspect-[5/7] items-end overflow-hidden rounded-md p-2 text-white', className)}
        style={{ background: `linear-gradient(150deg, ${t.from} 0%, ${t.to} 100%)` }}
        role="img"
        aria-label={`${title} poster`}
      >
        <span aria-hidden="true" className="absolute right-1 top-1 text-2xl opacity-30">
          {t.emoji}
        </span>
        <span className="relative font-display text-[11px] font-bold leading-tight">{title}</span>
      </div>
    )
  }

  return (
    <div
      className={cn('relative flex aspect-[5/7] flex-col overflow-hidden rounded-lg p-5 text-white', className)}
      style={{ background: `linear-gradient(150deg, ${t.from} 0%, ${t.to} 100%)` }}
      role="img"
      aria-label={`${title} poster`}
    >
      {/* pattern + glows */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 14px)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60 blur-2xl"
        style={{ background: t.glow }}
      />
      <div aria-hidden="true" className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/25 blur-2xl" />
      <span aria-hidden="true" className="absolute right-3 top-10 select-none text-[5.5rem] leading-none opacity-25 [filter:saturate(0)_brightness(2)]">
        {t.emoji}
      </span>

      <span className="relative self-start rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
        {eventType}
      </span>

      <div className="relative mt-auto">
        <h3
          className={cn(
            'font-display font-bold leading-[1.05] drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]',
            long ? 'text-xl' : 'text-2xl sm:text-[1.7rem]',
          )}
        >
          {title}
        </h3>
        <div className="mt-3 h-px w-10 bg-white/70" />
        <p className="mt-3 text-xs font-medium text-white/90">{formatIST(startsAt)}</p>
        <p className="text-xs text-white/80">{venueName}</p>
      </div>
    </div>
  )
}

export default GeneratedPoster
