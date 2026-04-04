import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');

export const isMockMode = !isValidUrl;

let _supabase: SupabaseClient | null = null;
if (!isMockMode) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = _supabase as SupabaseClient;
