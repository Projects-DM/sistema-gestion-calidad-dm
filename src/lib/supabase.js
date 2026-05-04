import { createClient } from '@supabase/supabase-js';

let cached;

/**
 * Cliente singleton de Supabase.
 * Requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env (Vite).
 */
export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  if (!cached) {
    cached = createClient(url, anonKey);
  }
  return cached;
}

export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
