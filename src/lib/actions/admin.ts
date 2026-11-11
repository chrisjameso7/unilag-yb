"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth";
import { adminClient } from "../supabase/admin";
import { logAudit, refreshProfileVerification } from "../profile-service";
import { publishProfile, tryPublishAfterVerification } from "../publish";
import { getPaymentByReference, markPaymentRefunded, paystackConfigured } from "../payments";
import { removeUpload } from "../uploads";
import { setContent } from "../content";
import { notifyPublished, notifyVerificationDecision } from "../email";

function refreshPublicViews() {
  for (const path of [
    "/",
    "/students",
    "/classes",
    "/admin",
    "/admin/students",
    "/admin/verifications",
    "/dashboard",
  ]) {
    revalidatePath(path);
  }
}

const enc = encodeURIComponent;

export async function reviewVerificationAction(formData: FormData) {
  const admin = await requireAdmin("/admin/verifications", "verifications");
  const verificationId = String(formData.get("verificationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  if (!verificationId || (decision !== "approve" && decision !== "reject")) {
    redirect("/admin/verifications?error=Invalid%20review%20action.");
  }

  const db = adminClient();
  const { data: record } = await db
    .from("verification_records")
    .select("id, user_id, verification_status, document_path")
    .eq("id", verificationId)
    .maybeSingle();
  if (!record) redirect("/admin/verifications?error=Verification%20not%20found.");
  if (record.verification_status !== "pending") {
    redirect("/admin/verifications?error=That%20request%20has%20already%20been%20reviewed.");
  }

  const approve = decision === "approve";
  const { error } = await db
    .from("verification_records")
    .update({
      verification_status: approve ? "verified" : "rejected",
      review_notes: approve ? null : reason || "Not approved. Contact the team for details.",
      reviewed_by: admin.id,
      verified_at: approve ? new Date().toISOString() : null,
    })
    .eq("id", verificationId)
    .eq("verification_status", "pending");
  if (error) redirect(`/admin/verifications?error=${enc(error.message)}`);

  // Data minimisation: the ID document is only needed for the decision itself.
  if (record.document_path) {
    await removeUpload("verification-document", record.document_path);
    await db.from("verification_records").update({ document_path: null }).eq("id", verificationId);
  }

  await refreshProfileVerification(record.user_id);
  const published = approve ? (await tryPublishAfterVerification(record.user_id)).published : false;

  await notifyVerificationDecision(record.user_id, approve, approve ? null : reason || null);
  if (published) await notifyPublished(record.user_id);

  await logAudit(
    admin.id,
    approve ? "verification.approved" : "verification.rejected",
    "verification",
    verificationId,
    reason || null,
  );

  refreshPublicViews();
  redirect(`/admin/verifications?done=${decision}${published ? "&published=1" : ""}`);
}

export async function setStudentPublicationAction(formData: FormData) {
  const admin = await requireAdmin("/admin/students", "students");
  const profileId = String(formData.get("profileId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  const db = adminClient();
  const { data: profile } = await db
    .from("student_profiles")
    .select("id, user_id, username, publication_status, is_demo")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) redirect("/admin/students?error=Student%20not%20found.");

  if (intent === "suspend" || intent === "remove") {
    const status = intent === "suspend" ? "suspended" : "removed";
    await db.from("student_profiles").update({ publication_status: status }).eq("id", profileId);
    await logAudit(admin.id, `profile.${status}`, "profile", profileId);
  } else if (intent === "restore") {
    if (profile.is_demo || !profile.user_id) {
      await db.from("student_profiles").update({ publication_status: "published" }).eq("id", profileId);
      await logAudit(admin.id, "profile.restored", "profile", profileId, "Demonstration entry.");
    } else {
      await db.from("student_profiles").update({ publication_status: "draft" }).eq("id", profileId);
      const result = await publishProfile(profile.user_id);
      await logAudit(
        admin.id,
        "profile.restored",
        "profile",
        profileId,
        result.published ? "Republished." : `Left in draft: ${result.reasons.join(" ")}`,
      );
    }
  } else {
    redirect(`/admin/students/${profileId}?error=Unknown%20action.`);
  }

  refreshPublicViews();
  revalidatePath(`/admin/students/${profileId}`);
  revalidatePath(`/student/${profile.username}`);
  redirect(`/admin/students/${profileId}`);
}

export async function suspendAccountAction(formData: FormData) {
  const admin = await requireAdmin("/admin/students", "students");
  const userId = String(formData.get("userId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!userId || (intent !== "suspend" && intent !== "reactivate")) {
    redirect("/admin/students?error=Invalid%20action.");
  }
  if (userId === admin.id) redirect(`/admin/students/${profileId}?error=You%20cannot%20suspend%20yourself.`);

  await adminClient()
    .from("users")
    .update({ account_status: intent === "suspend" ? "suspended" : "active" })
    .eq("id", userId);
  await logAudit(admin.id, `account.${intent === "suspend" ? "suspended" : "reactivated"}`, "user", userId);
  revalidatePath(`/admin/students/${profileId}`);
  redirect(`/admin/students/${profileId}`);
}

/**
 * Refund the entry fee. For Paystack payments this calls Paystack's refund API;
 * the `refund.processed` webhook later confirms it. The local harness is marked
 * refunded directly. A refund does not unpublish the entry by itself — suspend
 * the page separately if that is the reason for the refund.
 */
export async function refundPaymentAction(formData: FormData) {
  const admin = await requireAdmin("/admin/payments", "payments");
  const reference = String(formData.get("reference") ?? "");
  const payment = await getPaymentByReference(reference);
  if (!payment) redirect("/admin/payments?error=Payment%20not%20found.");
  if (payment.payment_status !== "succeeded") {
    redirect("/admin/payments?error=Only%20successful%20payments%20can%20be%20refunded.");
  }

  if (payment.provider === "paystack") {
    if (!paystackConfigured()) redirect("/admin/payments?error=Paystack%20is%20not%20configured.");
    let refusal: string | null = null;
    try {
      const response = await fetch("https://api.paystack.co/refund", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transaction: reference }),
        cache: "no-store",
      });
      const payload = (await response.json()) as { status?: boolean; message?: string };
      if (!response.ok || !payload.status) refusal = payload.message ?? "Paystack refused the refund.";
    } catch {
      refusal = "Could not reach Paystack.";
    }
    if (refusal) redirect(`/admin/payments?error=${enc(refusal)}`);
  }

  await markPaymentRefunded(reference);
  await logAudit(
    admin.id,
    "payment.refunded",
    "payment",
    reference,
    payment.provider === "paystack" ? "Refund requested from Paystack." : "Local harness payment marked refunded.",
  );
  refreshPublicViews();
  revalidatePath("/admin/payments");
  redirect("/admin/payments?done=refund");
}

