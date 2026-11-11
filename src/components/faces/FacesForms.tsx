"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { replaceFacesPortraitAction, submitFacesAction } from "@/lib/actions/faces";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { ActionState } from "@/lib/actions/types";

export function FacesSubmissionForm({ editionTitle }: { editionTitle: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(submitFacesAction, null);
  const [introLength, setIntroLength] = useState(0);

  if (state?.success) {
    return <FormMessage success={state.success} />;
  }

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      <FormMessage error={state?.error} />

      <Field
        label="Your portrait"
        htmlFor="portrait"
        error={state?.fieldErrors?.portrait}
        hint="JPG, PNG or WebP up to 15MB. A phone photo in good daylight is perfect."
      >
        <input
          id="portrait"
          name="portrait"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="input file:mr-3 file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.1em] file:text-ivory"
        />
      </Field>
      <p className="-mt-3 text-[11px] text-charcoal/45">
        Not sure how to take it?{" "}
        <Link href="/portrait-guide" className="text-green underline underline-offset-4">
          Read the Portrait Studio guide
        </Link>
        .
      </p>

      <Field
        label="Introduce yourself to the editors"
        htmlFor="personalIntroduction"
        error={state?.fieldErrors?.personalIntroduction}
        hint={`${introLength}/400 · What was your UNILAG like? Who were you here? This is a starting point; editors may shorten it, and you approve the final words.`}
      >
        <textarea
          id="personalIntroduction"
          name="personalIntroduction"
          required
          minLength={40}
          maxLength={400}
          rows={5}
          onChange={(e) => setIntroLength(e.target.value.length)}
          className="input"
        />
      </Field>

      <Field label="A line you'd like quoted" htmlFor="quote" optional error={state?.fieldErrors?.quote}>
        <input id="quote" name="quote" maxLength={160} className="input" />
      </Field>

      <div className="border border-navy/15 bg-paper p-4">
        <label className="flex items-start gap-3 text-[12px] leading-relaxed text-charcoal/70">
          <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[#087B50]" />
          <span>
            I am the person in this photograph (or I have the photographer&apos;s permission to
            share it), and I agree that the UNILAG Yearbook editors may review it for{" "}
            {editionTitle}. Nothing is published unless I am selected <em>and</em> I approve the
            final portrait and words. I can withdraw at any time.
          </span>
        </label>
        {state?.fieldErrors?.consent && (
          <p className="mt-2 text-[11px] text-[#9b2c2c]" role="alert">
            {state.fieldErrors.consent}
          </p>
        )}
      </div>

      <SubmitButton pendingLabel="Uploading…" className="btn btn-primary">
        Submit for consideration
      </SubmitButton>
    </form>
  );
}

export function ReplacePortraitForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(replaceFacesPortraitAction, null);
  return (
    <form action={formAction} className="mt-4 space-y-3" encType="multipart/form-data">
      <FormMessage error={state?.error} success={state?.success} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <input
        name="portrait"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        aria-label="New portrait"
        className="input"
      />
      <SubmitButton pendingLabel="Uploading…" className="btn btn-dark !py-2 text-[11px]">
        Send new portrait
      </SubmitButton>
    </form>
  );
}
