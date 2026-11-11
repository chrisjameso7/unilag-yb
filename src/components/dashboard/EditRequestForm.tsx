"use client";

import { useActionState } from "react";
import { requestProfileChangeAction } from "@/lib/actions/profile";
import type { ActionState } from "@/lib/actions/types";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function EditRequestForm() {
  const [state, action] = useActionState<ActionState, FormData>(requestProfileChangeAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} success={state?.success} />
      <Field label="What do you need?" htmlFor="requestType">
        <select id="requestType" name="requestType" className="input">
          <option value="correction">A correction the form can&apos;t make</option>
          <option value="deactivation">Hide my page</option>
          <option value="removal">Remove my page and data</option>
          <option value="data_export">Send me a copy of my data</option>
        </select>
      </Field>
      <Field label="Details" htmlFor="message" error={state?.fieldErrors?.message}>
        <textarea id="message" name="message" required minLength={10} maxLength={600} rows={4} className="input" />
      </Field>
      <SubmitButton pendingLabel="Sending…" className="btn btn-dark w-full">Send request</SubmitButton>
    </form>
  );
}