export async function resolveRequestAction(formData: FormData) {
  const admin = await requireAdmin("/admin/requests", "requests");
  const id = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "resolved" && decision !== "dismissed")) {
    redirect("/admin/requests?error=Invalid%20action.");
  }

  await adminClient()
    .from("profile_edit_requests")
    .update({ status: decision, resolved_at: new Date().toISOString(), resolved_by: admin.id })
    .eq("id", id);
  await logAudit(admin.id, `request.${decision}`, "profile_request", id);
  revalidatePath("/admin/requests");
  redirect("/admin/requests");
}

export async function updateContentAction(formData: FormData) {
  const admin = await requireAdmin("/admin/content", "content");
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const lastReviewed = String(formData.get("lastReviewed") ?? "").trim();

  if (!/^[a-z0-9._-]{3,80}$/.test(key) || value.length === 0 || value.length > 4000) {
    redirect("/admin/content?error=Check%20the%20key%20and%20value.");
  }
  if (key === "archive.entry_fee_kobo" && !admin.permissions.includes("payments")) {
    redirect("/admin/content?error=Only%20full%20administrators%20can%20change%20the%20price.");
  }
  if (key === "archive.entry_fee_kobo" && !/^[1-9][0-9]{2,8}$/.test(value)) {
    redirect("/admin/content?error=The%20fee%20is%20a%20whole%20number%20of%20kobo%2C%20e.g.%20299900.");
  }
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) {
    redirect("/admin/content?error=Source%20URL%20must%20start%20with%20http.");
  }

  await setContent(key, value, { sourceUrl: sourceUrl || null, lastReviewed: lastReviewed || null });
  await logAudit(admin.id, "content.updated", "content", key, value.slice(0, 120));
  refreshPublicViews();
  revalidatePath("/admin/content");
  redirect("/admin/content?done=1");
}

export async function updateCohortAction(formData: FormData) {
  const admin = await requireAdmin("/admin/cohorts", "cohorts");
  const year = Number(formData.get("year"));
  const cohortType = String(formData.get("cohortType") ?? "");
  const title = String(formData.get("label") ?? "").trim().slice(0, 80);
  const introduction = String(formData.get("introduction") ?? "").trim().slice(0, 1200);

  if (!Number.isInteger(year) || (cohortType !== "admission" && cohortType !== "graduation")) {
    redirect("/admin/cohorts?error=Invalid%20cohort.");
  }

  const { error } = await adminClient()
    .from("cohorts")
    .upsert(
      { year, cohort_type: cohortType, title: title || null, introduction: introduction || null },
      { onConflict: "year,cohort_type" },
    );
  if (error) redirect(`/admin/cohorts?error=${enc(error.message)}`);
  await logAudit(admin.id, "cohort.updated", "cohort", `${cohortType}:${year}`, title);
  revalidatePath("/admin/cohorts");
  revalidatePath("/classes");
  revalidatePath(`/classes/${cohortType}/${year}`);
  redirect("/admin/cohorts?done=1");
}

/** Remove a verification document from storage once it is no longer needed (data minimisation). */
export async function purgeVerificationDocumentAction(formData: FormData) {
  const admin = await requireAdmin("/admin/verifications", "verifications");
  const id = String(formData.get("verificationId") ?? "");
  const back = String(formData.get("back") ?? "/admin/verifications");
  const db = adminClient();
  const { data: record } = await db
    .from("verification_records")
    .select("id, document_path, verification_status")
    .eq("id", id)
    .maybeSingle();
  if (!record?.document_path) redirect(back.startsWith("/admin") ? back : "/admin/verifications");
  if (record.verification_status === "pending") {
    redirect("/admin/verifications?error=Review%20the%20request%20before%20deleting%20its%20document.");
  }
  await removeUpload("verification-document", record.document_path);
  await db.from("verification_records").update({ document_path: null }).eq("id", id);
  await logAudit(admin.id, "verification.document_deleted", "verification", id);
  redirect(back.startsWith("/admin") ? back : "/admin/verifications");
}
