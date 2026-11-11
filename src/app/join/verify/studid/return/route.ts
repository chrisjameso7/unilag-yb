import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { logAudit, refreshProfileVerification } from "@/lib/profile-service";
import { checkStudidVerification } from "@/lib/studid";
import { tryPublishAfterVerification } from "@/lib/publish";
import { notifyPublished } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Studid sends the student back here after they sign in at their institution's
 * identity provider. The result is always fetched from Studid server-side using
 * the Studid verification id and our private secret; the query string is never
 * trusted.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fjoin%2Fverify");

  const db = adminClient();
  const { data: record } = await db
    .from("verification_records")
    .select("id, verification_reference, provider_secret")
    .eq("user_id", user.id)
    .eq("provider", "studid")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record?.verification_reference || !record.provider_secret) {
    redirect("/join/verify?error=No%20Studid%20verification%20is%20waiting%20for%20this%20account.");
  }

  const check = await checkStudidVerification(record.verification_reference, record.provider_secret);

  if (check.state === "verified") {
    await db
      .from("verification_records")
      .update({
        verification_status: "verified",
        provider_entity_id: check.entityId,
        provider_subject: check.subject,
        provider_secret: null, // no longer needed once the result is recorded
        verified_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    await refreshProfileVerification(user.id);
    const { published } = await tryPublishAfterVerification(user.id);
    if (published) await notifyPublished(user.id);
    await logAudit(user.id, "verification.studid_verified", "verification", record.id, check.entityId);
    redirect("/join/verify");
  }

  if (check.state === "rejected") {
    await db
      .from("verification_records")
      .update({ verification_status: "rejected", review_notes: check.reason, provider_secret: null })
      .eq("id", record.id);
    await refreshProfileVerification(user.id);
    redirect(`/join/verify?error=${encodeURIComponent(check.reason)}`);
  }

  redirect("/join/verify");
}
