import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/site/AuthCard";
import { LoginForm } from "@/components/forms/AuthForms";
import { Notice } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { safeInternalPath } from "@/lib/actions/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const NOTICES: Record<string, { tone: "info" | "error" | "success"; text: string }> = {
  "account-suspended": { tone: "error", text: "This account is suspended. Contact the yearbook team if you think this is a mistake." },
  "confirm-failed": { tone: "error", text: "That link is invalid or has expired. Sign in, or request a new link." },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeInternalPath(typeof sp.next === "string" ? sp.next : "", "");
  const user = await getCurrentUser();
  if (user) redirect(next || (user.adminRole ? "/admin" : "/dashboard"));
  const notice = typeof sp.error === "string" ? NOTICES[sp.error] : undefined;

  return (
    <AuthCard eyebrow="Welcome back" title="Sign in" intro="Pick up where you left off — your page, verification and payment status are waiting.">
      {notice && <div className="mb-5"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      <LoginForm next={next} />
    </AuthCard>
  );
}
