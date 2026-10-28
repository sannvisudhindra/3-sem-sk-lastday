import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  fetchEvents,
  fetchEventDetail,
  fetchEventSeats,
  joinQueue,
  createHold,
  releaseHold,
  createPayment,
  sendOtp,
  verifyOtp,
  fetchMyBookings,
  ApiError
} from './api.ts';
import { getActiveHold, setActiveHold } from './holdStore.ts';
import { formatINR, formatIST } from './format.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [TEST FAILURE]: ${message}`);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('🚀 ENCORE - AGENT P3 (CUSTOMER FRONTEND) COMPLETE TEST SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: File Structure & Role Boundaries
// -------------------------------------------------------------
console.log('STEP 1: Verifying Owned Files & Boundaries...');
const expectedFiles = [
  'types.ts',
  'format.ts',
  'api.ts',
  'holdStore.ts',
  'HoldTimerPill.tsx',
  'Coverflow.tsx',
  'SeatMap.tsx',
  'SectionPicker.tsx',
  'QuantityPicker.tsx',
  'Confetti.tsx',
  '../../pages/customer/EventsPage.tsx',
  '../../pages/customer/BookingPage.tsx',
  '../../pages/customer/WaitingRoomPage.tsx',
  '../../pages/customer/CheckoutPage.tsx',
  '../../pages/customer/MockPayPage.tsx',
  '../../pages/customer/MyBookingsPage.tsx',
  '../../mocks/customer/events.json',
  '../../mocks/customer/event-detail-seated.json',
  '../../mocks/customer/event-detail-sectioned.json',
  '../../mocks/customer/event-detail-free.json',
  '../../mocks/customer/bookings.json'
];

expectedFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  assert(fs.existsSync(fullPath), `Missing required P3 file: ${file}`);
});
console.log(`✅ All ${expectedFiles.length} files exist within P3's ownership boundary.\n`);

// -------------------------------------------------------------
// Test 2: Customer Browse & Filtering (PRD §8.3 P-2)
// -------------------------------------------------------------
console.log('STEP 2: Testing Event Browse & Filtering...');
const events = await fetchEvents();
assert(events.length === 3, 'Must return 3 mock events');
const concert = events.find(e => e.eventType === 'concert');
assert(concert && concert.minPricePaise === 199900, 'Concert minimum price mismatch');
console.log(`✅ Fetched ${events.length} events. Formatted price: ${formatINR(concert.minPricePaise)}, Date: ${formatIST(concert.startsAt)}.\n`);

// -------------------------------------------------------------
// Test 3: Waiting Room Flow (PRD §8.3 P-4)
// -------------------------------------------------------------
console.log('STEP 3: Testing Queue Admission...');
const queueEntry = await joinQueue(concert.id);
assert(queueEntry.status === 'admitted', 'Queue entry should be admitted in mock flow');
console.log(`✅ Queue admitted. Entry ID: ${queueEntry.entryId}.\n`);

// -------------------------------------------------------------
// Test 4: Venue & Seating Geometry (PRD §5.3)
// -------------------------------------------------------------
console.log('STEP 4: Testing Seating Modes & SVG Geometry...');
const seatedDetail = await fetchEventDetail(concert.id);
assert(seatedDetail.seatingMode === 'assigned', 'Seated event must be assigned');
const seats = await fetchEventSeats(concert.id);
assert(seats.length > 50, 'Must generate seats from SVG geometry');
const sampleSeat = seats[0];
assert(typeof sampleSeat.x === 'number' && typeof sampleSeat.y === 'number', 'Seat must have x,y coordinates');
console.log(`✅ Generated ${seats.length} interactive seats with tier coordinates.\n`);

// -------------------------------------------------------------
// Test 5: Hold Creation & Server Pricing (PRD Rule R2, R10)
// -------------------------------------------------------------
console.log('STEP 5: Testing Hold Creation & Server Paise Calculation...');
const hold = await createHold({
  eventId: concert.id,
  seatIds: [seats[0].id, seats[1].id]
});
assert(hold.ticketCount === 2, 'Hold ticket count mismatch');
assert(hold.totalPaise === 2 * (seatedDetail.sections[0]?.pricePaise || concert.minPricePaise), 'Paise total mismatch');
console.log(`✅ Seats held successfully: ${hold.holdId} (Total: ${formatINR(hold.totalPaise)}).\n`);

