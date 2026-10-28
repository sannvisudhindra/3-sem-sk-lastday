export const APP_NAME = 'Encore'

const env = import.meta.env

export const API_URL: string = env.VITE_API_URL ?? 'http://localhost:8080'
export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? ''
export const USE_MOCKS: boolean = env.VITE_USE_MOCKS === 'true'
/** Fake signed-in role in mock mode; 'none' starts signed out (to test the login page). */
export const MOCK_ROLE: 'customer' | 'organiser' | null =
  env.VITE_MOCK_ROLE === 'none' ? null : env.VITE_MOCK_ROLE === 'organiser' ? 'organiser' : 'customer'
