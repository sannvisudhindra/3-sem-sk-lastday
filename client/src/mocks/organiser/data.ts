// Organiser fixtures (shapes = PRD §7.3). Used when VITE_USE_MOCKS=true.
import type {
  EventStats,
  OrganiserBooking,
  OrganiserEvent,
  OrganiserPayment,
  Venue,
} from '@/lib/types'

const day = (d: number, hourIST: number) => {
  const t = new Date()
  t.setUTCHours(hourIST - 6, 30, 0, 0) // IST = UTC+5:30, so 19:00 IST = 13:30 UTC
  t.setUTCDate(t.getUTCDate() + d)
  return t.toISOString()
}

const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const BLOCK_COLORS = ['#F4A28C', '#C5E1A5', '#F48FB1', '#81D4FA', '#81D4FA', '#F48FB1', '#C5E1A5', '#F4A28C']

export const VENUES: Venue[] = [
  {
    id: 'v-sabarmati',
    name: 'Sabarmati Bowl',
    city: 'Ahmedabad',
    address: 'Motera, Ahmedabad, Gujarat',
    venueType: 'seated',
    capacity: 840,
    imageUrl: null,
    instructions:
      'Gates open 2 hours before start. No outside food, umbrellas or professional cameras. Blocks A–H are reached from the outer concourse; Pavilion via Gate 1.',
    layout: {
      viewBox: '0 0 1000 800',
      stage: { shape: 'rect', x: 380, y: 30, w: 240, h: 60, label: 'STAGE' },
      sections: [
        { code: 'PL', name: 'Pavilion Left', kind: 'seated', color: '#3B5BDB', shape: 'grid', x: 300, y: 120, w: 180, h: 90, rows: 4, seatsPerRow: 15 },
        { code: 'PR', name: 'Pavilion Right', kind: 'seated', color: '#3B5BDB', shape: 'grid', x: 520, y: 120, w: 180, h: 90, rows: 4, seatsPerRow: 15 },
        ...BLOCKS.map((code, i) => ({
          code,
          name: `Block ${code}`,
          kind: 'seated' as const,
          color: BLOCK_COLORS[i],
          shape: 'arc' as const,
          cx: 500,
          cy: 120,
          innerR: 260,
          outerR: 380,
          startDeg: 200 - i * 27.5,
          endDeg: 225 - i * 27.5,
          rows: 6,
          seatsPerRow: 15,
        })),
      ],
    },
    sections: [
      { id: 'vs-pl', code: 'PL', name: 'Pavilion Left', kind: 'seated', capacity: 60, color: '#3B5BDB' },
      { id: 'vs-pr', code: 'PR', name: 'Pavilion Right', kind: 'seated', capacity: 60, color: '#3B5BDB' },
      ...BLOCKS.map((code, i) => ({
        id: `vs-${code.toLowerCase()}`,
        code,
        name: `Block ${code}`,
        kind: 'seated' as const,
        capacity: 90,
        color: BLOCK_COLORS[i],
      })),
    ],
  },
  {
    id: 'v-lakeside',
    name: 'Lakeside Grounds',
    city: 'Bengaluru',
    address: 'Hebbal Lake Road, Bengaluru, Karnataka',
    venueType: 'sectioned',
    capacity: 2400,
    imageUrl: null,
    instructions:
      'Open-air venue. Standing sections are first come, first served inside each zone. Lounge includes F&B. Carry a valid ID for age-restricted zones.',
    layout: {
      viewBox: '0 0 1000 800',
      stage: { shape: 'rect', x: 300, y: 20, w: 400, h: 60, label: 'STAGE' },
      sections: [
        { code: 'SL', name: 'Solitaire Left', kind: 'seated', color: '#1E3A8A', shape: 'rect', x: 230, y: 110, w: 250, h: 90, capacity: 150 },
        { code: 'SR', name: 'Solitaire Right', kind: 'seated', color: '#1E3A8A', shape: 'rect', x: 520, y: 110, w: 250, h: 90, capacity: 150 },
        { code: 'PL', name: 'Platinum Left', kind: 'seated', color: '#4DABF7', shape: 'rect', x: 230, y: 215, w: 250, h: 150, capacity: 300 },
        { code: 'PR', name: 'Platinum Right', kind: 'seated', color: '#4DABF7', shape: 'rect', x: 520, y: 215, w: 250, h: 150, capacity: 300 },
        { code: 'GOLD', name: 'Gold Standing', kind: 'standing', color: '#FFC24B', shape: 'rect', x: 230, y: 385, w: 540, h: 140, capacity: 700 },
        { code: 'SILVER', name: 'Silver Standing', kind: 'standing', color: '#ADB5BD', shape: 'rect', x: 230, y: 545, w: 540, h: 170, capacity: 700 },
        { code: 'LOUNGE', name: 'Lounge', kind: 'standing', color: '#B57EDC', shape: 'rect', x: 90, y: 215, w: 110, h: 310, capacity: 100 },
      ],
    },
    sections: [
      { id: 'vs-sl', code: 'SL', name: 'Solitaire Left', kind: 'seated', capacity: 150, color: '#1E3A8A' },
      { id: 'vs-sr', code: 'SR', name: 'Solitaire Right', kind: 'seated', capacity: 150, color: '#1E3A8A' },
      { id: 'vs-plat-l', code: 'PL', name: 'Platinum Left', kind: 'seated', capacity: 300, color: '#4DABF7' },
      { id: 'vs-plat-r', code: 'PR', name: 'Platinum Right', kind: 'seated', capacity: 300, color: '#4DABF7' },
      { id: 'vs-gold', code: 'GOLD', name: 'Gold Standing', kind: 'standing', capacity: 700, color: '#FFC24B' },
      { id: 'vs-silver', code: 'SILVER', name: 'Silver Standing', kind: 'standing', capacity: 700, color: '#ADB5BD' },
      { id: 'vs-lounge', code: 'LOUNGE', name: 'Lounge', kind: 'standing', capacity: 100, color: '#B57EDC' },
    ],
  },
  {
    id: 'v-courtyard',
    name: 'Courtyard Theatre',
    city: 'Mumbai',
    address: 'Kala Ghoda, Fort, Mumbai, Maharashtra',
    venueType: 'seated',
    capacity: 240,
    imageUrl: null,
    instructions: 'Latecomers are seated at the interval. Children under 5 not permitted. Photography prohibited during the show.',
    layout: {
      viewBox: '0 0 1000 800',
      stage: { shape: 'rect', x: 250, y: 30, w: 500, h: 70, label: 'STAGE' },
      sections: [
        { code: 'FR', name: 'Front Stalls', kind: 'seated', color: '#FF9F43', shape: 'grid', x: 200, y: 140, w: 600, h: 160, rows: 4, seatsPerRow: 20 },
        { code: 'MS', name: 'Mid Stalls', kind: 'seated', color: '#14D3B5', shape: 'grid', x: 200, y: 330, w: 600, h: 160, rows: 4, seatsPerRow: 20 },
        { code: 'RS', name: 'Rear Stalls', kind: 'seated', color: '#3B82F6', shape: 'grid', x: 200, y: 520, w: 600, h: 160, rows: 4, seatsPerRow: 20 },
      ],
    },
    sections: [
      { id: 'vs-fr', code: 'FR', name: 'Front Stalls', kind: 'seated', capacity: 80, color: '#FF9F43' },
      { id: 'vs-ms', code: 'MS', name: 'Mid Stalls', kind: 'seated', capacity: 80, color: '#14D3B5' },
      { id: 'vs-rs', code: 'RS', name: 'Rear Stalls', kind: 'seated', capacity: 80, color: '#3B82F6' },
    ],
  },
  {
    id: 'v-loft',
    name: 'The Loft',
    city: 'Bengaluru',
    address: '12th Main, Indiranagar, Bengaluru, Karnataka',
    venueType: 'open',
    capacity: 150,
    imageUrl: null,
    instructions: 'Free seating, first come first served. Bar open throughout. Entry closes 30 minutes after start.',
    layout: null,
    sections: [],
  },
]

