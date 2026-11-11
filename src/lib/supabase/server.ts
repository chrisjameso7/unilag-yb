import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Request-scoped client that carries the signed-in user's session (from cookies).
 * Use it for Supabase Auth calls. Data access goes through `publicClient()` for
 * public reads and `adminClient()` for checked server-side reads/writes.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy
          // (src/proxy.ts) refreshes the session on every request, so this is safe.
        }
      },
    },
  });
}
