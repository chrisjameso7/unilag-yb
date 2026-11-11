import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS, so it is only ever used on the server AFTER
 * the caller has been authenticated and authorised (requireUser / requireAdmin),
 * or by trusted server processes such as the signed Paystack webhook.
 */
export function adminClient(): SupabaseClient {
  if (cached) return cached;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. See .env.example.");
  cached = createSupabaseClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
