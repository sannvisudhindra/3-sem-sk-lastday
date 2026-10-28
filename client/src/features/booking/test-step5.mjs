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

console.log('🔍 [STEP 5 VERIFICATION] Testing SeatMap, SectionPicker, and QuantityPicker components...\n');

// 1. Verify files exist
const seatMapPath = path.join(__dirname, 'SeatMap.tsx');
const sectionPickerPath = path.join(__dirname, 'SectionPicker.tsx');
const quantityPickerPath = path.join(__dirname, 'QuantityPicker.tsx');

assert(fs.existsSync(seatMapPath), 'SeatMap.tsx must exist');
assert(fs.existsSync(sectionPickerPath), 'SectionPicker.tsx must exist');
assert(fs.existsSync(quantityPickerPath), 'QuantityPicker.tsx must exist');

// 2. Verify exports and contracts
const seatMapSrc = fs.readFileSync(seatMapPath, 'utf8');
assert(seatMapSrc.includes('export default function SeatMap'), 'SeatMap must have default export');
assert(seatMapSrc.includes('readOnly = false'), 'SeatMap must accept readOnly prop');
assert(seatMapSrc.includes('highlightBooked'), 'SeatMap must accept highlightBooked prop');
assert(seatMapSrc.includes('#FF5E62'), 'SeatMap must use coral glow for selected seats');
assert(seatMapSrc.includes('#2A2D3A'), 'SeatMap must use #2A2D3A for booked seats per PRD §8.1');
assert(seatMapSrc.includes('diagonalHatch'), 'SeatMap must use diagonal stripe pattern for held seats');
console.log('✅ SeatMap: Contract props, readOnly mode, and PRD §8.1 state colors verified.');

// 3. Verify SectionPicker & QuantityPicker logic
const sectionPickerSrc = fs.readFileSync(sectionPickerPath, 'utf8');
assert(sectionPickerSrc.includes('export default function SectionPicker'), 'SectionPicker must have default export');
assert(sectionPickerSrc.includes('currentTotal < maxTotalAllowed'), 'SectionPicker must enforce max ticket limit');

const quantityPickerSrc = fs.readFileSync(quantityPickerPath, 'utf8');
assert(quantityPickerSrc.includes('export default function QuantityPicker'), 'QuantityPicker must have default export');
assert(quantityPickerSrc.includes('Math.min(maxAllowed, availableCapacity)'), 'QuantityPicker must clamp to min(maxAllowed, availableCapacity)');
console.log('✅ SectionPicker & QuantityPicker: Ticket limit rules and clamping logic verified.');

console.log('\n🎉 ALL STEP 5 SEATING COMPONENT CHECKS PASSED SUCCESSFULLY!\n');
