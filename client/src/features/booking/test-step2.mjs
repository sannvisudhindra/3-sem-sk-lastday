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
  getPaymentStatus,
  fetchMyBookings,
  ApiError
} from './api.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🔍 [STEP 2 VERIFICATION] Testing Customer API Layer methods against PRD §7.3...\n');

// 1. Test fetchEvents
const allEvents = await fetchEvents();
assert(Array.isArray(allEvents) && allEvents.length === 3, 'fetchEvents() should return 3 events');
const blrEvents = await fetchEvents('Bengaluru');
assert(blrEvents.length === 2, `Expected 2 Bengaluru events, got ${blrEvents.length}`);
const comedyEvents = await fetchEvents(undefined, 'comedy');
assert(comedyEvents.length === 1 && comedyEvents[0].id === 'ev-open-mic', 'Filter by comedy failed');
console.log('✅ fetchEvents(): All events, city filtering, and category filtering verified.');

// 2. Test fetchEventDetail
const seatedDetail = await fetchEventDetail('ev-neon-nights');
assert(seatedDetail.seatingMode === 'assigned', 'Detail should have assigned mode');
assert(seatedDetail.venue.layout.sections.length === 2, 'Venue layout should have 2 sections');
console.log('✅ fetchEventDetail(): Correct event loaded with venue and sections.');

// 3. Test fetchEventSeats (Grid + Arc calculation)
const seats = await fetchEventSeats('ev-neon-nights');
assert(Array.isArray(seats) && seats.length > 50, `Calculated seats should be > 50, got ${seats.length}`);
const hasGrid = seats.some(s => s.sectionId === 'PREM');
const hasArc = seats.some(s => s.sectionId === 'BLKA');
assert(hasGrid && hasArc, 'Generated seats should cover both grid and arc shapes');
assert(seats.every(s => typeof s.x === 'number' && typeof s.y === 'number'), 'All seats must have computed coordinates');
console.log(`✅ fetchEventSeats(): Generated ${seats.length} seats from SVG geometry (grid & arc).`);

// 4. Test joinQueue
const q = await joinQueue('ev-neon-nights');
assert(q.status === 'admitted', 'Mock queue join should be admitted');
console.log('✅ joinQueue(): Admitted queue entry received.');

// 5. Test createHold with valid seats
const hold = await createHold({
  eventId: 'ev-neon-nights',
  seatIds: ['seat-PREM-A1', 'seat-PREM-A2']
});
assert(hold.holdId && hold.ticketCount === 2, 'Hold should be created for 2 seats');
assert(hold.totalPaise > 0, 'Hold must calculate server total price in paise');
assert(!isNaN(Date.parse(hold.expiresAt)), 'Hold expiresAt must be valid timestamp');
console.log(`✅ createHold(): Successfully held 2 seats for total ${hold.totalPaise} paise (expires in 180s).`);

// 6. Test R6: Ticket limit enforcement (> 10 tickets)
let limitCaught = false;
try {
  await createHold({
    eventId: 'ev-neon-nights',
    seatIds: Array.from({ length: 11 }, (_, i) => `seat-PREM-A${i + 1}`)
  });
} catch (err) {
  if (err instanceof ApiError && err.code === 'LIMIT_EXCEEDED') {
    limitCaught = true;
  }
}
assert(limitCaught, 'createHold must throw LIMIT_EXCEEDED for > 10 tickets');
console.log('✅ createHold() rule R6: Blocked 11 tickets with LIMIT_EXCEEDED.');

// 7. Test Payments, OTP, and confirmation
const payment = await createPayment(hold.holdId, 'netbanking');
assert(payment.paymentId && payment.attemptNo === 1, 'Payment attempt created');
const otpResult = await sendOtp(payment.paymentId);
assert(otpResult.sent && otpResult.emailHint, 'OTP sent with email hint');

// Test wrong OTP
let otpErrorCaught = false;
try {
  await verifyOtp(payment.paymentId, '000000');
} catch (err) {
  if (err instanceof ApiError && err.code === 'OTP_INVALID' && err.details?.attemptsLeft === 2) {
    otpErrorCaught = true;
  }
}
assert(otpErrorCaught, 'Wrong OTP must throw OTP_INVALID with attemptsLeft=2');
console.log('✅ verifyOtp(): Rejected wrong OTP with 2 attempts remaining.');

// Test correct OTP
const confirmResult = await verifyOtp(payment.paymentId, '123456');
assert(confirmResult.status === 'succeeded' && confirmResult.bookingId, 'Valid OTP 123456 must succeed');
console.log(`✅ verifyOtp(): Correct OTP confirmed booking ${confirmResult.bookingId}.`);

// 8. Test fetchMyBookings
const myBookings = await fetchMyBookings();
assert(Array.isArray(myBookings) && myBookings.length > 0, 'fetchMyBookings must return bookings');
console.log(`✅ fetchMyBookings(): Found ${myBookings.length} confirmed booking.`);

console.log('\n🎉 ALL STEP 2 API CLIENT CHECKS PASSED SUCCESSFULLY!\n');
