import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Anonymous, cookie-less client for the public archive. It sees exactly what any
 * visitor may see: RLS limits it to published rows and column grants hide every
 * private field.
 */
export function publicClient(): SupabaseClient {
  if (cached) return cached;
  cached = createSupabaseClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
