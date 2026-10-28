import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Calls a Supabase RPC function with the service-role client,
 * handling Postgres exceptions and mapping them to standard AppErrors.
 */
export async function callRpc(fnName, args = {}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(fnName, args);

  if (error) {
    // Check for Postgres exclusion constraint violation (23P01)
    if (error.code === '23P01') {
      const msg = error.message || '';
      if (msg.includes('venue') || error.details?.includes('venue')) {
        throw new AppError('VENUE_CLASH', 'The venue is already booked for this time window.', {
          constraint: 'exclusion_venue_time',
        });
      }
      throw new AppError('EVENT_CLASH', 'Event schedule conflicts with an existing event.', {
        constraint: 'exclusion_event_time',
      });
    }

    // Check for raised exceptions like 'SEAT_TAKEN' or 'SEAT_TAKEN:{"seatIds":["..."]}'
    const rawMsg = error.message || '';
    if (rawMsg.includes(':')) {
      const colonIdx = rawMsg.indexOf(':');
      const code = rawMsg.slice(0, colonIdx).trim();
      const rest = rawMsg.slice(colonIdx + 1).trim();
      let details;
      try {
        details = JSON.parse(rest);
      } catch {
        details = { info: rest };
      }
      throw new AppError(code, details.message || code, details);
    }

    // Direct error code string (e.g. 'SEAT_TAKEN', 'SOLD_OUT', 'LIMIT_EXCEEDED')
    if (/^[A-Z_]+$/.test(rawMsg.trim())) {
      throw new AppError(rawMsg.trim(), rawMsg.trim());
    }

    throw new AppError('INTERNAL_ERROR', error.message || 'Database error occurred', error);
  }

  // Handle functions that return { ok: false, code: '...' }
  if (data && typeof data === 'object' && data.ok === false) {
    throw new AppError(data.code, data.message || data.code, data);
  }

  return data;
}
