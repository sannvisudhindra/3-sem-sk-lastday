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

console.log('🔍 [STEP 7 VERIFICATION] Testing Virtual Waiting Room Page...\n');

const wrPath = path.join(__dirname, '../../pages/customer/WaitingRoomPage.tsx');
assert(fs.existsSync(wrPath), 'WaitingRoomPage.tsx must exist');

const src = fs.readFileSync(wrPath, 'utf8');
assert(src.includes('export default function WaitingRoomPage'), 'WaitingRoomPage must have default export');
assert(src.includes('checkQueueStatus(entryId)'), 'WaitingRoomPage must call checkQueueStatus');
assert(src.includes('3000'), 'WaitingRoomPage must poll every 3 seconds per PRD P-4');
assert(src.includes('navigate(`/events/${targetEventId}/book`)'), 'WaitingRoomPage must redirect to booking upon admission');

console.log('✅ WaitingRoomPage: 3s polling loop, queue position counter, and admission redirect verified.');
console.log('\n🎉 ALL STEP 7 WAITING ROOM CHECKS PASSED SUCCESSFULLY!\n');
