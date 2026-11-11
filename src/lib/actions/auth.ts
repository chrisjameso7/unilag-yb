"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { adminClient } from "../supabase/admin";
import { consumeRateLimit } from "../rate-limit";
import { requestOrigin } from "../site";
import {
  fieldErrorsFrom,
  firstError,
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  signupSchema,
} from "../validation";
import type { ActionState } from "./types";
import { safeInternalPath } from "./types";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

/**
 * Create an account with Supabase Auth. Signing up does NOT verify anyone as a
 * student — verification is a separate, explicit step at /join/verify.
 */
export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limit = await consumeRateLimit(`signup:${ip}`, 6, 3600);
  if (!limit.allowed) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const next = safeInternalPath(formData.get("next"), "/join/verify");
  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { error: error.message, fieldErrors: { password: error.message } };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: "Too many sign-up emails were sent recently. Try again in a few minutes." };
    }
    console.error("[auth] signUp failed", error.code, error.message);
    return { error: "We could not create your account. Try again shortly." };
  }

  // With email confirmation on (recommended), there is no session yet. Supabase
  // also returns no session for an address that is already registered, so the
  // message is deliberately the same in both cases (no account enumeration).
  if (!data.session) {
    return {
      success: `Check ${parsed.data.email} for a confirmation link. Open it on this device to continue.`,
    };
  }

  redirect(next);
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const ip = await clientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    consumeRateLimit(`login-ip:${ip}`, 20, 900),
    consumeRateLimit(`login:${parsed.data.email}`, 8, 900),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return { error: "Too many sign-in attempts. Wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { error: "Confirm your email address first — check your inbox for the link." };
    }
    return { error: "Email or password is incorrect." };
  }

  const { data: account } = await adminClient()
    .from("users")
    .select("account_status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (account && account.account_status !== "active") {
    await supabase.auth.signOut();
    return { error: "This account is suspended. Contact the yearbook team if you think this is a mistake." };
  }

  const requested = safeInternalPath(formData.get("next"), "");
  if (requested) redirect(requested);

  const { data: adminRow } = await adminClient()
    .from("admin_users")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  redirect(adminRow ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Send a password-reset email. The response never reveals whether an account exists. */
export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const ip = await clientIp();
  const limit = await consumeRateLimit(`reset:${ip}`, 5, 3600);
  if (!limit.allowed) return { error: "Too many reset requests. Try again later." };

  const origin = await requestOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });
  return {
    success: `If an account exists for ${parsed.data.email}, a reset link is on its way. It expires in an hour.`,
  };
}

/** Set a new password. Requires the short-lived session created by the reset link. */
export async function updatePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.code === "same_password" ? "Choose a different password from your current one." : "Could not update your password. Try again." };
  }
  redirect("/dashboard?password=updated");
}
