import { callRpc } from '../lib/rpc.js';
import { config } from '../config.js';

let intervalId = null;

/**
 * Runs a single sweep cycle by calling P1's sweep_expired SQL function.
 */
export async function runSweep() {
  try {
    const result = await callRpc('sweep_expired', {
      p_max_active: config.business.queueMaxActive,
      p_admission_seconds: config.business.queueAdmissionSeconds,
    });
    return result;
  } catch (err) {
    // If database is not yet ready or migrating, log error without crashing the server process
    if (config.nodeEnv !== 'test') {
      console.warn('[Sweeper] Background sweep cycle error:', err.message);
    }
    return null;
  }
}

/**
 * Starts the 10-second recurring background sweeper.
 */
export function startSweeper() {
  if (intervalId) return;

  console.log('[Sweeper] Starting background sweeper (interval: 10s)...');

  // Initial sweep on startup
  runSweep().catch(() => {});

  // Sweeps every 10 seconds
  intervalId = setInterval(() => {
    runSweep().catch(() => {});
  }, 10 * 1000);
}

/**
 * Stops the background sweeper (useful for tests and graceful shutdown).
 */
export function stopSweeper() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Sweeper] Stopped background sweeper');
  }
}

