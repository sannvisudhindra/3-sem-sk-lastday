import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let supabaseAdmin = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      console.warn('[SupabaseAdmin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.');
    }
    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

/**
 * Fresh client for password sign-in. Signing in on the shared admin client would store the
 * user's session on it, and every later "admin" query would then run as that user instead of
 * with the service-role key.
 */
export function createAuthClient() {
  return createClient(config.supabase.url, config.supabase.anonKey || config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

