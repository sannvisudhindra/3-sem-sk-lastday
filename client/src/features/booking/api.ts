import type {
  EventSummary,
  EventDetail,
  SeatItem,
  HoldResponse,
  PaymentAttempt,
  BookingTicket
} from './types.ts';

import mockEvents from '../../mocks/customer/events.json' with { type: 'json' };
import mockEventSeated from '../../mocks/customer/event-detail-seated.json' with { type: 'json' };
import mockEventSectioned from '../../mocks/customer/event-detail-sectioned.json' with { type: 'json' };
import mockEventFree from '../../mocks/customer/event-detail-free.json' with { type: 'json' };
import mockBookings from '../../mocks/customer/bookings.json' with { type: 'json' };

// Local ApiError definition matching PRD §7.2
export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(code: string, status = 400, details?: any, message?: string) {
    super(message || code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Global flag: defaults to true during mock development
export const USE_MOCKS = true;

// Helper to access P4's api if available in runtime
async function getLibApi() {
  try {
    const imported = await import('../../lib/api.js').catch(() => null);
    return imported?.api || null;
  } catch {
    return null;
  }
}

/**
 * GET /events?city=&type=
 */
export async function fetchEvents(city?: string, type?: string): Promise<EventSummary[]> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    let list = mockEvents as EventSummary[];
    if (city && city.trim() !== '') {
      list = list.filter(e => e.venue.city.toLowerCase().includes(city.toLowerCase().trim()));
    }
    if (type && type !== 'all') {
      list = list.filter(e => e.eventType.toLowerCase() === type.toLowerCase());
    }
    return list;
  }
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (type && type !== 'all') params.set('type', type);
  return libApi.get(`/events?${params.toString()}`);
}

/**
 * GET /events/:id
 */
export async function fetchEventDetail(eventId: string): Promise<EventDetail> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    if (eventId === 'ev-lakeside-live') return mockEventSectioned as EventDetail;
    if (eventId === 'ev-open-mic') return mockEventFree as EventDetail;
    return { ...(mockEventSeated as EventDetail), id: eventId };
  }
  return libApi.get(`/events/${eventId}`);
}

/**
 * GET /events/:id/seats
 * In mock mode: generates seats from layout JSON
 */
export async function fetchEventSeats(eventId: string): Promise<SeatItem[]> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    const detail = await fetchEventDetail(eventId);
    const layout = detail.venue.layout;
    if (!layout || !layout.sections) return [];

    const seats: SeatItem[] = [];
    layout.sections.forEach(sec => {
      if (sec.shape === 'grid' || sec.shape === 'rect') {
        const rows = sec.rows || 4;
        const perRow = sec.seatsPerRow || 12;
        const startX = sec.x || 300;
        const startY = sec.y || 140;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < perRow; c++) {
            const rowLetter = String.fromCharCode(65 + r);
            const seatNum = c + 1;
            const isBooked = (r === 0 && (c === 2 || c === 3));
            const isHeld = (r === 1 && c === 5);

            seats.push({
              id: `seat-${sec.code}-${rowLetter}${seatNum}`,
              label: `${sec.name} · Row ${rowLetter}-${seatNum}`,
              sectionId: sec.code,
              x: startX + c * 30,
              y: startY + r * 28,
              status: isBooked ? 'booked' : isHeld ? 'held' : 'available'
            });
          }
        }
      } else if (sec.shape === 'arc') {
        const rows = sec.rows || 5;
        const perRow = sec.seatsPerRow || 10;
        const cx = sec.cx || 500;
        const cy = sec.cy || 120;
        const innerR = sec.innerR || 260;
        const outerR = sec.outerR || 380;
        const startDeg = sec.startDeg || 140;
        const endDeg = sec.endDeg || 180;

        for (let r = 0; r < rows; r++) {
          const radius = innerR + (r / Math.max(1, rows - 1)) * (outerR - innerR);
          for (let c = 0; c < perRow; c++) {
            const angleDeg = startDeg + (c / Math.max(1, perRow - 1)) * (endDeg - startDeg);
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.round(cx + radius * Math.cos(angleRad));
            const y = Math.round(cy + radius * Math.sin(angleRad));
            const rowLetter = String.fromCharCode(65 + r);
            const seatNum = c + 1;
            const isBooked = (r === 2 && c === 4);

            seats.push({
              id: `seat-${sec.code}-${rowLetter}${seatNum}`,
              label: `${sec.name} · Row ${rowLetter}-${seatNum}`,
              sectionId: sec.code,
              x,
              y,
              status: isBooked ? 'booked' : 'available'
            });
          }
        }
      }
    });

    return seats;
  }
  return libApi.get(`/events/${eventId}/seats`);
}

/**
 * POST /events/:id/queue/join
 */
export async function joinQueue(eventId: string): Promise<{ entryId: string; status: 'admitted' | 'waiting'; position: number; admissionExpiresAt?: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return {
      entryId: `q-${eventId}-${Date.now()}`,
      status: 'admitted',
      position: 0,
      admissionExpiresAt: new Date(Date.now() + 300 * 1000).toISOString()
    };
  }
  return libApi.post(`/events/${eventId}/queue/join`);
}

/**
 * GET /queue/:entryId
 */
export async function checkQueueStatus(entryId: string): Promise<{ entryId: string; status: 'admitted' | 'waiting'; position: number; admissionExpiresAt?: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return {
      entryId,
      status: 'admitted',
      position: 0,
      admissionExpiresAt: new Date(Date.now() + 300 * 1000).toISOString()
    };
  }
  return libApi.get(`/queue/${entryId}`);
}

/**
 * POST /holds
 * Enforces: Idempotency-Key header, server pricing calculation, 180s hold expiry
 */
