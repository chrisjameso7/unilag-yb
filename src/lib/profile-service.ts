import "server-only";
import { randomBytes } from "node:crypto";
import { adminClient } from "./supabase/admin";
import { getProfileForUser } from "./queries";

export type ProfileInput = {
  fullName: string;
  facultyId: number;
  departmentId: number;
  admissionYear: number;
  graduationYear: number;
  biography: string;
  graduationStatus: "in_progress" | "graduated";
  consent: boolean;
  facesOptIn?: boolean;
  /** New storage object key, when a portrait was uploaded with this save. */
  portraitKey?: string | null;
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
}

async function uniqueUsername(fullName: string): Promise<string> {
  const base = slugify(fullName) || "yearbook-student";
  const { data } = await adminClient()
    .from("student_profiles")
    .select("username")
    .or(`username.eq.${base},username.like.${base}-*`);
  const taken = new Set(((data ?? []) as Array<{ username: string }>).map((r) => r.username));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export async function departmentBelongsToFaculty(
  departmentId: number,
  facultyId: number,
): Promise<boolean> {
  const { data } = await adminClient()
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .eq("faculty_id", facultyId)
    .maybeSingle();
  return Boolean(data);
}

export type SaveProfileResult =
  | { ok: true; slug: string; previousPortraitKey: string | null }
  | { ok: false; error: string; field?: string };

export async function saveProfile(userId: string, input: ProfileInput): Promise<SaveProfileResult> {
  if (!(await departmentBelongsToFaculty(input.departmentId, input.facultyId))) {
    return { ok: false, error: "Choose a department inside the selected faculty.", field: "departmentId" };
  }

  const db = adminClient();
  const existing = await getProfileForUser(userId);

  const fields = {
    full_name: input.fullName,
    faculty_id: input.facultyId,
    department_id: input.departmentId,
    admission_year: input.admissionYear,
    graduation_year: input.graduationYear,
    bio: input.biography,
    graduation_status: input.graduationStatus,
    // Consent, once given, is withdrawn through the dashboard, not by an unticked edit form.
    consent_public: input.consent || Boolean(existing?.consentPublic),
    ...(input.facesOptIn !== undefined ? { faces_opt_in: input.facesOptIn } : {}),
    ...(input.portraitKey ? { profile_image: input.portraitKey } : {}),
  };

  if (existing) {
    const { error } = await db.from("student_profiles").update(fields).eq("user_id", userId);
    if (error) return { ok: false, error: "Your profile could not be saved. Try again." };

    if (existing.publicationStatus === "published") {
      await db.from("cohorts").upsert(
        [
          { year: input.admissionYear, cohort_type: "admission" },
          { year: input.graduationYear, cohort_type: "graduation" },
        ],
        { onConflict: "year,cohort_type", ignoreDuplicates: true },
      );
    }
    await refreshProfileVerification(userId);
    return {
      ok: true,
      slug: existing.slug,
      previousPortraitKey:
        input.portraitKey && existing.portraitKey !== input.portraitKey ? existing.portraitKey : null,
    };
  }

  // Retry once on a username collision from a concurrent signup.
  for (let attempt = 0; attempt < 2; attempt++) {
    const username = await uniqueUsername(input.fullName);
    const { error } = await db
      .from("student_profiles")
      .insert({ ...fields, user_id: userId, username, publication_status: "draft" });
    if (!error) {
      await refreshProfileVerification(userId);
      return { ok: true, slug: username, previousPortraitKey: null };
    }
    if (error.code !== "23505") break;
  }
  return { ok: false, error: "Your profile could not be created. Try again." };
}

export async function refreshProfileVerification(userId: string) {
  const { error } = await adminClient().rpc("refresh_profile_verification", { p_user_id: userId });
  if (error) console.error("[profile] refresh verification failed", error.message);
}

export async function setConsent(userId: string, consent: boolean) {
  await adminClient().from("student_profiles").update({ consent_public: consent }).eq("user_id", userId);
}

/**
 * Append-only audit trail. actorId is null for system actors (e.g. the payment
 * webhook). Failure to write an audit row is logged loudly but does not undo
 * the action that already happened.
 */
export async function logAudit(
  actorId: string | null,
  action: string,
  targetType: string | null = null,
  targetId: string | null = null,
  detail: string | null = null,
) {
  const { error } = await adminClient().from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    detail: detail?.slice(0, 1000) ?? null,
  });
  if (error) console.error("[audit] write failed", action, error.message);
}
