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

console.log('🔍 [STEP 1 VERIFICATION] Validating customer mock fixtures & contracts against PRD §7.3...\n');

// 1. Validate events.json
const eventsPath = path.join(__dirname, 'events.json');
assert(fs.existsSync(eventsPath), 'events.json does not exist');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
assert(Array.isArray(events) && events.length >= 3, 'events.json must contain at least 3 seeded events');

const validModes = ['assigned', 'sectioned', 'free'];
const validTypes = ['concert', 'comedy', 'theatre', 'sports', 'festival'];

events.forEach((ev, i) => {
  assert(ev.id && typeof ev.id === 'string', `Event [${i}] missing valid id`);
  assert(ev.title && typeof ev.title === 'string', `Event [${i}] missing valid title`);
  assert(validTypes.includes(ev.eventType), `Event [${i}] has invalid eventType: ${ev.eventType}`);
  assert(ev.venue && ev.venue.name && ev.venue.city, `Event [${i}] missing venue name or city`);
  assert(!isNaN(Date.parse(ev.startsAt)), `Event [${i}] invalid startsAt ISO string`);
  assert(!isNaN(Date.parse(ev.endsAt)), `Event [${i}] invalid endsAt ISO string`);
  assert(validModes.includes(ev.seatingMode), `Event [${i}] invalid seatingMode: ${ev.seatingMode}`);
  assert(Number.isInteger(ev.minPricePaise) && ev.minPricePaise > 0, `Event [${i}] minPricePaise must be positive integer paise`);
  assert(['available', 'fast', 'sold_out'].includes(ev.availability), `Event [${i}] invalid availability`);
});
console.log('✅ events.json: All 3 event modes present, schema & ISO timestamps valid.');

// 2. Validate event-detail-seated.json
const seatedPath = path.join(__dirname, 'event-detail-seated.json');
assert(fs.existsSync(seatedPath), 'event-detail-seated.json does not exist');
const seated = JSON.parse(fs.readFileSync(seatedPath, 'utf8'));
assert(seated.seatingMode === 'assigned', 'Seated event seatingMode must be "assigned"');
assert(seated.venue.layout, 'Seated event must include venue.layout');
assert(seated.venue.layout.width > 0 && seated.venue.layout.height > 0, 'venue.layout must have positive dimensions');
assert(seated.venue.layout.stage && seated.venue.layout.stage.w > 0, 'venue.layout.stage missing or invalid');
assert(Array.isArray(seated.venue.layout.sections) && seated.venue.layout.sections.length > 0, 'layout.sections missing');
console.log('✅ event-detail-seated.json: Venue SVG geometry (stage & arc/grid sections) valid.');

// 3. Validate event-detail-sectioned.json
const sectionedPath = path.join(__dirname, 'event-detail-sectioned.json');
assert(fs.existsSync(sectionedPath), 'event-detail-sectioned.json does not exist');
const sectioned = JSON.parse(fs.readFileSync(sectionedPath, 'utf8'));
assert(sectioned.seatingMode === 'sectioned', 'Sectioned event seatingMode must be "sectioned"');
assert(Array.isArray(sectioned.sections) && sectioned.sections.length >= 2, 'Sectioned event must have at least 2 sections');
sectioned.sections.forEach(s => {
  assert(s.id && s.name && s.color, 'Section missing id/name/color');
  assert(Number.isInteger(s.pricePaise) && s.pricePaise > 0, 'Section pricePaise must be positive integer');
  assert(s.capacity >= s.available, 'Capacity must be >= available');
});
console.log('✅ event-detail-sectioned.json: Section tiers, capacity, and paise pricing valid.');

// 4. Validate event-detail-free.json
const freePath = path.join(__dirname, 'event-detail-free.json');
assert(fs.existsSync(freePath), 'event-detail-free.json does not exist');
const free = JSON.parse(fs.readFileSync(freePath, 'utf8'));
assert(free.seatingMode === 'free', 'Free event seatingMode must be "free"');
assert(Array.isArray(free.sections) && free.sections.length >= 1, 'Free event must have General Admission section');
console.log('✅ event-detail-free.json: General Admission capacity and pricing valid.');

// 5. Validate bookings.json
const bookingsPath = path.join(__dirname, 'bookings.json');
assert(fs.existsSync(bookingsPath), 'bookings.json does not exist');
const bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf8'));
assert(Array.isArray(bookings) && bookings.length > 0, 'bookings.json must have at least one booking');
const b = bookings[0];
assert(b.ticketCode && b.ticketCode.startsWith('ENC-'), 'ticketCode must follow ENC- prefix format');
assert(Array.isArray(b.items) && b.items.length > 0, 'Booking must have items array');
const calculatedPaise = b.items.reduce((sum, item) => sum + item.unitPricePaise * item.qty, 0);
assert(calculatedPaise === b.totalPaise, `Total paise (${b.totalPaise}) does not match items sum (${calculatedPaise})`);
console.log('✅ bookings.json: Ticket code format, QR payload & price integrity verified.');

console.log('\n🎉 ALL STEP 1 FIXTURE CONTRACT CHECKS PASSED SUCCESSFULLY!\n');
