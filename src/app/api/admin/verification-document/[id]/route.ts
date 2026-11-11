import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { signedUrl } from "@/lib/uploads";
import { logAudit } from "@/lib/profile-service";

export const dynamic = "force-dynamic";

/**
 * Opens a student's verification document for a reviewer. The file lives in the
 * private "verification-documents" bucket; this route checks the reviewer's
 * permission, records the access in the audit log, and redirects to a signed URL
 * that expires after two minutes. The document is never publicly addressable.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "active" || !user.permissions.includes("verifications")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: record } = await adminClient()
    .from("verification_records")
    .select("id, document_path")
    .eq("id", id)
    .maybeSingle();
  if (!record?.document_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await signedUrl("verification-document", record.document_path, 120);
  if (!url) return NextResponse.json({ error: "Document unavailable" }, { status: 404 });

  await logAudit(user.id, "verification.document_viewed", "verification", id);

  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
