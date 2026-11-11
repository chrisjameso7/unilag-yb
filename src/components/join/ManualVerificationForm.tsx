"use client";

import { useActionState } from "react";
import { submitManualVerificationAction } from "@/lib/actions/verification";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function ManualVerificationForm({ defaultName }: { defaultName?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitManualVerificationAction, null);
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state?.error} success={state?.success} />
      <Field label="Name on your student ID" htmlFor="claimedName" error={state?.fieldErrors?.claimedName}>
        <input id="claimedName" name="claimedName" defaultValue={defaultName} required autoComplete="name" className="input" />
      </Field>
      <Field label="Matriculation number" htmlFor="matricNumber" error={state?.fieldErrors?.matricNumber} hint="Kept private. Never shown on your page.">
        <input id="matricNumber" name="matricNumber" required autoComplete="off" autoCapitalize="characters" className="input" />
      </Field>
      <Field
        label="Photo of your student ID"
        htmlFor="document"
        error={state?.fieldErrors?.document}
        hint="Photo or PDF, up to 8MB. Only reviewers see it, and it's deleted once they decide."
      >
        <input id="document" name="document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" required className="input py-2.5 text-[0.85rem]" />
      </Field>
      <Field label="Anything the reviewer should know?" htmlFor="note" optional error={state?.fieldErrors?.note}>
        <textarea id="note" name="note" maxLength={400} rows={3} className="input" />
      </Field>
      <SubmitButton pendingLabel="Uploading…">Send for review</SubmitButton>
      <p className="text-[0.75rem] leading-relaxed text-charcoal/45">
        We never ask for your university portal password. A matric number alone isn&apos;t proof, which is why we ask for the ID.
      </p>
    </form>
  );
}
