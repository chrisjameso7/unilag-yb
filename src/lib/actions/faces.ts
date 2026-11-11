"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "../auth";
import { adminClient } from "../supabase/admin";
import { getProfileForUser } from "../queries";
import { getOpenEdition } from "../faces";
import { getContent } from "../content";
import { notifyFacesSelected } from "../email";
import { logAudit } from "../profile-service";
import { publishEditorialPortrait, removeUpload, saveUpload } from "../uploads";
import { consumeRateLimit } from "../rate-limit";
import {
  facesEditionSchema,
  facesSubmissionSchema,
  fieldErrorsFrom,
  firstError,
} from "../validation";
import type { ActionState } from "./types";

const enc = encodeURIComponent;

function refreshFaces(year?: number | null) {
  revalidatePath("/faces-of-the-year");
  if (year) revalidatePath(`/faces-of-the-year/${year}`);
  revalidatePath("/faces-of-the-year/submit");
  revalidatePath("/admin/faces");
  if (year) revalidatePath(`/admin/faces/${year}`);
}

/* =============================================================== student */

/**
 * Submit for editorial consideration. Entirely optional — never required for an
 * ordinary yearbook entry. Requires a verified student with a yearbook profile;
 * no payment is needed to be considered, and selection is never paid for.
 */
export async function submitFacesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/faces-of-the-year/submit");
  const profile = await getProfileForUser(user.id);
  if (!profile) return { error: "Create your yearbook profile first." };
  if (profile.verificationStatus !== "verified") {
    return { error: "Only verified UNILAG students can submit. Finish verification first." };
  }
  if (profile.publicationStatus === "suspended" || profile.publicationStatus === "removed") {
    return { error: "This profile is on hold. Contact the yearbook team." };
  }

  const edition = await getOpenEdition();
  if (!edition) return { error: "Submissions are not open right now." };

  const parsed = facesSubmissionSchema.safeParse({
    personalIntroduction: formData.get("personalIntroduction"),
    quote: formData.get("quote") || undefined,
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const db = adminClient();
  const { data: existing } = await db
    .from("editorial_submissions")
    .select("id")
    .eq("student_profile_id", profile.id)
    .eq("edition_id", edition.id)
    .not("submission_status", "in", "(withdrawn,declined)")
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: `You already have a submission for ${edition.title}.` };
  }

  const limit = await consumeRateLimit(`faces-submit:${user.id}`, 6, 3600);
  if (!limit.allowed) return { error: "Too many uploads. Try again later." };

  const file = formData.get("portrait");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Attach a portrait.", fieldErrors: { portrait: "A portrait is required." } };
  }
  const saved = await saveUpload(file, "editorial-submission", user.id);
  if (!saved.ok) return { error: saved.error, fieldErrors: { portrait: saved.error } };

  const consentVersion = await getContent("faces.consent_version", "faces-consent-v1");
  const { error } = await db.from("editorial_submissions").insert({
    student_profile_id: profile.id,
    edition_id: edition.id,
    image_path: saved.key,
    personal_introduction: parsed.data.personalIntroduction,
    quote: parsed.data.quote || null,
    consent_reference: consentVersion,
  });
  if (error) {
    await removeUpload("editorial-submission", saved.key);
    return { error: "Your submission could not be saved. Try again." };
  }

  await db.from("student_profiles").update({ faces_opt_in: true }).eq("id", profile.id);
  refreshFaces(edition.year);
  return { success: "Submitted. The editors will review every submission before the edition is chosen." };
}