export const MY_EVENTS: OrganiserEvent[] = [
  {
    id: 'e-neon',
    title: 'Neon Nights',
    eventType: 'Concert',
    posterUrl: null,
    posterDescription: 'Electric pink and amber stage lights',
    venue: { name: 'Sabarmati Bowl', city: 'Ahmedabad' },
    startsAt: day(9, 19),
    endsAt: day(9, 23),
    seatingMode: 'assigned',
    minPricePaise: 99900,
    availability: 'fast',
    capacity: 840,
    sold: 412,
    revenuePaise: 412 * 249900,
  },
  {
    id: 'e-laugh',
    title: 'Laugh Riot',
    eventType: 'Comedy',
    posterUrl: null,
    posterDescription: '',
    venue: { name: 'Lakeside Grounds', city: 'Bengaluru' },
    startsAt: day(4, 20),
    endsAt: day(4, 22),
    seatingMode: 'sectioned',
    minPricePaise: 199900,
    availability: 'available',
    capacity: 2400,
    sold: 318,
    revenuePaise: 318 * 349900,
  },
  {
    id: 'e-open-mic',
    title: 'Open Mic Night',
    eventType: 'Comedy',
    posterUrl: null,
    posterDescription: '',
    venue: { name: 'The Loft', city: 'Bengaluru' },
    startsAt: day(-3, 20),
    endsAt: day(-3, 22),
    seatingMode: 'free',
    minPricePaise: 49900,
    availability: 'sold_out',
    capacity: 150,
    sold: 150,
    revenuePaise: 150 * 49900,
  },
]