export async function createHold(payload: {
  eventId: string;
  seatIds?: string[];
  sections?: { sectionId: string; qty: number }[];
}): Promise<HoldResponse> {
  const libApi = await getLibApi();
  const idempotencyKey = crypto.randomUUID();

  if (USE_MOCKS || !libApi) {
    const detail = await fetchEventDetail(payload.eventId);
    let items: any[] = [];
    let totalPaise = 0;
    let ticketCount = 0;

    if (payload.seatIds && payload.seatIds.length > 0) {
      ticketCount = payload.seatIds.length;
      if (ticketCount > 10) {
        throw new ApiError('LIMIT_EXCEEDED', 409, {}, 'Cannot hold more than 10 tickets.');
      }
      const unitPrice = detail.sections[0]?.pricePaise || detail.minPricePaise;
      items = payload.seatIds.map(id => ({
        label: id.replace('seat-', '').replace('-', ' · '),
        qty: 1,
        unitPricePaise: unitPrice
      }));
      totalPaise = ticketCount * unitPrice;
    } else if (payload.sections && payload.sections.length > 0) {
      payload.sections.forEach(s => {
        const sec = detail.sections.find(ds => ds.id === s.sectionId) || detail.sections[0];
        ticketCount += s.qty;
        const unitPrice = sec?.pricePaise || detail.minPricePaise;
        items.push({
          sectionName: sec?.name || 'Standard',
          qty: s.qty,
          unitPricePaise: unitPrice
        });
        totalPaise += s.qty * unitPrice;
      });
      if (ticketCount > 10) {
        throw new ApiError('LIMIT_EXCEEDED', 409, {}, 'Cannot hold more than 10 tickets.');
      }
    }

    return {
      holdId: 'hold-' + Math.random().toString(36).slice(2, 9),
      expiresAt: new Date(Date.now() + 180 * 1000).toISOString(),
      items,
      totalPaise,
      ticketCount
    };
  }

  return libApi.post('/holds', payload, { idempotencyKey });
}

/**
 * GET /holds/:id
 */
export async function fetchHold(holdId: string): Promise<HoldResponse & { secondsLeft: number }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return {
      holdId,
      expiresAt: new Date(Date.now() + 150 * 1000).toISOString(),
      items: [{ label: 'South Premium · Row A-1', qty: 1, unitPricePaise: 499900 }],
      totalPaise: 499900,
      ticketCount: 1,
      secondsLeft: 150
    };
  }
  return libApi.get(`/holds/${holdId}`);
}

/**
 * POST /holds/:id/release
 */
export async function releaseHold(holdId: string): Promise<{ released: boolean }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return { released: true };
  }
  return libApi.post(`/holds/${holdId}/release`);
}

/**
 * POST /payments
 */
export async function createPayment(holdId: string, method: 'upi_qr' | 'netbanking'): Promise<PaymentAttempt> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return {
      paymentId: 'pay-' + Math.random().toString(36).slice(2, 8),
      amountPaise: 499900,
      expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
      attemptNo: 1,
      qrUrl: `https://encore.pay/mock-token-${Date.now()}`
    };
  }
  return libApi.post('/payments', { holdId, method });
}

/**
 * POST /payments/:id/send-otp
 */
export async function sendOtp(paymentId: string): Promise<{ sent: boolean; emailHint: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return { sent: true, emailHint: 'c***@encore.test' };
  }
  return libApi.post(`/payments/${paymentId}/send-otp`);
}

/**
 * POST /payments/:id/verify-otp
 */
export async function verifyOtp(paymentId: string, otp: string): Promise<{ status: string; bookingId?: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    if (otp === '123456') {
      return { status: 'succeeded', bookingId: 'bk-' + Math.random().toString(36).slice(2, 8) };
    }
    throw new ApiError('OTP_INVALID', 400, { attemptsLeft: 2 }, 'Invalid OTP. 2 attempts remaining.');
  }
  return libApi.post(`/payments/${paymentId}/verify-otp`, { otp });
}

/**
 * GET /payments/link/:token (public, no auth)
 */
export async function fetchPaymentByToken(token: string): Promise<{ amountPaise: number; eventTitle: string; emailHint: string; status: string; expiresAt: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return {
      amountPaise: 499900,
      eventTitle: 'Neon Nights: Electronic Symphony',
      emailHint: 'c***@encore.test',
      status: 'pending',
      expiresAt: new Date(Date.now() + 50 * 1000).toISOString()
    };
  }
  return libApi.get(`/payments/link/${token}`);
}

/**
 * POST /payments/link/:token/approve (public, no auth)
 */
export async function approvePaymentLink(token: string): Promise<{ status: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return { status: 'succeeded' };
  }
  return libApi.post(`/payments/link/${token}/approve`);
}

/**
 * GET /payments/:id
 */
export async function getPaymentStatus(paymentId: string): Promise<{ status: string; failureReason?: string; bookingId?: string; expiresAt: string }> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return { status: 'pending', expiresAt: new Date(Date.now() + 50 * 1000).toISOString() };
  }
  return libApi.get(`/payments/${paymentId}`);
}

/**
 * GET /bookings
 */
export async function fetchMyBookings(): Promise<BookingTicket[]> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    return mockBookings as BookingTicket[];
  }
  return libApi.get('/bookings');
}

/**
 * GET /bookings/:id
 */
export async function fetchBookingDetail(bookingId: string): Promise<BookingTicket> {
  const libApi = await getLibApi();
  if (USE_MOCKS || !libApi) {
    const list = mockBookings as BookingTicket[];
    return list.find(b => b.id === bookingId) || list[0];
  }
  return libApi.get(`/bookings/${bookingId}`);
}
