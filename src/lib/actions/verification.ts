"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { requireUser } from "../auth";
import { adminClient } from "../supabase/admin";
import { refreshProfileVerification } from "../profile-service";
import { createStudidVerification, studidStatus } from "../studid";
import { removeUpload, saveUpload } from "../uploads";
import { consumeRateLimit } from "../rate-limit";
import { requestOrigin } from "../site";
import { manualVerificationSchema, fieldErrorsFrom, firstError } from "../validation";
import type { ActionState } from "./types";

async function alreadyVerified(userId: string): Promise<boolean> {
  const { data } = await adminClient()
    .from("verification_records")
    .select("id")
    .eq("user_id", userId)
    .eq("verification_status", "verified")
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Start a Studid verification. A record is created only after Studid has
 * actually issued a verification id — nothing is recorded speculatively.
 */
export async function startStudidAction(): Promise<void> {
  const user = await requireUser("/join/verify");
  const status = studidStatus();
  if (!status.configured) {
    redirect(`/join/verify?error=${encodeURIComponent(status.reason)}`);
  }
  if (await alreadyVerified(user.id)) redirect("/join/verify");

  const limit = await consumeRateLimit(`studid:${user.id}`, 5, 3600);
  if (!limit.allowed) {
    redirect("/join/verify?error=Too%20many%20verification%20attempts.%20Try%20again%20later.");
  }

  const origin = await requestOrigin();
  const created = await createStudidVerification(`${origin}/join/verify/studid/return`);
  if (!created.ok) {
    redirect(`/join/verify?error=${encodeURIComponent(created.error)}`);
  }

  const db = adminClient();
  // Supersede any earlier unfinished Studid attempt.
  await db
    .from("verification_records")
    .update({ verification_status: "expired", provider_secret: null })
    .eq("user_id", user.id)
    .eq("provider", "studid")
    .eq("verification_status", "pending");

  const { error } = await db.from("verification_records").insert({
    user_id: user.id,
    provider: "studid",
    verification_reference: created.session.id,
    provider_secret: created.session.secretToken,
    verification_status: "pending",
  });
  if (error) {
    redirect("/join/verify?error=Could%20not%20start%20verification.%20Try%20again.");
  }

  await refreshProfileVerification(user.id);
  revalidatePath("/join/verify");
  redirect(created.session.link);
}

export async function submitManualVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/join/verify");

  if (await alreadyVerified(user.id)) {
    return { success: "Your student status is already verified." };
  }

  const limit = await consumeRateLimit(`manual-verify:${user.id}`, 4, 3600);
  if (!limit.allowed) {
    return { error: "Too many submissions. The review team will get to your last one shortly." };
  }

  const parsed = manualVerificationSchema.safeParse({
    claimedName: formData.get("claimedName"),
    matricNumber: formData.get("matricNumber"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error), fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Attach a photo or PDF of your student ID for review.",
      fieldErrors: { document: "A student ID document is required for manual review." },
    };
  }

  const saved = await saveUpload(file, "verification-document", user.id);
  if (!saved.ok) return { error: saved.error, fieldErrors: { document: saved.error } };

  const db = adminClient();
  // One open manual request at a time: a resubmission replaces the earlier pending one.
  const { data: previous } = await db
    .from("verification_records")
    .select("id, document_path")
    .eq("user_id", user.id)
    .eq("provider", "manual")
    .eq("verification_status", "pending");

  const { error } = await db.from("verification_records").insert({
    user_id: user.id,
    provider: "manual",
    verification_reference: `manual-${randomBytes(5).toString("hex")}`,
    verification_status: "pending",
    claimed_name: parsed.data.claimedName,
    matric_number: parsed.data.matricNumber,
    document_path: saved.key,
    review_notes: parsed.data.note ? `Student note: ${parsed.data.note}` : null,
  });
  if (error) {
    await removeUpload("verification-document", saved.key);
    return { error: "Your request could not be saved. Try again." };
  }

  for (const row of previous ?? []) {
    await db
      .from("verification_records")
      .update({ verification_status: "expired", review_notes: "Replaced by a newer submission." })
      .eq("id", row.id);
    await removeUpload("verification-document", row.document_path as string | null);
    await db.from("verification_records").update({ document_path: null }).eq("id", row.id);
  }

  await refreshProfileVerification(user.id);
  revalidatePath("/join/verify");
  redirect("/join/profile?verification=submitted");
}
