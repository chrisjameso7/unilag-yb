"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  signupAction,
  updatePasswordAction,
} from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormMessage } from "./Field";
import { SubmitButton } from "./SubmitButton";

function PasswordInput({ id, name, autoComplete, minLength }: { id: string; name: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength} className="input pr-16" />
      <button type="button" onClick={() => setVisible((v) => !v)} className="absolute inset-y-0 right-1 my-auto h-9 rounded-lg px-3 text-[0.78rem] text-charcoal/55 hover:text-navy">
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormMessage error={state?.error} success={state?.success} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[0.82rem] text-charcoal/60 hover:text-navy">Forgot password?</Link>
      </div>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-[0.85rem] text-charcoal/60">
        New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="link">Create an account</Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(signupAction, null);
  if (state?.success) return <FormMessage success={state.success} />;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormMessage error={state?.error} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email} hint="Use an address you'll still have years from now.">
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password} hint="At least 10 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={10} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={state?.fieldErrors?.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={10} />
      </Field>
      <SubmitButton pendingLabel="Creating account…">Create my account</SubmitButton>
      <p className="text-center text-[0.85rem] text-charcoal/60">
        Already joined? <Link href={`/login?next=${encodeURIComponent(next)}`} className="link">Sign in</Link>
      </p>
      <p className="text-center text-[0.75rem] leading-relaxed text-charcoal/45">
        By creating an account you agree to the <Link href="/terms" className="underline">terms</Link> and{" "}
        <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(forgotPasswordAction, null);
  if (state?.success) return <FormMessage success={state.success} />;
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state?.error} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" />
      </Field>
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(updatePasswordAction, null);
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state?.error} />
      <Field label="New password" htmlFor="password" error={state?.fieldErrors?.password} hint="At least 10 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={10} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={state?.fieldErrors?.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={10} />
      </Field>
      <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
