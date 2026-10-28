// Host an event: 5-step form with live preview and live venue/event clash checks (PRD §8.3 P-9, R22–R24).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { AlertTriangle, Check, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react'
import { organiserApi } from '@/features/organiser/api'
import { ErrorState, PageHeader } from '@/features/organiser/States'
import { useAsync } from '@/features/organiser/useAsync'
import { VENUE_TYPE_META, VenueTypeBadge } from '@/features/organiser/VenueVisuals'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatINR, formatIST } from '@/lib/format'
import type { AvailabilityConflict, CreateEventInput, SeatingMode, Venue } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge, Button, GeneratedPoster, GlassCard, Input, Skeleton, Tabs } from '@/ui'

const STEPS = ['Basics', 'Venue & time', 'Seating & pricing', 'Poster', 'Review']
const EVENT_TYPES = ['Concert', 'Comedy', 'Sports', 'Theatre', 'Festival', 'Workshop']

/** Date → value for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function defaultTimes() {
  const s = new Date()
  s.setDate(s.getDate() + 7)
  s.setHours(19, 0, 0, 0)
  const e = new Date(s)
  e.setHours(22)
  return { start: toLocalInput(s), end: toLocalInput(e) }
}
const isoOf = (local: string) => (local ? new Date(local).toISOString() : '')
const rupeesToPaise = (v: string) => Math.round(Number(v) * 100)

type Availability =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'clash'; conflicts: AvailabilityConflict[] }
  | { status: 'error' }

interface FormState {
  title: string
  eventType: string
  description: string
  venueId: string
  start: string
  end: string
  seatedChoice: 'assigned' | 'free'
  prices: Record<string, string>
  capacities: Record<string, string>
  freePrice: string
  freeCapacity: string
  posterFile: File | null
  posterPreview: string | null
  posterDescription: string
}

type Errors = Partial<Record<string, string>>

function seatingModeOf(venue: Venue | undefined, choice: FormState['seatedChoice']): SeatingMode {
  if (!venue) return 'free'
  if (venue.venueType === 'sectioned') return 'sectioned'
  if (venue.venueType === 'seated') return choice
  return 'free'
}

function validate(step: number, f: FormState, venue: Venue | undefined, mode: SeatingMode): Errors {
  const e: Errors = {}
  if (step === 0) {
    if (f.title.trim().length < 3) e.title = 'Give your event a name (3+ characters)'
    if (!f.eventType) e.eventType = 'Pick a type'
    if (f.description.trim().length < 10) e.description = 'Add a short description (10+ characters)'
  }
  if (step === 1) {
    if (!venue) e.venueId = 'Choose a venue'
    const s = new Date(f.start).getTime()
    const en = new Date(f.end).getTime()
    if (!f.start || Number.isNaN(s)) e.start = 'Pick a start time'
    else if (s <= Date.now()) e.start = 'Start must be in the future'
    if (!f.end || Number.isNaN(en)) e.end = 'Pick an end time'
    else if (en <= s) e.end = 'End must be after start'
  }
  if (step === 2 && venue) {
    const price = (v: string) => Number(v) > 0 && Number.isFinite(Number(v))
    if (mode === 'free') {
      if (!price(f.freePrice)) e.freePrice = 'Enter a ticket price'
      const cap = Number(f.freeCapacity)
      if (!Number.isInteger(cap) || cap < 1) e.freeCapacity = 'Enter a capacity'
      else if (cap > venue.capacity) e.freeCapacity = `Max ${venue.capacity} for this venue`
    } else {
      for (const s of venue.sections) {
        if (!price(f.prices[s.id] ?? '')) e[`price-${s.id}`] = 'Price?'
        if (mode === 'sectioned') {
          const cap = Number(f.capacities[s.id] ?? s.capacity)
          if (!Number.isInteger(cap) || cap < 1) e[`cap-${s.id}`] = 'Capacity?'
          else if (cap > s.capacity) e[`cap-${s.id}`] = `Max ${s.capacity}`
        }
      }
    }
  }
  return e
}

export default function HostEventPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: venues, error, loading, reload } = useAsync(() => organiserApi.venues(), [])

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [showErrors, setShowErrors] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [availability, setAvailability] = useState<Availability>({ status: 'idle' })
  const fileInput = useRef<HTMLInputElement>(null)

  const [f, setF] = useState<FormState>(() => ({
    title: '',
    eventType: 'Concert',
    description: '',
    venueId: params.get('venue') ?? '',
    ...defaultTimes(),
    seatedChoice: 'assigned',
    prices: {},
    capacities: {},
    freePrice: '',
    freeCapacity: '',
    posterFile: null,
    posterPreview: null,
    posterDescription: '',
  }))
  const patch = (p: Partial<FormState>) => setF((s) => ({ ...s, ...p }))

  const venue = venues?.find((v) => v.id === f.venueId)
  const mode = seatingModeOf(venue, f.seatedChoice)
  const errors = useMemo(() => validate(step, f, venue, mode), [step, f, venue, mode])
  const err = (k: string) => (showErrors ? errors[k] : undefined)

  // Live clash check (debounced). The server re-checks with exclusion constraints on publish.
  useEffect(() => {
    if (!f.venueId || !f.start || !f.end || new Date(f.end) <= new Date(f.start)) {
      setAvailability({ status: 'idle' })
      return
    }
    setAvailability({ status: 'checking' })
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await organiserApi.checkAvailability({
          venueId: f.venueId,
          title: f.title,
          startsAt: isoOf(f.start),
          endsAt: isoOf(f.end),
        })
        if (!cancelled) setAvailability(r.available ? { status: 'ok' } : { status: 'clash', conflicts: r.conflicts })
      } catch {
        if (!cancelled) setAvailability({ status: 'error' })
      }
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [f.venueId, f.start, f.end, f.title])

  // Free-seating capacity defaults to the venue capacity.
  useEffect(() => {
    if (venue && !f.freeCapacity) patch({ freeCapacity: String(venue.capacity) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id])

  useEffect(() => () => {
    if (f.posterPreview?.startsWith('blob:')) URL.revokeObjectURL(f.posterPreview)
  }, [f.posterPreview])

  function go(to: number) {
    if (to > step) {
      if (Object.keys(errors).length) {
        setShowErrors(true)
        return
      }
      if (step === 1 && availability.status === 'clash') {
        toast.error('Pick a time when the venue is free.')
        return
      }
    }
    setShowErrors(false)
    setDir(to > step ? 1 : -1)
    setStep(to)
  }

  function buildPayload(posterUrl?: string): CreateEventInput {
    const v = venue!
    const base = {
      venueId: v.id,
      title: f.title.trim(),
      eventType: f.eventType,
      description: f.description.trim(),
      posterUrl,
      posterDescription: f.posterDescription.trim(),
      seatingMode: mode,
      startsAt: isoOf(f.start),
      endsAt: isoOf(f.end),
    }
    if (mode === 'free') {
      const capacity = Number(f.freeCapacity)
      return { ...base, capacity, sections: [{ name: 'General Admission', pricePaise: rupeesToPaise(f.freePrice), capacity }] }
    }
    return {
      ...base,
      sections: v.sections.map((s) => ({
        venueSectionId: s.id,
        pricePaise: rupeesToPaise(f.prices[s.id]),
        ...(mode === 'sectioned' ? { capacity: Number(f.capacities[s.id] ?? s.capacity) } : null),
      })),
    }
  }

  async function publish() {
    if (!venue || !user) return
    setPublishing(true)
    try {
      const posterUrl = f.posterFile ? await organiserApi.uploadPoster(f.posterFile, user.id) : undefined
      const { eventId } = await organiserApi.createEvent(buildPayload(posterUrl))
      toast.success(`${f.title.trim()} is live!`)
      navigate(`/organiser/events/${eventId}`)
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'VENUE_CLASH' || e.code === 'EVENT_CLASH')) {
        toast.error(e.code === 'VENUE_CLASH' ? 'The venue was just booked for that time.' : 'This event already runs elsewhere at that time.')
        setDir(-1)
        setStep(1)
      } else if (e instanceof ApiError && e.code === 'CAPACITY_INVALID') {
        toast.error('Capacity is larger than the venue allows.')
        setDir(-1)
        setStep(2)
      } else {
        toast.error(e instanceof ApiError ? e.message : 'Could not publish the event.')
      }
    } finally {
      setPublishing(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <ErrorState error={error} onRetry={reload} />
      </div>
    )
  }

  const priceRange = (() => {
    const list =
      mode === 'free'
        ? [rupeesToPaise(f.freePrice)]
        : (venue?.sections ?? []).map((s) => rupeesToPaise(f.prices[s.id] ?? '')).filter((p) => p > 0)
    const valid = list.filter((p) => p > 0)
    if (!valid.length) return null
    const lo = Math.min(...valid)
    const hi = Math.max(...valid)
    return lo === hi ? formatINR(lo) : `${formatINR(lo)} – ${formatINR(hi)}`
  })()

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader title="Host an event" subtitle="Five quick steps. Your event goes live as soon as you publish." />

      {/* Stepper */}
      <ol className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <li key={label} className="shrink-0">
            <button
              onClick={() => i < step && go(i)}
              disabled={i > step}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition',
                i === step
                  ? 'border-primary-from/50 bg-primary-from/10 text-text'
                  : i < step
                    ? 'border-glass-border text-text hover:bg-white/5'
                    : 'border-transparent text-muted',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                  i < step ? 'bg-success text-bg' : i === step ? 'bg-primary-from text-bg' : 'bg-white/10',
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <GlassCard className="overflow-hidden p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <StepTitle n={1} title="What's the event?" />
                  <Input label="Event title" value={f.title} onChange={(e) => patch({ title: e.target.value })} error={err('title')} maxLength={80} />
                  <div>
                    <p className="mb-2 text-sm text-muted">Type</p>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() => patch({ eventType: t })}
                          className={cn(
                            'rounded-full border px-4 py-1.5 text-sm transition',
                            f.eventType === t
                              ? 'border-primary-from/60 bg-primary-from/15 text-text'
                              : 'border-glass-border text-muted hover:text-text',
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TextArea
                    label="Description"
                    value={f.description}
                    onChange={(v) => patch({ description: v })}
                    error={err('description')}
                    placeholder="Who's performing, what to expect, age limits…"
                  />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <StepTitle n={2} title="Where and when?" />
                  {loading || !venues ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {venues.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => patch({ venueId: v.id, freeCapacity: String(v.capacity) })}
                          className={cn(
                            'rounded-lg border p-4 text-left transition',
                            f.venueId === v.id
                              ? 'border-primary-from/60 bg-primary-from/10 ring-4 ring-primary-from/10'
                              : 'border-glass-border bg-white/[0.02] hover:border-white/20',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold">{v.name}</span>
                            <VenueTypeBadge type={v.venueType} />
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            {v.city} · {v.capacity.toLocaleString('en-IN')} capacity
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {err('venueId') && <p className="text-xs text-danger">{err('venueId')}</p>}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Starts"
                      type="datetime-local"
                      value={f.start}
                      min={toLocalInput(new Date())}
                      onChange={(e) => patch({ start: e.target.value })}
                      error={err('start')}
                      className="[&_input]:[color-scheme:dark]"
                    />
                    <Input
                      label="Ends"
                      type="datetime-local"
                      value={f.end}
                      min={f.start}
                      onChange={(e) => patch({ end: e.target.value })}
                      error={err('end')}
                      className="[&_input]:[color-scheme:dark]"
                    />
                  </div>

                  <AvailabilityNotice availability={availability} />
                </div>
              )}

              {step === 2 && venue && (
                <div className="space-y-6">
                  <StepTitle n={3} title="Seating & pricing" />
                  <p className="text-sm text-muted">
                    {venue.name} is a <VenueTypeBadge type={venue.venueType} /> venue. {VENUE_TYPE_META[venue.venueType].text}.
                  </p>

                  {venue.venueType === 'seated' && (
                    <Tabs
                      tabs={[
                        { value: 'assigned', label: 'Assigned seats' },
                        { value: 'free', label: 'Free seating' },
                      ]}
                      value={f.seatedChoice}
                      onChange={(v) => patch({ seatedChoice: v })}
                    />
                  )}

                  {mode === 'free' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Ticket price (₹)"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={f.freePrice}
                        onChange={(e) => patch({ freePrice: e.target.value })}
                        error={err('freePrice')}
                      />
                      <Input
                        label={`Capacity (max ${venue.capacity})`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={venue.capacity}
                        value={f.freeCapacity}
                        onChange={(e) => patch({ freeCapacity: e.target.value })}
                        error={err('freeCapacity')}
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead className="text-left text-xs uppercase tracking-wider text-muted">
                          <tr>
                            <th className="py-2 font-medium">Section</th>
                            <th className="w-36 py-2 font-medium">Price (₹)</th>
                            {mode === 'sectioned' && <th className="w-36 py-2 pl-3 font-medium">Capacity</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {venue.sections.map((s) => (
                            <tr key={s.id} className="border-t border-glass-border">
                              <td className="py-3 pr-3">
                                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                                {s.name}
                                <span className="ml-2 text-xs text-muted">
                                  {s.kind} · {s.capacity}
                                </span>
                              </td>
                              <td className="py-2">
                                <CellInput
                                  value={f.prices[s.id] ?? ''}
                                  placeholder="1999"
                                  error={err(`price-${s.id}`)}
                                  onChange={(v) => patch({ prices: { ...f.prices, [s.id]: v } })}
                                />
                              </td>
                              {mode === 'sectioned' && (
                                <td className="py-2 pl-3">
                                  <CellInput
                                    value={f.capacities[s.id] ?? String(s.capacity)}
                                    error={err(`cap-${s.id}`)}
                                    onChange={(v) => patch({ capacities: { ...f.capacities, [s.id]: v } })}
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        className="mt-3 text-xs font-medium text-primary-to hover:underline"
                        onClick={() => {
                          const first = venue.sections.map((s) => f.prices[s.id]).find((p) => Number(p) > 0)
                          if (first) patch({ prices: Object.fromEntries(venue.sections.map((s) => [s.id, f.prices[s.id] || first])) })
                        }}
                      >
                        Fill empty prices with the first one
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted">Customers can buy at most 10 tickets each. Prices are fixed once published.</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <StepTitle n={4} title="Poster" />
                  <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                    <button
                      onClick={() => fileInput.current?.click()}
                      className="group relative flex aspect-[5/7] flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-glass-border bg-white/[0.02] text-sm text-muted transition hover:border-primary-from/50 hover:text-text"
                    >
                      {f.posterPreview ? (
                        <img src={f.posterPreview} alt="Poster preview" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <>
                          <ImagePlus className="h-7 w-7" />
                          Upload image
                          <span className="text-xs">JPG/PNG · up to 5 MB</span>
                        </>
                      )}
                    </button>
                    <div className="space-y-4">
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Poster must be 5 MB or smaller.')
                            return
                          }
                          patch({ posterFile: file, posterPreview: URL.createObjectURL(file) })
                        }}
                      />
                      {f.posterFile && (
                        <div className="flex items-center justify-between rounded-md bg-white/[0.04] px-3 py-2 text-sm">
                          <span className="truncate">{f.posterFile.name}</span>
                          <button onClick={() => patch({ posterFile: null, posterPreview: null })} className="text-muted hover:text-danger" aria-label="Remove poster">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <TextArea
                        label="Poster description"
                        value={f.posterDescription}
                        onChange={(v) => patch({ posterDescription: v })}
                        placeholder="e.g. Neon pink stage lights, crowd silhouettes, bold title"
                      />
                      <p className="text-xs text-muted">
                        No image? We'll generate a poster with the title, venue and time. You can see it in the preview.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && venue && (
                <div className="space-y-5">
                  <StepTitle n={5} title="Review & publish" />
                  <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    <Row label="Title">{f.title}</Row>
                    <Row label="Type">{f.eventType}</Row>
                    <Row label="Venue">
                      {venue.name}, {venue.city}
                    </Row>
                    <Row label="Seating">
                      {mode === 'assigned' ? 'Assigned seats' : mode === 'sectioned' ? 'Sections + quantity' : 'Free seating'}
                    </Row>
                    <Row label="Starts">{formatIST(isoOf(f.start))}</Row>
                    <Row label="Ends">{formatIST(isoOf(f.end))}</Row>
                    <Row label="Capacity">
                      {mode === 'free'
                        ? f.freeCapacity
                        : mode === 'sectioned'
                          ? venue.sections.reduce((a, s) => a + Number(f.capacities[s.id] ?? s.capacity), 0)
                          : venue.capacity}
                    </Row>
                    <Row label="Prices">{priceRange ?? '—'}</Row>
                  </dl>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Description</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm">{f.description}</dd>
                  </div>
                  <AvailabilityNotice availability={availability} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-glass-border pt-6">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || publishing}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)} disabled={step === 1 && availability.status === 'checking'}>
                Continue
              </Button>
            ) : (
              <Button size="lg" onClick={publish} loading={publishing} disabled={availability.status === 'clash'}>
                Publish event
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Live preview</p>
          <GlassCard className="p-4">
            {f.posterPreview ? (
              <img src={f.posterPreview} alt="" className="aspect-[5/7] w-full rounded-lg object-cover" />
            ) : (
              <GeneratedPoster
                title={f.title.trim() || 'Your event'}
                venueName={venue?.name ?? 'Venue'}
                startsAt={isoOf(f.start) || new Date().toISOString()}
                eventType={f.eventType}
              />
            )}
            <div className="mt-4 space-y-1">
              <h3 className="font-semibold">{f.title.trim() || 'Your event'}</h3>
              <p className="text-sm text-muted">{f.start ? formatIST(isoOf(f.start)) : 'Pick a time'}</p>
              <p className="text-sm text-muted">{venue ? `${venue.name}, ${venue.city}` : 'Pick a venue'}</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold">{priceRange ? `from ${priceRange.split(' – ')[0]}` : ''}</span>
                <Badge tone="primary">{f.eventType}</Badge>
              </div>
            </div>
          </GlassCard>
        </aside>
      </div>
    </div>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary-to">Step {n} of 5</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string
  value: string
  onChange(v: string): void
  error?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full resize-y rounded-md border border-glass-border bg-white/[0.03] px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-primary-from/70 focus:ring-4 focus:ring-primary-from/10',
          error && 'border-danger/70',
        )}
      />
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  )
}

function CellInput({ value, onChange, error, placeholder }: { value: string; onChange(v: string): void; error?: string; placeholder?: string }) {
  return (
    <div>
      <input
        type="number"
        min={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'tabular h-10 w-full rounded-md border border-glass-border bg-white/[0.03] px-3 text-sm outline-none focus:border-primary-from/70',
          error && 'border-danger/70',
        )}
      />
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
    </div>
  )
}

function AvailabilityNotice({ availability }: { availability: Availability }) {
  if (availability.status === 'idle') return null
  if (availability.status === 'checking') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking venue availability…
      </p>
    )
  }
  if (availability.status === 'ok') {
    return (
      <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> Venue is free at this time
      </p>
    )
  }
  if (availability.status === 'error') {
    return <p className="text-sm text-warning">Couldn't check availability. We'll check again when you publish.</p>
  }
  return (
    <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-danger">
        <AlertTriangle className="h-4 w-4" /> This time doesn't work
      </p>
      <ul className="mt-2 space-y-1 text-muted">
        {availability.conflicts.map((c, i) => (
          <li key={i}>
            {c.type === 'venue' ? (
              <>
                <span className="text-text">{c.venueName}</span> is busy with <span className="text-text">{c.title}</span>,{' '}
                {formatIST(c.startsAt)} (events need a 60-minute changeover).
              </>
            ) : (
              <>
                <span className="text-text">{c.title}</span> already runs at <span className="text-text">{c.venueName}</span>,{' '}
                {formatIST(c.startsAt)}. The same event can't run in two venues at once.
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
