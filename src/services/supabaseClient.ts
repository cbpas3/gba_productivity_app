import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether Supabase has been configured in this environment.
 * When false the app runs fully offline — no network calls are made.
 */
export const isSupabaseConfigured =
  typeof supabaseUrl  === 'string' && supabaseUrl.startsWith('https://') &&
  typeof supabaseKey  === 'string' && supabaseKey.length > 0;

/**
 * Supabase client singleton.
 *
 * If the environment variables are missing the client is still created with
 * placeholder values so the rest of the app can import it unconditionally —
 * but all calls will fail gracefully (caught in syncService / authStore).
 * Check `isSupabaseConfigured` before showing any auth UI.
 */
export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseKey  ?? 'placeholder',
);
