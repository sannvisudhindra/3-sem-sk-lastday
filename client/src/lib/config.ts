export const APP_NAME = 'Encore'

const env = import.meta.env

export const API_URL: string = env.VITE_API_URL ?? 'http://localhost:8080'
export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? ''
export const USE_MOCKS: boolean = env.VITE_USE_MOCKS === 'true'
export const MOCK_ROLE: 'customer' | 'organiser' =
  env.VITE_MOCK_ROLE === 'organiser' ? 'organiser' : 'customer'
