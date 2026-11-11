import "server-only";
import { adminClient } from "./supabase/admin";

/**
 * Fixed-window limiter backed by Postgres (public.consume_rate_limit), so it is
 * shared by every server instance. If the database call itself fails we allow
 * the request and log: an outage should not lock every student out.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const { data, error } = await adminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || !data) {
    console.error("[rate-limit] check failed; allowing request", error?.message);
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; remaining: number; retry_after: number }
    | undefined;
  return {
    allowed: row?.allowed ?? true,
    remaining: row?.remaining ?? limit,
    retryAfter: row?.retry_after ?? 0,
  };
}
