export type SeatingMode = 'assigned' | 'sectioned' | 'free';

export interface VenueSectionLayout {
  code: string;
  name: string;
  kind: 'seated' | 'standing';
  color: string;
  shape: 'arc' | 'grid' | 'rect';
  cx?: number;
  cy?: number;
  innerR?: number;
  outerR?: number;
  startDeg?: number;
  endDeg?: number;
  rows?: number;
  seatsPerRow?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  capacity?: number;
}

export interface VenueLayout {
  width?: number;
  height?: number;
  viewBox?: string; // e.g. "0 0 1000 800" (PRD §5.3 format)
  stage?: { x?: number; y?: number; w?: number; h?: number; label?: string };
  sections: VenueSectionLayout[];
}

export interface EventSummary {
  id: string;
  title: string;
  eventType: 'concert' | 'comedy' | 'theatre' | 'sports' | 'festival';
  posterUrl?: string | null;
  posterDescription?: string | null;
  venue: { name: string; city: string };
  startsAt: string;
  endsAt: string;
  seatingMode: SeatingMode;
  minPricePaise: number;
  availability: 'available' | 'fast' | 'sold_out';
}

export interface EventSection {
  id: string;
  name: string;
  color: string;
  pricePaise: number;
  capacity: number;
  available: number;
}

export interface EventDetail extends EventSummary {
  venue: {
    name: string;
    city: string;
    layout?: VenueLayout;
    imageUrl?: string;
    instructions?: string;
  };
  sections: EventSection[];
  myTicketCount: number;
}

export interface SeatItem {
  id: string;
  label: string;
  sectionId: string;
  x: number;
  y: number;
  status: 'available' | 'held' | 'booked';
}

export interface HoldItem {
  label?: string;
  sectionName?: string;
  qty: number;
  unitPricePaise: number;
}

export interface HoldResponse {
  holdId: string;
  expiresAt: string;
  items: HoldItem[];
  totalPaise: number;
  ticketCount: number;
}

export interface PaymentAttempt {
  paymentId: string;
  amountPaise: number;
  expiresAt: string;
  attemptNo: number;
  qrUrl?: string;
}

export interface BookingTicket {
  id: string;
  ticketCode: string;
  event: EventSummary;
  items: HoldItem[];
  totalPaise: number;
  createdAt: string;
}