/** venueId of each mock event (for clash checks). */
export const EVENT_VENUE: Record<string, string> = {
  'e-neon': 'v-sabarmati',
  'e-laugh': 'v-lakeside',
  'e-open-mic': 'v-loft',
}

export function mockStats(ev: OrganiserEvent): EventStats {
  const venueId = EVENT_VENUE[ev.id]
  const venue = VENUES.find((v) => v.id === venueId)
  const heldNow = ev.sold >= ev.capacity ? 0 : Math.min(12, ev.capacity - ev.sold)
  const secs =
    ev.seatingMode === 'free' || !venue?.sections.length
      ? [{ id: 'ga', name: 'General Admission', capacity: ev.capacity }]
      : venue.sections.map((s) => ({ id: s.id, name: s.name, capacity: s.capacity }))

  // Spread sold/held across sections proportionally so totals reconcile exactly.
  let soldLeft = ev.sold
  let heldLeft = heldNow
  const totalCap = secs.reduce((a, s) => a + s.capacity, 0)
  const sections = secs.map((s, i) => {
    const last = i === secs.length - 1
    const sold = last ? soldLeft : Math.min(s.capacity, Math.round((ev.sold * s.capacity) / totalCap))
    soldLeft -= sold
    const held = last ? heldLeft : Math.min(s.capacity - sold, Math.round((heldNow * s.capacity) / totalCap))
    heldLeft -= held
    const pricePaise = ev.minPricePaise + (secs.length - 1 - i) * 50000
    return {
      sectionId: s.id,
      name: s.name,
      pricePaise,
      capacity: s.capacity,
      sold,
      heldNow: held,
      available: s.capacity - sold - held,
      revenuePaise: sold * pricePaise,
    }
  })
  const revenuePaise = sections.reduce((a, s) => a + s.revenuePaise, 0)
  const bookings = Math.round(ev.sold / 2.4)

  return {
    eventId: ev.id,
    capacity: ev.capacity,
    sold: ev.sold,
    heldNow,
    available: ev.capacity - ev.sold - heldNow,
    revenuePaise,
    bookings,
    attempts: { succeeded: bookings, failed: Math.round(bookings * 0.08), expired: Math.round(bookings * 0.12) },
    sections,
  }
}

const NAMES = ['Aarav Shah', 'Diya Menon', 'Kabir Rao', 'Ishita Iyer', 'Rohan Gupta', 'Meera Nair', 'Arjun Das', 'Sara Khan']

export function mockBookings(ev: OrganiserEvent): OrganiserBooking[] {
  if (!ev.sold) return []
  return NAMES.map((n, i) => {
    const qty = (i % 4) + 1
    return {
      ticketCode: `ENC-${(7_340_000 + i * 7919).toString(36).toUpperCase()}`,
      customerName: n,
      ticketCount: qty,
      totalPaise: qty * ev.minPricePaise,
      seats:
        ev.seatingMode === 'assigned'
          ? Array.from({ length: qty }, (_, k) => `${BLOCKS[i % 8]}-C${10 + k}`)
          : [`${qty} × ${ev.seatingMode === 'free' ? 'General' : 'Gold Standing'}`],
      createdAt: new Date(Date.now() - i * 47 * 60000).toISOString(),
    }
  })
}

export function mockPayments(ev: OrganiserEvent): OrganiserPayment[] {
  if (!ev.sold) return []
  const statuses: [OrganiserPayment['status'], string | null][] = [
    ['succeeded', null],
    ['expired', 'TIMEOUT'],
    ['succeeded', null],
    ['failed', 'OTP_LOCKED'],
    ['succeeded', null],
    ['failed', 'HOLD_EXPIRED'],
    ['succeeded', null],
  ]
  return statuses.map(([status, failureReason], i) => ({
    attemptNo: (i % 3) + 1,
    method: i % 2 ? 'netbanking' : 'upi_qr',
    status,
    failureReason,
    amountPaise: ((i % 4) + 1) * ev.minPricePaise,
    createdAt: new Date(Date.now() - i * 23 * 60000).toISOString(),
  }))
}
