// Shared landing layout for /login and /signup (PRD §8.3 P-1): category tiles + spotlight on the left,
// glass auth card on the right (desktop) or as a bottom sheet (mobile).
import type { ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { ChevronDown, MapPin } from 'lucide-react'
import BeamsBackground from '@/components/kokonutui/beams-background'
import { APP_NAME } from '@/lib/config'
import { GeneratedPoster, GlassCard } from '@/ui'

const TILES = [
  { emoji: '🎤', title: 'Concerts', sub: 'Grab best seats', tint: 'var(--tint-coral)' },
  { emoji: '😂', title: 'Comedy', sub: 'Catch stand-ups', tint: 'var(--tint-amber)' },
  { emoji: '🏏', title: 'Sports', sub: 'Feel the roar', tint: 'var(--tint-teal)' },
  { emoji: '🎭', title: 'Theatre', sub: 'Front-row drama', tint: 'var(--tint-rose)' },
  { emoji: '🎪', title: 'Festivals', sub: 'All-day passes', tint: 'var(--tint-sky)' },
  { emoji: '🛠️', title: 'Workshops', sub: 'Learn something new', tint: 'var(--tint-lime)' },
]

const SPOTLIGHT = [
  { title: 'Neon Nights', venueName: 'Sabarmati Bowl', startsAt: '2026-12-13T13:30:00Z', eventType: 'Concert' },
  { title: 'Laugh Riot', venueName: 'Lakeside Grounds', startsAt: '2026-11-20T14:30:00Z', eventType: 'Comedy' },
  { title: 'Hamlet Reimagined', venueName: 'Courtyard Theatre', startsAt: '2026-11-28T13:00:00Z', eventType: 'Theatre' },
  { title: 'Lakeside Live', venueName: 'Lakeside Grounds', startsAt: '2026-12-05T12:30:00Z', eventType: 'Festival' },
  { title: 'Open Mic Night', venueName: 'The Loft', startsAt: '2026-11-14T14:00:00Z', eventType: 'Comedy' },
  { title: 'Derby Day', venueName: 'Sabarmati Bowl', startsAt: '2026-12-20T10:30:00Z', eventType: 'Sports' },
]

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.4, ease: EASE_OUT } }),
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <BeamsBackground intensity="strong" className="min-h-svh">
      <div className="mx-auto grid w-full max-w-7xl gap-8 py-8 text-left lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-14 lg:py-12">
        {/* Left: discovery */}
        <div className="min-w-0">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-muted" />
              <div>
                <button className="flex items-center gap-1 text-lg font-semibold text-text">
                  Bengaluru <ChevronDown className="h-4 w-4" />
                </button>
                <p className="text-sm text-muted">Karnataka</p>
              </div>
            </div>
            <span className="text-gradient font-display text-2xl font-bold">{APP_NAME}</span>
          </header>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-3xl font-bold leading-tight sm:text-4xl"
          >
            Your city's best nights,
            <br />
            <span className="text-gradient">one tap away.</span>
          </motion.h1>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {TILES.map((t, i) => (
              <motion.div key={t.title} custom={i} variants={rise} initial="hidden" animate="show">
                <GlassCard tint={t.tint} interactive className="relative h-full overflow-hidden p-4 pt-16 sm:p-5 sm:pt-20">
                  <span
                    className="float-bob absolute right-3 top-2 text-5xl drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)] sm:text-6xl"
                    style={{ animationDelay: `${i * 0.35}s` }}
                  >
                    {t.emoji}
                  </span>
                  <h3 className="text-base font-semibold sm:text-lg">{t.title}</h3>
                  <p className="text-xs text-muted sm:text-sm">{t.sub}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 hidden sm:block">
            <h2 className="mb-4 text-xl font-semibold">In the spotlight</h2>
            <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
              <div className="marquee flex w-max gap-4">
                {[...SPOTLIGHT, ...SPOTLIGHT].map((p, i) => (
                  <GeneratedPoster key={i} {...p} className="w-40 shrink-0" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: auth card (bottom sheet on mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.15 }}
          className="-mx-4 sm:mx-0"
        >
          <div className="rounded-t-[28px] border border-glass-border bg-bg-elev/80 p-6 shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:rounded-[28px] sm:p-8">
            {children}
          </div>
        </motion.div>
      </div>
    </BeamsBackground>
  )
}
