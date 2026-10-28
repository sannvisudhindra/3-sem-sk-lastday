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

