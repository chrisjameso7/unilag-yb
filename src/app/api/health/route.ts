import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase/public";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Uptime check. 200 when both the public key and the server's secret key can
 * reach the database; 503 otherwise. Reveals nothing private.
 */
export async function GET() {
  const started = Date.now();
  const pub = await publicClient().from("faculties").select("id", { head: true, count: "exact" });
  let admin: "ok" | "rejected" | "missing" = "ok";
  try {
    const { error } = await adminClient().from("rate_limits").select("key", { head: true, count: "exact" });
    if (error) admin = "rejected";
  } catch {
    admin = "missing";
  }
  const ok = !pub.error && admin === "ok";
  return NextResponse.json(
    { ok, database: pub.error ? "unreachable" : "ok", serverKey: admin, ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
