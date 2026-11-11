"use client";

/* eslint-disable @next/next/no-img-element -- local blob preview of the chosen file */
import { useActionState, useEffect, useState } from "react";
import { saveProfileAction } from "@/lib/actions/profile";
import type { ActionState } from "@/lib/actions/types";
import type { OwnProfile } from "@/lib/queries";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";

type Faculty = { id: number; name: string; departments: Array<{ id: number; name: string }> };

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 8 - 1962 + 1 }, (_, i) => THIS_YEAR + 8 - i);

export function ProfileForm({
  faculties,
  profile,
  defaultName,
  returnTo = "/join/preview",
  submitLabel = "Save and preview",
}: {
  faculties: Faculty[];
  profile: OwnProfile | null;
  defaultName?: string;
  returnTo?: string;
  submitLabel?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfileAction, null);
  const [facultyId, setFacultyId] = useState<number>(profile?.facultyId ?? 0);
  const [bio, setBio] = useState(profile?.biography ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const departments = faculties.find((f) => f.id === facultyId)?.departments ?? [];
  const errors = state?.fieldErrors ?? {};

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="facesOptInPresent" value="1" />
      <FormMessage error={state?.error} />

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-[5.6rem] shrink-0 overflow-hidden rounded-2xl bg-navy/10">
          {preview || profile?.portraitPath ? (
            <img src={preview ?? profile?.portraitPath ?? ""} alt="Your portrait" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-[0.7rem] text-charcoal/45">No portrait yet</span>
          )}
        </div>
        <Field
          label={profile?.portraitPath ? "Replace portrait" : "Portrait"}
          htmlFor="portrait"
          error={errors.portrait}
          hint={<>JPG, PNG or WebP up to 5MB, vertical. <a href="/portrait-guide" target="_blank" className="link">Tips</a></>}
        >
          <input
            id="portrait"
            name="portrait"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!profile?.portraitPath}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="input py-2.5 text-[0.85rem]"
          />
        </Field>
      </div>

      <Field label="Full name" htmlFor="fullName" error={errors.fullName} hint="As you'd like it to appear for good.">
        <input id="fullName" name="fullName" required maxLength={80} autoComplete="name" defaultValue={profile?.fullName ?? defaultName} className="input" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Faculty" htmlFor="facultyId" error={errors.facultyId}>
          <select id="facultyId" name="facultyId" required value={facultyId || ""} onChange={(e) => setFacultyId(Number(e.target.value))} className="input">
            <option value="" disabled>Choose a faculty</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Department" htmlFor="departmentId" error={errors.departmentId}>
          <select
            id="departmentId"
            name="departmentId"
            required
            key={facultyId}
            defaultValue={profile && profile.facultyId === facultyId ? profile.departmentId : ""}
            disabled={!facultyId}
            className="input"
          >
            <option value="" disabled>{facultyId ? "Choose a department" : "Choose a faculty first"}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Field label="Admission year" htmlFor="admissionYear" error={errors.admissionYear}>
          <select id="admissionYear" name="admissionYear" required defaultValue={profile?.admissionYear ?? ""} className="input">
            <option value="" disabled>Year</option>
            {YEARS.filter((y) => y <= THIS_YEAR).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Graduation year" htmlFor="graduationYear" error={errors.graduationYear} hint="Expected is fine.">
          <select id="graduationYear" name="graduationYear" required defaultValue={profile?.graduationYear ?? ""} className="input">
            <option value="" disabled>Year</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-[0.82rem] font-medium text-navy">Status</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["in_progress", "Still studying"],
            ["graduated", "Graduated"],
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-navy/15 bg-paper px-3 text-[0.9rem] has-[:checked]:border-green has-[:checked]:bg-green/[0.05]">
              <input type="radio" name="graduationStatus" value={value} defaultChecked={(profile?.graduationStatus ?? "in_progress") === value} className="accent-green" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="A line about you"
        htmlFor="biography"
        error={errors.biography}
        hint={<span className={bio.length > 250 ? "text-danger" : ""}>{bio.length}/250 · Be yourself. “Came to study computer engineering. Somehow I&apos;m now an expert at finding food at 2am.”</span>}
      >
        <textarea id="biography" name="biography" required minLength={20} maxLength={250} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className="input" />
      </Field>

      <div className="space-y-3 rounded-2xl border border-navy/10 bg-paper p-4">
        <label className="flex items-start gap-3 text-[0.88rem] leading-relaxed text-charcoal/75">
          <input type="checkbox" name="consent" required defaultChecked={profile?.consentPublic} className="mt-1 h-5 w-5 shrink-0 accent-green" />
          <span>
            I&apos;m a UNILAG student and agree to publish my name, portrait, faculty, department, years and line about me in the yearbook. I can hide my page or ask for removal any time.
          </span>
        </label>
        {errors.consent && <p className="text-[0.78rem] text-danger">{errors.consent}</p>}
        <label className="flex items-start gap-3 border-t border-navy/10 pt-3 text-[0.88rem] leading-relaxed text-charcoal/75">
          <input type="checkbox" name="facesOptIn" defaultChecked={profile?.facesOptIn} className="mt-1 h-5 w-5 shrink-0 accent-green" />
          <span>
            <strong className="font-medium text-navy">I&apos;d like to be considered for Faces of the Year.</strong> Optional — not needed for your page. Nothing editorial is published without your approval.
          </span>
        </label>
      </div>

      <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      <p className="text-center text-[0.75rem] text-charcoal/45">Saving doesn&apos;t publish anything.</p>
    </form>
  );
}
