import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client for the internal admin dashboard. Uses the anon key;
// all access is gated by RLS (staff = has a row in public.profiles).
// Never reference the service-role key here — it must stay server-side.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// When env vars are absent (e.g. local dev without CMS), export a client built
// from empty strings; the admin UI checks `isSupabaseConfigured` and shows a
// setup notice instead of crashing.
export const supabase: SupabaseClient = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true },
});
