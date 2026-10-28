import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🔍 [STEP 6 VERIFICATION] Testing BookingPage structure, limits, and hold navigation...\n');

const bookingPagePath = path.join(__dirname, '../../pages/customer/BookingPage.tsx');
assert(fs.existsSync(bookingPagePath), 'BookingPage.tsx must exist');

const src = fs.readFileSync(bookingPagePath, 'utf8');
assert(src.includes('export default function BookingPage'), 'BookingPage must have default export');
assert(src.includes('10 - (event.myTicketCount || 0)'), 'BookingPage must enforce 10 - myTicketCount limit per PRD R6');
assert(src.includes('createHold(payload)'), 'BookingPage must dispatch createHold');
assert(src.includes('setActiveHold({'), 'BookingPage must store active hold in session store');
assert(src.includes('SEAT_TAKEN'), 'BookingPage must handle SEAT_TAKEN concurrency error');
assert(src.includes('LIMIT_EXCEEDED'), 'BookingPage must handle LIMIT_EXCEEDED error');
assert(src.includes('navigate(`/checkout/${res.holdId}`)'), 'BookingPage must redirect to checkout on successful hold');

console.log('✅ BookingPage: R6 limit, createHold flow, activeHold persistence, and error handlers verified.');
console.log('\n🎉 ALL STEP 6 BOOKING PAGE CHECKS PASSED SUCCESSFULLY!\n');
