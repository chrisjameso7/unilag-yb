import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/site/AuthCard";
import { SignupForm } from "@/components/forms/AuthForms";
import { getCurrentUser } from "@/lib/auth";
import { safeInternalPath } from "@/lib/actions/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeInternalPath(typeof sp.next === "string" ? sp.next : "", "/join/verify");
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthCard eyebrow="Join the Yearbook" title="Create your account" intro="Step one of five. Next, we'll confirm you're a UNILAG student.">
      <SignupForm next={next} />
    </AuthCard>
  );
}
