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
  venues(): Promise<Venue[]> {
    return USE_MOCKS ? delay(VENUES) : api.get('/venues')
  },

  async venue(id: string): Promise<Venue> {
    if (!USE_MOCKS) return api.get(`/venues/${id}`)
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
    return USE_MOCKS ? delay(mockStats(findMock(id))) : api.get(`/organiser/events/${id}/stats`)
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
