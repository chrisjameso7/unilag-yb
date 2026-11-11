import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/site/AuthCard";
import { ResetPasswordForm } from "@/components/forms/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  // The reset email link signs the user in briefly (via /auth/confirm) so they can set a new password.
  if (!(await getCurrentUser())) redirect("/forgot-password");
  return (
    <AuthCard eyebrow="Account" title="Choose a new password">
      <ResetPasswordForm />
    </AuthCard>
  );
}
