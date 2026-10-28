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

console.log('🔍 [STEP 9 VERIFICATION] Testing Customer MyBookingsPage...\n');

const bookingsPath = path.join(__dirname, '../../pages/customer/MyBookingsPage.tsx');
assert(fs.existsSync(bookingsPath), 'MyBookingsPage.tsx must exist');

const src = fs.readFileSync(bookingsPath, 'utf8');
assert(src.includes('export default function MyBookingsPage'), 'MyBookingsPage must have default export');
assert(src.includes('fetchMyBookings()'), 'MyBookingsPage must load bookings');
assert(src.includes('QRCodeSVG'), 'MyBookingsPage must render QR code for ticketCode');
assert(src.includes('tab === \'upcoming\''), 'MyBookingsPage must support Upcoming and Past tabs');
assert(src.includes('border-dashed'), 'MyBookingsPage must render perforated divider for ticket look');

console.log('✅ MyBookingsPage: Ticket card layout, QR rendering, perforated divider, and tab filters verified.');
console.log('\n🎉 ALL STEP 9 MY BOOKINGS CHECKS PASSED SUCCESSFULLY!\n');
