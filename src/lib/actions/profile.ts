"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { adminClient } from "../supabase/admin";
import { getProfileForUser } from "../queries";
import { saveProfile } from "../profile-service";
import { publishProfile } from "../publish";
import { removeUpload, saveUpload } from "../uploads";
import { consumeRateLimit } from "../rate-limit";
import { profileSchema, fieldErrorsFrom, firstError, profileEditRequestSchema } from "../validation";
import type { ActionState } from "./types";
import { safeInternalPath } from "./types";

export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/join/profile");
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    facultyId: formData.get("facultyId"),
    departmentId: formData.get("departmentId"),
    admissionYear: formData.get("admissionYear"),
    graduationYear: formData.get("graduationYear"),
    biography: formData.get("biography"),
    graduationStatus: formData.get("graduationStatus") ?? "in_progress",
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  let portraitKey: string | null = null;
  const file = formData.get("portrait");
  if (file instanceof File && file.size > 0) {
    const limit = await consumeRateLimit(`upload:${user.id}`, 12, 3600);
    if (!limit.allowed) return { error: "Too many uploads. Try again later." };
    const saved = await saveUpload(file, "portrait", user.id);
    if (!saved.ok) return { error: saved.error, fieldErrors: { portrait: saved.error } };
    portraitKey = saved.key;
  }

  // The Faces checkbox is optional and never required to publish (plan §5, step 4).
  const facesField = formData.get("facesOptInPresent") ? formData.get("facesOptIn") === "on" : undefined;

  const result = await saveProfile(user.id, {
    fullName: parsed.data.fullName,
    facultyId: parsed.data.facultyId,
    departmentId: parsed.data.departmentId,
    admissionYear: parsed.data.admissionYear,
    graduationYear: parsed.data.graduationYear,
    biography: parsed.data.biography,
    graduationStatus: parsed.data.graduationStatus,
    consent: parsed.data.consent === "on",
    facesOptIn: facesField,
    portraitKey,
  });

  if (!result.ok) {
    await removeUpload("portrait", portraitKey);
    return {
      error: result.error,
      fieldErrors: result.field ? { [result.field]: result.error } : undefined,
    };
  }
  await removeUpload("portrait", result.previousPortraitKey);

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/student/${result.slug}`);

  const returnTo = safeInternalPath(formData.get("returnTo"), "/join/verify");
  redirect(returnTo);
}

export async function updateGraduationStatusAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  // Accepts explicit values, or the dashboard toggle ("on" = graduated, "" = still studying).
  const raw = formData.get("graduationStatus");
  const status = raw === "on" ? "graduated" : raw === "" ? "in_progress" : raw;
  if (status !== "in_progress" && status !== "graduated") return;

  await adminClient()
    .from("student_profiles")
    .update({ graduation_status: status })
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function setFacesOptInAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  const optIn = formData.get("facesOptIn") === "on";
  await adminClient().from("student_profiles").update({ faces_opt_in: optIn }).eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function setSearchIndexingAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  const allow = formData.get("searchIndexing") === "on";
  const profile = await getProfileForUser(user.id);
  await adminClient()
    .from("student_profiles")
    .update({ search_indexing: allow })
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  if (profile) revalidatePath(`/student/${profile.slug}`);
}

export async function requestProfileChangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/dashboard");
  const parsed = profileEditRequestSchema.safeParse({
    requestType: formData.get("requestType"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await consumeRateLimit(`profile-request:${user.id}`, 3, 3600);
  if (!limit.allowed) {
    return { error: "You have already sent several requests. Give the team time to respond." };
  }

  const { error } = await adminClient().from("profile_edit_requests").insert({
    user_id: user.id,
    request_type: parsed.data.requestType,
    message: parsed.data.message,
  });
  if (error) return { error: "Your request could not be sent. Try again." };

  revalidatePath("/dashboard");
  return { success: "Request sent. An administrator will review it." };
}

export async function setPublicationVisibilityAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  const intent = formData.get("intent");
  const profile = await getProfileForUser(user.id);
  if (!profile) return;

  if (intent === "show" && profile.publicationStatus !== "published") {
    await publishProfile(user.id);
  }

  if (intent === "hide" && profile.publicationStatus === "published") {
    const db = adminClient();
    await db
      .from("student_profiles")
      .update({ publication_status: "draft" })
      .eq("user_id", user.id)
      .eq("publication_status", "published");
    await db.from("profile_edit_requests").insert({
      user_id: user.id,
      request_type: "deactivation",
      message: "Student hid their published page from the dashboard.",
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/student/${profile.slug}`);
}
