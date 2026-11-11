import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/** Uptime check: 200 when the app can reach the database, 503 otherwise. Reveals nothing private. */
export async function GET() {
  const started = Date.now();
  const { error } = await publicClient().from("faculties").select("id", { head: true, count: "exact" });
  const body = { ok: !error, database: error ? "unreachable" : "ok", ms: Date.now() - started };
  return NextResponse.json(body, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
