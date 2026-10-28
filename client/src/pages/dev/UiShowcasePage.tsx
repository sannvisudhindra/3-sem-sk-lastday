// Dev-only gallery of the design system (route /dev/ui, not included in production builds).
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AuroraBackground,
  Badge,
  BeamsBackground,
  Button,
  GeneratedPoster,
  GlassCard,
  HoldButton,
  Input,
  Modal,
  PageTransition,
  ParticleButton,
  ShimmerText,
  Skeleton,
  Spinner,
  Stepper,
  Tabs,
} from '@/ui'

const SWATCHES = [
  ['--bg', 'Ink'],
  ['--bg-elev', 'Elevated'],
  ['--primary-from', 'Coral'],
  ['--primary-to', 'Amber'],
  ['--secondary-from', 'Teal'],
  ['--secondary-to', 'Blue'],
  ['--accent', 'Gold'],
  ['--success', 'Success'],
  ['--danger', 'Danger'],
  ['--warning', 'Warning'],
] as const

const TILES = [
  { emoji: '🎤', title: 'Concerts', sub: 'Grab best seats', tint: 'var(--tint-coral)' },
  { emoji: '😂', title: 'Comedy', sub: 'Catch stand-ups', tint: 'var(--tint-amber)' },
  { emoji: '🏏', title: 'Sports', sub: 'Feel the roar', tint: 'var(--tint-teal)' },
  { emoji: '🎭', title: 'Theatre', sub: 'Front-row drama', tint: 'var(--tint-rose)' },
  { emoji: '🎪', title: 'Festivals', sub: 'All-day passes', tint: 'var(--tint-sky)' },
  { emoji: '🛠️', title: 'Workshops', sub: 'Learn something', tint: 'var(--tint-lime)' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  )
}

export default function UiShowcasePage() {
  const [tab, setTab] = useState<'customer' | 'organiser'>('customer')
  const [qty, setQty] = useState(2)
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <>
      <AuroraBackground />
      <PageTransition className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        <header>
          <h1 className="text-gradient text-4xl font-bold">Encore UI</h1>
          <p className="mt-2 text-muted">Midnight Aurora design system · dev preview</p>
        </header>

        <Section title="Colours">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SWATCHES.map(([v, name]) => (
              <div key={v} className="overflow-hidden rounded-md border border-glass-border">
                <div className="h-14" style={{ background: `var(${v})` }} />
                <div className="px-3 py-2 text-xs">
                  <div className="font-medium">{name}</div>
                  <div className="text-muted">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-1">
            <p className="font-display text-5xl font-bold">Sora Display 700</p>
            <p className="font-display text-2xl font-semibold">Sora Heading 600</p>
            <p>Inter body: the quick brown fox books two seats in Block A.</p>
            <p className="tabular text-2xl font-semibold">₹1,24,999 · 02:41</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="teal">Teal</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true)
                setTimeout(() => setLoading(false), 1500)
              }}
            >
              {loading ? 'Booking…' : 'Click to load'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Kokonut: Particle button & Hold to pay">
          <div className="flex flex-wrap items-center gap-4">
            <ParticleButton
              className="h-11 rounded-md bg-gradient-to-r from-primary-from to-primary-to px-6 font-semibold text-[#1A0F0A]"
              pendingLabel="Holding seats"
              successLabel="Seats held"
              onClick={() => new Promise((r) => setTimeout(r, 1000))}
            >
              Book now
            </ParticleButton>
            <HoldButton variant="brand" onHoldComplete={() => toast.success('Payment confirmed (demo)')} />
          </div>
        </Section>

        <Section title="Category tiles (GlassCard + tint)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {TILES.map((t, i) => (
              <GlassCard key={t.title} tint={t.tint} interactive className="relative overflow-hidden pt-14">
                <span
                  className="float-bob absolute right-4 top-3 text-5xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  {t.emoji}
                </span>
                <h3 className="text-lg font-semibold">{t.title}</h3>
                <p className="text-sm text-muted">{t.sub}</p>
              </GlassCard>
            ))}
          </div>
        </Section>

        <Section title="Tabs, stepper, badges">
          <div className="flex flex-wrap items-center gap-6">
            <Tabs
              tabs={[
                { value: 'customer', label: 'Customer' },
                { value: 'organiser', label: 'Organiser' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <Stepper value={qty} min={1} max={10} onChange={setQty} />
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="primary">Filling fast</Badge>
              <Badge tone="teal">Assigned seats</Badge>
              <Badge tone="success">Confirmed</Badge>
              <Badge tone="warning">Held 2:41</Badge>
              <Badge tone="danger">Sold out</Badge>
            </div>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <Input label="Username" autoComplete="off" />
            <Input label="Password" type="password" hint="At least 8 characters" />
            <Input label="Email" defaultValue="not-an-email" error="Enter a valid email" />
          </div>
        </Section>

        <Section title="Feedback">
          <div className="flex flex-wrap items-center gap-6">
            <Spinner className="text-primary-from" />
            <ShimmerText className="text-sm font-medium">Waiting for confirmation…</ShimmerText>
            <div className="w-64 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Button variant="secondary" onClick={() => setModal(true)}>
              Open modal
            </Button>
            <Button variant="secondary" onClick={() => toast.error('One or more seats were just taken.')}>
              Error toast
            </Button>
          </div>
        </Section>

        <Section title="Generated poster">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <GeneratedPoster title="Neon Nights" venueName="Sabarmati Bowl" startsAt="2026-12-13T13:30:00Z" eventType="Concert" />
            <GeneratedPoster title="Laugh Riot" venueName="Lakeside Grounds" startsAt="2026-11-20T14:30:00Z" eventType="Comedy" />
          </div>
          <p className="text-xs text-muted">Placeholder version. The real gradient poster comes in Step 6.</p>
        </Section>

        <Section title="Kokonut: Beams background (login)">
          <div className="h-72 overflow-hidden rounded-lg border border-glass-border">
            <BeamsBackground className="min-h-0 h-full" intensity="medium">
              <h3 className="text-gradient text-4xl font-bold">Encore</h3>
            </BeamsBackground>
          </div>
        </Section>
      </PageTransition>

      <Modal open={modal} onClose={() => setModal(false)} title="You're signed in elsewhere">
        <p className="text-sm text-muted">
          Chrome · Windows, since 10:42. Continue here and sign out there?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => setModal(false)}>Switch to this device</Button>
        </div>
      </Modal>
    </>
  )
}
