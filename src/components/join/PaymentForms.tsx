"use client";

import { useActionState } from "react";
import { confirmTestPaymentAction, startPaymentAction } from "@/lib/actions/payments";
import type { ActionState } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function StartPaymentForm({ label }: { label: string }) {
  const [state, action] = useActionState<ActionState, FormData>(startPaymentAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <SubmitButton pendingLabel="Opening secure checkout…">{label}</SubmitButton>
    </form>
  );
}

export function TestPaymentForm({ reference }: { reference: string }) {
  const [state, action] = useActionState<ActionState, FormData>(confirmTestPaymentAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="reference" value={reference} />
      <FormMessage error={state?.error} />
      <SubmitButton pendingLabel="Recording…" className="btn btn-dark w-full">Record local test payment</SubmitButton>
    </form>
  );
}
