// Organiser endpoint wrappers (PRD §7.3). Return fixtures when USE_MOCKS is on.
import { ApiError, USE_MOCKS, api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type {
  AvailabilityResult,
  CreateEventInput,
  EventDetail,
  EventStats,
  OrganiserBooking,
  OrganiserEvent,
  OrganiserPayment,
  Seat,
  Venue,
} from '@/lib/types'
import {
  EVENT_VENUE,
  MY_EVENTS,
  VENUES,
  mockBookings,
  mockPayments,
  mockStats,
} from '@/mocks/organiser/data'

const TURNOVER_MS = 60 * 60 * 1000 // VENUE_TURNOVER_MINUTES default

// ---------- Server → client shape adapters ----------
// The API returns some rows straight from Postgres (snake_case, flat attempt counts).
// These accept either shape so pages always get the types in lib/types.ts.
type Raw = Record<string, any>
const num = (...vals: unknown[]) => Number(vals.find((v) => v !== undefined && v !== null) ?? 0)

function toStats(raw: Raw, eventId: string): EventStats {
  const sections = (raw.sections ?? []).map((s: Raw) => ({
    sectionId: s.sectionId ?? s.section_id ?? s.event_section_id ?? s.id,
    name: s.name ?? s.section_name ?? 'Section',
    pricePaise: num(s.pricePaise, s.price_paise),
    capacity: num(s.capacity),
    sold: num(s.sold),
    heldNow: num(s.heldNow, s.held_now),
    available: num(s.available),
    revenuePaise: num(s.revenuePaise, s.revenue_paise),
  }))
  return {
    eventId: raw.eventId ?? raw.event_id ?? eventId,
    capacity: num(raw.capacity),
    sold: num(raw.sold),
    heldNow: num(raw.heldNow, raw.held_now),
    available: num(raw.available),
    revenuePaise: num(raw.revenuePaise, raw.revenue_paise),
    bookings: num(raw.bookings),
    attempts: {
      succeeded: num(raw.attempts?.succeeded, raw.attempts_succeeded),
      failed: num(raw.attempts?.failed, raw.attempts_failed),
      expired: num(raw.attempts?.expired, raw.attempts_expired),
    },
    sections,
  }
}

function toVenue(raw: Raw): Venue {
  return {
    id: raw.id,
    name: raw.name,
    city: raw.city,
    address: raw.address ?? undefined,
    venueType: raw.venueType ?? raw.venue_type,
    capacity: num(raw.capacity),
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    instructions: raw.instructions ?? '',
    layout: raw.layout ?? null,
    sections: (raw.sections ?? []).map((s: Raw) => ({
      id: s.id,
      code: s.code ?? '',
      name: s.name,
      kind: s.kind ?? 'seated',
      capacity: num(s.capacity),
      color: s.color ?? '#9BA1B8',
    })),
  }
}
const delay = <T,>(v: T, ms = 350) => new Promise<T>((r) => setTimeout(() => r(v), ms))
const notFound = () => new ApiError(404, 'NOT_FOUND', 'Not found')

// In-memory copy so created events show up during a mock session.
const mockEvents: OrganiserEvent[] = [...MY_EVENTS]

function mockAvailability(input: { venueId: string; title: string; startsAt: string; endsAt: string }): AvailabilityResult {
  const s = new Date(input.startsAt).getTime()
  const e = new Date(input.endsAt).getTime()
  const key = input.title.trim().toLowerCase()
  const conflicts: AvailabilityResult['conflicts'] = []
  for (const ev of mockEvents) {
    const es = new Date(ev.startsAt).getTime()
    const ee = new Date(ev.endsAt).getTime()
    const sameVenue = EVENT_VENUE[ev.id] === input.venueId
    if (sameVenue && s - TURNOVER_MS < ee && es < e + TURNOVER_MS) {
      conflicts.push({ type: 'venue', title: ev.title, startsAt: ev.startsAt, endsAt: ev.endsAt, venueName: ev.venue.name })
    } else if (!sameVenue && key && ev.title.trim().toLowerCase() === key && s < ee && es < e) {
      conflicts.push({ type: 'event', title: ev.title, startsAt: ev.startsAt, endsAt: ev.endsAt, venueName: ev.venue.name })
    }
  }
  return { available: conflicts.length === 0, conflicts }
}

function findMock(id: string) {
  const ev = mockEvents.find((e) => e.id === id)
  if (!ev) throw notFound()
  return ev
}

export const organiserApi = {
  async venues(): Promise<Venue[]> {
    if (USE_MOCKS) return delay(VENUES)
    return (await api.get<Raw[]>('/venues')).map(toVenue)
  },

  async venue(id: string): Promise<Venue> {
    if (!USE_MOCKS) return toVenue(await api.get<Raw>(`/venues/${id}`))
    const v = VENUES.find((x) => x.id === id)
    if (!v) throw notFound()
    return delay(v)
  },

  checkAvailability(input: { venueId: string; title: string; startsAt: string; endsAt: string }): Promise<AvailabilityResult> {
    return USE_MOCKS ? delay(mockAvailability(input), 250) : api.post('/organiser/events/check-availability', input)
  },

  async createEvent(input: CreateEventInput): Promise<{ eventId: string }> {
    if (!USE_MOCKS) return api.post('/organiser/events', input)
    const check = mockAvailability(input)
    if (!check.available) {
      const c = check.conflicts[0]
      throw new ApiError(409, c.type === 'venue' ? 'VENUE_CLASH' : 'EVENT_CLASH', `Clashes with ${c.title}`, { conflict: c })
    }
    const venue = VENUES.find((v) => v.id === input.venueId)!
    const id = `e-${Date.now().toString(36)}`
    const capacity = input.capacity ?? input.sections.reduce((a, s) => a + (s.capacity ?? 0), 0)
    mockEvents.unshift({
      id,
      title: input.title,
      eventType: input.eventType,
      posterUrl: input.posterUrl ?? null,
      posterDescription: input.posterDescription,
      venue: { name: venue.name, city: venue.city },
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      seatingMode: input.seatingMode,
      minPricePaise: Math.min(...input.sections.map((s) => s.pricePaise)),
      availability: 'available',
      capacity: capacity || venue.capacity,
      sold: 0,
      revenuePaise: 0,
    })
    EVENT_VENUE[id] = input.venueId
    return delay({ eventId: id }, 600)
  },

  myEvents(): Promise<OrganiserEvent[]> {
    if (!USE_MOCKS) return api.get('/organiser/events')
    // Headline numbers come from the same stats source as the dashboard, so list and dashboard always agree.
    return delay(mockEvents.map((ev) => ({ ...ev, revenuePaise: mockStats(ev).revenuePaise })))
  },

  async event(id: string): Promise<OrganiserEvent> {
    if (!USE_MOCKS) {
      const list = await api.get<OrganiserEvent[]>('/organiser/events')
      const ev = list.find((e) => e.id === id)
      if (!ev) throw notFound()
      return ev
    }
    const ev = findMock(id)
    return delay({ ...ev, revenuePaise: mockStats(ev).revenuePaise })
  },

  async stats(id: string): Promise<EventStats> {
    if (USE_MOCKS) return delay(mockStats(findMock(id)))
    return toStats(await api.get<Raw>(`/organiser/events/${id}/stats`), id)
  },

  async bookings(id: string): Promise<OrganiserBooking[]> {
    return USE_MOCKS ? delay(mockBookings(findMock(id))) : api.get(`/organiser/events/${id}/bookings`)
  },

  async payments(id: string): Promise<OrganiserPayment[]> {
    return USE_MOCKS ? delay(mockPayments(findMock(id))) : api.get(`/organiser/events/${id}/payments`)
  },

  /** Layout + seats for the dashboard mini map (assigned events only). */
  async seatMap(id: string): Promise<{ detail: EventDetail | null; seats: Seat[] }> {
    if (USE_MOCKS) {
      const venue = VENUES.find((v) => v.id === EVENT_VENUE[id])
      return delay({ detail: venue ? ({ venue } as EventDetail) : null, seats: [] })
    }
    const [detail, seats] = await Promise.all([
      api.get<EventDetail>(`/events/${id}`),
      api.get<Seat[]>(`/events/${id}/seats`),
    ])
    return { detail, seats }
  },

  /** Upload to Supabase Storage bucket `posters` under the organiser's folder; returns a public URL. */
  async uploadPoster(file: File, userId: string): Promise<string> {
    if (USE_MOCKS) return delay(URL.createObjectURL(file), 500)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('posters').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new ApiError(400, 'UPLOAD_FAILED', error.message)
    return supabase.storage.from('posters').getPublicUrl(path).data.publicUrl
  },
}