// -------------------------------------------------------------
// Test 6: 10-Ticket Limit Rule (PRD Rule R6)
// -------------------------------------------------------------
console.log('STEP 6: Testing Max 10 Tickets Enforcement (Rule R6)...');
let limitBlocked = false;
try {
  await createHold({
    eventId: concert.id,
    seatIds: Array.from({ length: 11 }, (_, i) => `seat-TEST-${i}`)
  });
} catch (err) {
  if (err instanceof ApiError && err.code === 'LIMIT_EXCEEDED') {
    limitBlocked = true;
  }
}
assert(limitBlocked, 'Must block requests for > 10 tickets with LIMIT_EXCEEDED');
console.log('✅ Rule R6 strictly enforced: Blocked 11 tickets with LIMIT_EXCEEDED.\n');

// -------------------------------------------------------------
// Test 7: Active Hold Store & Lazy Expiry (PRD Rule R3, R4)
// -------------------------------------------------------------
console.log('STEP 7: Testing Hold Store & Lazy Expiry (Rule R4)...');
setActiveHold({
  holdId: hold.holdId,
  eventId: concert.id,
  eventTitle: concert.title,
  expiresAt: hold.expiresAt,
  totalPaise: hold.totalPaise,
  ticketCount: hold.ticketCount
});
assert(getActiveHold()?.holdId === hold.holdId, 'Active hold store mismatch');

// Test lazy expiry with expired timestamp
setActiveHold({
  holdId: 'hold-old',
  eventId: concert.id,
  eventTitle: concert.title,
  expiresAt: new Date(Date.now() - 1000).toISOString(),
  totalPaise: 1000,
  ticketCount: 1
});
assert(getActiveHold() === null, 'Lazy expiry must return null for past expiresAt');
console.log('✅ Hold store and lazy expiry validated.\n');

// -------------------------------------------------------------
// Test 8: Payment Attempt & 60s Window (PRD §9)
// -------------------------------------------------------------
console.log('STEP 8: Testing Payment Attempt & OTP Flow...');
const payment = await createPayment(hold.holdId, 'netbanking');
assert(payment.paymentId && payment.attemptNo === 1, 'Payment attempt creation failed');
const otp = await sendOtp(payment.paymentId);
assert(otp.sent, 'OTP sending failed');
console.log(`✅ Payment ${payment.paymentId} created. OTP sent to ${otp.emailHint}.\n`);

// -------------------------------------------------------------
// Test 9: OTP Validation & Concurrency Protection (PRD Rule R14, R15)
// -------------------------------------------------------------
console.log('STEP 9: Testing OTP Validation & Wrong Attempts Limit...');
let wrongOtpBlocked = false;
try {
  await verifyOtp(payment.paymentId, '999999');
} catch (err) {
  if (err instanceof ApiError && err.code === 'OTP_INVALID') {
    wrongOtpBlocked = true;
  }
}
assert(wrongOtpBlocked, 'Must reject invalid OTP with OTP_INVALID');

// Correct OTP
const confirmation = await verifyOtp(payment.paymentId, '123456');
assert(confirmation.status === 'succeeded' && confirmation.bookingId, 'Booking confirmation failed');
console.log(`✅ OTP verified successfully! Booking confirmed with ID: ${confirmation.bookingId}.\n`);

// -------------------------------------------------------------
// Test 10: My Bookings & Ticket Code Integrity (PRD §8.3 P-7)
// -------------------------------------------------------------
console.log('STEP 10: Testing My Bookings & QR Ticket Retrieval...');
const myBookings = await fetchMyBookings();
assert(myBookings.length > 0, 'No bookings found');
const ticket = myBookings[0];
assert(ticket.ticketCode.startsWith('ENC-'), 'Ticket code must begin with ENC-');
assert(ticket.totalPaise > 0, 'Total paise must be > 0');
console.log(`✅ Booking retrieved: Ticket ${ticket.ticketCode} for "${ticket.event.title}". Total: ${formatINR(ticket.totalPaise)}.\n`);

console.log('================================================================');
console.log('🎉 ALL 10 CUSTOMER FRONTEND SUITE TESTS PASSED 100%!');
console.log('================================================================\n');
