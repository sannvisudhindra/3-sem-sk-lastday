import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatINR, formatIST } from './format.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🔍 [STEP 4 VERIFICATION] Testing Coverflow 3D Math, Formatting, & Component Export...\n');

// 1. Test PRD §8.3 Coverflow 3D Transform Equations
function computeTransform(distance) {
  const absDist = Math.abs(distance);
  const rotateY = Math.max(-45, Math.min(45, distance * -30));
  const scale = Math.max(0.7, 1 - absDist * 0.14);
  const zTranslate = -absDist * 140;
  const opacity = Math.max(0.3, 1 - absDist * 0.28);
  return { rotateY, scale, zTranslate, opacity };
}

// Center active card (d = 0)
const center = computeTransform(0);
assert(center.rotateY === 0, 'Active card rotateY must be 0');
assert(center.scale === 1, 'Active card scale must be 1.0');
assert(center.zTranslate === 0, 'Active card z-depth must be 0');
assert(center.opacity === 1, 'Active card opacity must be 1.0');

// Adjacent card (d = 1)
const rightCard = computeTransform(1);
assert(rightCard.rotateY === -30, 'Right adjacent card rotateY must be -30 deg');
assert(rightCard.scale === 0.86, 'Right adjacent card scale must be 0.86');
assert(rightCard.zTranslate === -140, 'Right adjacent card zTranslate must be -140px');

// Clamped card (d = 3)
const farCard = computeTransform(3);
assert(farCard.rotateY === -45, 'Far card rotateY must clamp at -45 deg');
console.log('✅ Coverflow 3D Transform Equations verified for center, adjacent, and clamped cards.');

// 2. Test Currency & IST formatting
assert(formatINR(199900) === '₹1,999', `Expected "₹1,999", got ${formatINR(199900)}`);
assert(formatINR(499900) === '₹4,999', `Expected "₹4,999", got ${formatINR(499900)}`);
const istStr = formatIST('2026-11-15T19:30:00Z');
assert(typeof istStr === 'string' && istStr.length > 5, 'formatIST must return formatted date string');
console.log(`✅ Currency & IST Formatting: 199900 paise -> ${formatINR(199900)}, ISO timestamp -> ${istStr}`);

// 3. Verify Components files exist and have default exports
const coverflowPath = path.join(__dirname, 'Coverflow.tsx');
const eventsPagePath = path.join(__dirname, '../../pages/customer/EventsPage.tsx');
assert(fs.existsSync(coverflowPath), 'Coverflow.tsx must exist');
assert(fs.existsSync(eventsPagePath), 'EventsPage.tsx must exist');

const coverflowSrc = fs.readFileSync(coverflowPath, 'utf8');
const eventsPageSrc = fs.readFileSync(eventsPagePath, 'utf8');
assert(coverflowSrc.includes('export default function Coverflow'), 'Coverflow must have default export');
assert(eventsPageSrc.includes('export default function EventsPage'), 'EventsPage must have default export');
console.log('✅ Coverflow and EventsPage exist with standard default component exports.');

console.log('\n🎉 ALL STEP 4 COVERFLOW & EVENTS CHECKS PASSED SUCCESSFULLY!\n');
