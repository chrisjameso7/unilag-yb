import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/site/AuthCard";
import { ForgotPasswordForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard eyebrow="Account" title="Forgot your password?" intro="Enter the email you joined with and we'll send a reset link.">
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-[0.85rem]"><Link href="/login" className="link">Back to sign in</Link></p>
    </AuthCard>
  );
}