async function ownSubmission(userId: string, submissionId: string) {
  const profile = await getProfileForUser(userId);
  if (!profile) return null;
  const { data } = await adminClient()
    .from("editorial_submissions")
    .select("id, image_path, submission_status, edition_id, edition:faces_editions ( year )")
    .eq("id", submissionId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();
  if (!data) return null;
  return {
    profile,
    submission: data,
    year: (data.edition as unknown as { year: number } | null)?.year ?? null,
  };
}

/** Upload a new portrait after the editors asked for a replacement. */
export async function replaceFacesPortraitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/faces-of-the-year/submit");
  const found = await ownSubmission(user.id, String(formData.get("submissionId") ?? ""));
  if (!found) return { error: "Submission not found." };
  if (found.submission.submission_status !== "replacement_requested") {
    return { error: "The editors have not asked for a new portrait." };
  }

  const limit = await consumeRateLimit(`faces-submit:${user.id}`, 6, 3600);
  if (!limit.allowed) return { error: "Too many uploads. Try again later." };

  const file = formData.get("portrait");
  if (!(file instanceof File) || file.size === 0) return { error: "Attach a portrait." };
  const saved = await saveUpload(file, "editorial-submission", user.id);
  if (!saved.ok) return { error: saved.error };

  const { error } = await adminClient()
    .from("editorial_submissions")
    .update({ image_path: saved.key, submission_status: "submitted", review_notes: null })
    .eq("id", found.submission.id);
  if (error) {
    await removeUpload("editorial-submission", saved.key);
    return { error: "Could not save the new portrait." };
  }
  await removeUpload("editorial-submission", found.submission.image_path as string);
  refreshFaces(found.year);
  return { success: "New portrait sent to the editors." };
}

/** Withdraw a submission (and any unpublished or published entry made from it). */
export async function withdrawFacesSubmissionAction(formData: FormData) {
  const user = await requireUser("/faces-of-the-year/submit");
  const found = await ownSubmission(user.id, String(formData.get("submissionId") ?? ""));
  if (!found) redirect("/faces-of-the-year/submit");

  const db = adminClient();
  await db
    .from("editorial_submissions")
    .update({ submission_status: "withdrawn" })
    .eq("id", found.submission.id);
  await db
    .from("faces_entries")
    .update({ consent_status: "withdrawn", publication_status: "draft", consent_recorded_at: new Date().toISOString() })
    .eq("submission_id", found.submission.id);
  await removeUpload("editorial-submission", found.submission.image_path as string);
  await logAudit(user.id, "faces.submission_withdrawn", "editorial_submission", found.submission.id);
  refreshFaces(found.year);
  redirect("/faces-of-the-year/submit?withdrawn=1");
}

