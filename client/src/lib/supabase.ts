import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

// Used for Auth and Realtime subscriptions only. The browser never writes to tables.
// Placeholder values keep the app booting in mock mode before .env is filled in.
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY || 'public-anon-key-placeholder',
)
