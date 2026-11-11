import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/actions/types";

export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing route for Supabase Auth email links (sign-up confirmation, email change).
 *
 * Point the Supabase email templates at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next={{ .RedirectTo }}
 * PKCE `?code=` links are accepted too.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  // `next` may arrive as a path or, from {{ .RedirectTo }}, as a full URL on our origin.
  let nextRaw = url.searchParams.get("next") ?? "/join/verify";
  try {
    const parsed = new URL(nextRaw, url.origin);
    nextRaw = parsed.origin === url.origin ? parsed.pathname + parsed.search : "/join/verify";
  } catch {
    nextRaw = "/join/verify";
  }
  const next = safeInternalPath(nextRaw, "/join/verify");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const target = ok ? next : "/login?error=confirm-failed";
  return NextResponse.redirect(new URL(target, url.origin));
}