/** The student approves (or declines) the final portrait and copy chosen by the editors. */
export async function decideFacesEntryAction(formData: FormData) {
  const user = await requireUser("/faces-of-the-year/submit");
  const entryId = String(formData.get("entryId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "grant" && decision !== "withdraw") redirect("/faces-of-the-year/submit");

  const profile = await getProfileForUser(user.id);
  if (!profile) redirect("/faces-of-the-year/submit");

  const db = adminClient();
  const { data: entry } = await db
    .from("faces_entries")
    .select("id, edition:faces_editions ( year )")
    .eq("id", entryId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();
  if (!entry) redirect("/faces-of-the-year/submit");

  await db
    .from("faces_entries")
    .update({
      consent_status: decision === "grant" ? "granted" : "withdrawn",
      consent_recorded_at: new Date().toISOString(),
      ...(decision === "withdraw" ? { publication_status: "draft" } : {}),
    })
    .eq("id", entryId);
  await logAudit(
    user.id,
    decision === "grant" ? "faces.consent_granted" : "faces.consent_withdrawn",
    "faces_entry",
    entryId,
    "Recorded by the student.",
  );
  refreshFaces((entry.edition as unknown as { year: number } | null)?.year);
  redirect("/faces-of-the-year/submit");
}

/* ============================================================= editorial */

export async function createEditionAction(formData: FormData) {
  const admin = await requireAdmin("/admin/faces", "faces");
  const parsed = facesEditionSchema.safeParse({
    year: formData.get("year"),
    title: formData.get("title"),
    introduction: formData.get("introduction") ?? "",
  });
  if (!parsed.success) redirect(`/admin/faces?error=${enc(firstError(parsed.error))}`);

  const { error } = await adminClient().from("faces_editions").insert({
    year: parsed.data.year,
    title: parsed.data.title,
    introduction: parsed.data.introduction,
  });
  if (error) {
    redirect(`/admin/faces?error=${enc(error.code === "23505" ? "That year already has an edition." : error.message)}`);
  }
  await logAudit(admin.id, "faces.edition_created", "faces_edition", String(parsed.data.year));
  refreshFaces(parsed.data.year);
  redirect(`/admin/faces/${parsed.data.year}`);
}

export async function updateEditionAction(formData: FormData) {
  const admin = await requireAdmin("/admin/faces", "faces");
  const year = Number(formData.get("year"));
  const title = String(formData.get("title") ?? "").trim();
  const introduction = String(formData.get("introduction") ?? "").trim();
  const submissionsOpen = formData.get("submissionsOpen") === "on";
  if (!Number.isInteger(year) || title.length < 3 || title.length > 120 || introduction.length > 4000) {
    redirect(`/admin/faces/${year}?error=Check%20the%20title%20and%20introduction.`);
  }

  const db = adminClient();
  if (submissionsOpen) {
    // One edition takes submissions at a time.
    await db.from("faces_editions").update({ submissions_open: false }).neq("year", year);
  }

  let coverKey: string | undefined;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveUpload(cover, "portrait", admin.id);
    if (!saved.ok) redirect(`/admin/faces/${year}?error=${enc(saved.error)}`);
    coverKey = saved.key;
  }

  await db
    .from("faces_editions")
    .update({
      title,
      introduction,
      submissions_open: submissionsOpen,
      ...(coverKey ? { cover_image: coverKey } : {}),
    })
    .eq("year", year);
  await logAudit(admin.id, "faces.edition_updated", "faces_edition", String(year));
  refreshFaces(year);
  redirect(`/admin/faces/${year}?done=1`);
}

export async function setEditionStatusAction(formData: FormData) {
  const admin = await requireAdmin("/admin/faces", "faces");
  const year = Number(formData.get("year"));
  const status = String(formData.get("status") ?? "");
  if (!["draft", "published", "archived"].includes(status)) redirect(`/admin/faces/${year}`);

  await adminClient()
    .from("faces_editions")
    .update({
      publication_status: status,
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
      ...(status !== "draft" ? { submissions_open: false } : {}),
    })
    .eq("year", year);
  await logAudit(admin.id, `faces.edition_${status}`, "faces_edition", String(year));
  refreshFaces(year);
  redirect(`/admin/faces/${year}?done=1`);
}

export async function reviewSubmissionAction(formData: FormData) {
  const admin = await requireAdmin("/admin/faces", "faces");
  const year = Number(formData.get("year"));
  const id = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  const map: Record<string, string> = {
    shortlist: "shortlisted",
    replace: "replacement_requested",
    decline: "declined",
    reopen: "submitted",
  };
  const status = map[decision];
  if (!status) redirect(`/admin/faces/${year}`);
  if (decision === "replace" && !notes) {
    redirect(`/admin/faces/${year}?error=Tell%20the%20student%20what%20to%20change.`);
  }

  await adminClient()
    .from("editorial_submissions")
    .update({ submission_status: status, review_notes: notes || null })
    .eq("id", id)
    .neq("submission_status", "withdrawn");
  await logAudit(admin.id, `faces.submission_${status}`, "editorial_submission", id, notes || null);
  refreshFaces(year);
  redirect(`/admin/faces/${year}#submissions`);
}

/**
 * Select a submission for the edition. The portrait is copied into the public
 * bucket and a DRAFT entry is created with consent pending — nothing is public
 * until the student approves the final portrait and copy and an editor publishes.
 */
export async function selectSubmissionAction(formData: FormData) {
  const admin = await requireAdmin("/admin/faces", "faces");
  const year = Number(formData.get("year"));
  const id = String(formData.get("submissionId") ?? "");

  const db = adminClient();
  const { data: submission } = await db
    .from("editorial_submissions")
    .select("id, student_profile_id, edition_id, image_path, personal_introduction, quote, submission_status")
    .eq("id", id)
    .maybeSingle();
  if (!submission || !submission.edition_id) redirect(`/admin/faces/${year}?error=Submission%20not%20found.`);
  if (submission.submission_status === "withdrawn") {
    redirect(`/admin/faces/${year}?error=The%20student%20withdrew%20this%20submission.`);
  }

  const copied = await publishEditorialPortrait(submission.image_path as string);
  if (!copied.ok) redirect(`/admin/faces/${year}?error=${enc(copied.error)}`);

  const { count } = await db
    .from("faces_entries")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", submission.edition_id);

  const { error } = await db.from("faces_entries").upsert(
    {
      edition_id: submission.edition_id,
      student_profile_id: submission.student_profile_id,
      submission_id: submission.id,
      portrait_image: copied.key,
      editorial_introduction: submission.personal_introduction,
      quote: submission.quote,
      display_order: (count ?? 0) + 1,
      consent_status: "pending",
      publication_status: "draft",
    },
    { onConflict: "edition_id,student_profile_id" },
  );
  if (error) {
    await removeUpload("portrait", copied.key);
    redirect(`/admin/faces/${year}?error=${enc(error.message)}`);
  }

  await db.from("editorial_submissions").update({ submission_status: "selected" }).eq("id", id);
  const { data: edition } = await db.from("faces_editions").select("title").eq("id", submission.edition_id).maybeSingle();
  await notifyFacesSelected(submission.student_profile_id as string, (edition?.title as string | undefined) ?? "Faces of the Year");
  await logAudit(admin.id, "faces.submission_selected", "editorial_submission", id);
  refreshFaces(year);
  redirect(`/admin/faces/${year}#entries`);
}

export async function updateEntryAction(formData: FormData) {
  const admin = await requireAdmin("/admin/faces", "faces");
  const year = Number(formData.get("year"));
  const id = String(formData.get("entryId") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const db = adminClient();

  const { data: entry } = await db
    .from("faces_entries")
    .select("id, consent_status, editorial_introduction, quote, profile:student_profiles ( publication_status )")
    .eq("id", id)
    .maybeSingle();
  if (!entry) redirect(`/admin/faces/${year}?error=Entry%20not%20found.`);

  if (intent === "save") {
    const intro = String(formData.get("editorialIntroduction") ?? "").trim().slice(0, 600);
    const quote = String(formData.get("quote") ?? "").trim().slice(0, 160);
    const order = Number.parseInt(String(formData.get("displayOrder") ?? "0"), 10) || 0;
    const copyChanged = intro !== entry.editorial_introduction || (quote || null) !== entry.quote;
    await db
      .from("faces_entries")
      .update({
        editorial_introduction: intro,
        quote: quote || null,
        display_order: order,
        // Changing the words the student approved sends them back for approval.
        ...(copyChanged && entry.consent_status === "granted"
          ? { consent_status: "pending", publication_status: "draft" }
          : {}),
      })
      .eq("id", id);
    await logAudit(admin.id, "faces.entry_updated", "faces_entry", id, copyChanged ? "Copy changed; consent re-requested." : null);
  } else if (intent === "publish") {
    const profile = entry.profile as unknown as { publication_status: string } | null;
    if (entry.consent_status !== "granted") {
      redirect(`/admin/faces/${year}?error=The%20student%20has%20not%20approved%20this%20entry%20yet.`);
    }
    if (profile?.publication_status !== "published") {
      redirect(`/admin/faces/${year}?error=The%20student%27s%20yearbook%20page%20is%20not%20published%2C%20so%20the%20feature%20cannot%20link%20to%20it.`);
    }
    await db.from("faces_entries").update({ publication_status: "published" }).eq("id", id);
    await logAudit(admin.id, "faces.entry_published", "faces_entry", id);
  } else if (intent === "unpublish") {
    await db.from("faces_entries").update({ publication_status: "draft" }).eq("id", id);
    await logAudit(admin.id, "faces.entry_unpublished", "faces_entry", id);
  } else if (intent === "record-consent") {
    // Consent obtained outside the site (e.g. a signed release at a portrait session).
    const reference = String(formData.get("consentNote") ?? "").trim().slice(0, 200);
    if (!reference) redirect(`/admin/faces/${year}?error=Describe%20how%20consent%20was%20obtained.`);
    await db
      .from("faces_entries")
      .update({ consent_status: "granted", consent_recorded_at: new Date().toISOString() })
      .eq("id", id);
    await logAudit(admin.id, "faces.consent_recorded", "faces_entry", id, reference);
  } else if (intent === "remove") {
    const { data: removed } = await db.from("faces_entries").delete().eq("id", id).select("submission_id");
    const submissionId = removed?.[0]?.submission_id as string | undefined;
    if (submissionId) {
      await db
        .from("editorial_submissions")
        .update({ submission_status: "shortlisted" })
        .eq("id", submissionId)
        .eq("submission_status", "selected");
    }
    await logAudit(admin.id, "faces.entry_removed", "faces_entry", id);
  }

  refreshFaces(year);
  redirect(`/admin/faces/${year}#entries`);
}
