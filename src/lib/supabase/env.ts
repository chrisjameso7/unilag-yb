/**
 * Supabase configuration. The URL and anon key are public by design (RLS and
 * column grants protect the data). The service-role key is server-only and must
 * never be prefixed with NEXT_PUBLIC_.
 */
export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. See .env.example.");
  return url.replace(/\/$/, "");
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. See .env.example.");
  return key;
}
