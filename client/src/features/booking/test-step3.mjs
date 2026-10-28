import { getActiveHold, setActiveHold } from './holdStore.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🔍 [STEP 3 VERIFICATION] Testing Active Hold Store & Lazy Expiry Logic...\n');

// 1. Initial state is null
assert(getActiveHold() === null, 'Initial store must be null');
console.log('✅ Initial hold store is empty.');

// 2. Set active hold with future expiresAt
const futureHold = {
  holdId: 'hold-test-123',
  eventId: 'ev-neon-nights',
  eventTitle: 'Neon Nights: Electronic Symphony',
  expiresAt: new Date(Date.now() + 180 * 1000).toISOString(),
  totalPaise: 399800,
  ticketCount: 2
};

setActiveHold(futureHold);
const retrieved = getActiveHold();
assert(retrieved !== null && retrieved.holdId === 'hold-test-123', 'Should retrieve active hold');
assert(retrieved.ticketCount === 2, 'Ticket count must match');
console.log(`✅ setActiveHold(): Stored active hold for "${retrieved.eventTitle}".`);

// 3. Test Lazy Expiry (Rule R4): Hold with past expiresAt
const expiredHold = {
  holdId: 'hold-expired-999',
  eventId: 'ev-neon-nights',
  eventTitle: 'Neon Nights',
  expiresAt: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
  totalPaise: 199900,
  ticketCount: 1
};

setActiveHold(expiredHold);
const expiredCheck = getActiveHold();
assert(expiredCheck === null, 'Lazy expiry: Past expiresAt must automatically clean up and return null');
console.log('✅ Rule R4 Verified: getActiveHold() immediately discarded expired hold without sweeper delay.');

// Clean up
setActiveHold(null);
assert(getActiveHold() === null, 'setActiveHold(null) clears hold');
console.log('✅ Clear store verified.');

console.log('\n🎉 ALL STEP 3 HOLD STORE CHECKS PASSED SUCCESSFULLY!\n');
