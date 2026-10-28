// Shared API types — mirror PRD §7.3 exactly. Owned by P4; P3 adds local types in features/booking/types.ts.

export type Role = 'customer' | 'organiser'
export type SeatingMode = 'assigned' | 'sectioned' | 'free'
export type VenueType = 'seated' | 'sectioned' | 'open'
export type SeatStatus = 'available' | 'held' | 'booked'
export type PaymentMethod = 'upi_qr' | 'netbanking'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'expired'

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown }
}

export interface Profile {
  id: string
  role: Role | null
  username: string
  fullName: string
  email: string
}

// ---------- Venues & layout ----------
export interface LayoutShape {
  shape: 'rect' | 'arc' | 'grid'
  x?: number
  y?: number
  w?: number
  h?: number
  cx?: number
  cy?: number
  innerR?: number
  outerR?: number
  startDeg?: number
  endDeg?: number
  rows?: number
  seatsPerRow?: number
  label?: string
}

export interface LayoutSection extends LayoutShape {
  code: string
  name: string
  kind: 'seated' | 'standing'
  color: string
  capacity?: number
}

export interface VenueLayout {
  viewBox: string
  stage?: LayoutShape
  sections: LayoutSection[]
}

export interface VenueSection {
  id: string
  code: string
  name: string
  kind: 'seated' | 'standing'
  capacity: number
  color: string
}

export interface Venue {
  id: string
  name: string
  city: string
  address?: string
  venueType: VenueType
  capacity: number
  imageUrl: string | null
  instructions: string
  layout?: VenueLayout | null
  sections: VenueSection[]
}

// ---------- Events ----------
export interface EventSummary {
  id: string
  title: string
  eventType: string
  posterUrl: string | null
  posterDescription: string | null
  venue: { name: string; city: string }
  startsAt: string
  endsAt: string
  seatingMode: SeatingMode
  minPricePaise: number
  availability: 'available' | 'fast' | 'sold_out'
}

export interface SectionInfo {
  id: string
  name: string
  color: string
  pricePaise: number
  capacity: number
  available: number
}

export interface EventDetail extends Omit<EventSummary, 'venue' | 'minPricePaise' | 'availability'> {
  description: string
  venue: Venue
  sections: SectionInfo[]
  myTicketCount: number
}

export interface Seat {
  id: string
  label: string
  sectionId: string
  x: number
  y: number
  status: SeatStatus
}

// ---------- Queue / holds / payments / bookings ----------
export interface QueueEntry {
  entryId: number
  status: 'admitted' | 'waiting' | 'done' | 'expired'
  position: number
  admissionExpiresAt: string | null
}

export interface HoldItem {
  label?: string
  sectionName?: string
  qty: number
  unitPricePaise: number
}

export interface Hold {
  holdId: string
  expiresAt: string
  items: HoldItem[]
  totalPaise: number
  ticketCount: number
}

export interface Payment {
  paymentId: string
  amountPaise: number
  expiresAt: string
  attemptNo: number
  qrUrl?: string
  devLink?: string
}

export interface PaymentState {
  status: PaymentStatus
  failureReason: string | null
  bookingId: string | null
  expiresAt: string
}

export interface Booking {
  id: string
  ticketCode: string
  event: { id: string; title: string; startsAt: string; venueName: string; posterUrl: string | null }
  items: HoldItem[]
  totalPaise: number
  createdAt: string
}

// ---------- Organiser ----------
export interface AvailabilityConflict {
  type: 'venue' | 'event'
  title: string
  startsAt: string
  endsAt: string
  venueName: string
}

export interface AvailabilityResult {
  available: boolean
  conflicts: AvailabilityConflict[]
}

export interface CreateEventInput {
  venueId: string
  title: string
  eventType: string
  description: string
  posterUrl?: string
  posterDescription: string
  seatingMode: SeatingMode
  startsAt: string
  endsAt: string
  capacity?: number
  sections: { venueSectionId?: string; name?: string; pricePaise: number; capacity?: number }[]
}

export interface OrganiserEvent extends EventSummary {
  capacity: number
  sold: number
  revenuePaise: number
}

export interface SectionStats {
  sectionId: string
  name: string
  pricePaise: number
  capacity: number
  sold: number
  heldNow: number
  available: number
  revenuePaise: number
}

export interface EventStats {
  eventId: string
  capacity: number
  sold: number
  heldNow: number
  available: number
  revenuePaise: number
  bookings: number
  attempts: { succeeded: number; failed: number; expired: number }
  sections: SectionStats[]
}

export interface OrganiserBooking {
  ticketCode: string
  customerName: string
  ticketCount: number
  totalPaise: number
  seats: string[]
  createdAt: string
}

export interface OrganiserPayment {
  attemptNo: number
  method: PaymentMethod
  status: PaymentStatus
  failureReason: string | null
  amountPaise: number
  createdAt: string
}
