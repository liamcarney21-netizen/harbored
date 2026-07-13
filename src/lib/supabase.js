import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Auth will not work until these are set in .env.local (dev) and Vercel project env vars (prod).'
  );
}

// Falls back to a placeholder so createClient doesn't throw on an invalid URL
// and take down the whole app before real credentials are configured.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
