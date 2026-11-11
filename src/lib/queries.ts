import "server-only";
import { publicClient } from "./supabase/public";
import { adminClient } from "./supabase/admin";
import { portraitUrl } from "./supabase/storage";

/*
 * Read layer. Two clients, two trust levels:
 *
 *   publicClient()  anon key, no session — sees only what any visitor may see
 *                   (RLS: published rows; column grants: public columns only).
 *   adminClient()   service role — used only after requireUser / requireAdmin
 *                   has authorised the caller, and always filtered by that caller.
 */

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`[queries] ${context}: ${error?.message ?? "unknown error"}`);
}

/** Strip characters that carry meaning in PostgREST filter syntax. */
function searchTerm(raw: string | undefined): string | null {
  const cleaned = (raw ?? "").replace(/[%_,()*\\:"']/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : null;
}

/* ------------------------------------------------------------------ public */

export type PublicProfile = {
  id: string;
  slug: string;
  publicIdentifier: string;
  fullName: string;
  /** Display URL for the portrait (public bucket), or null for a monogram plate. */
  portraitPath: string | null;
  facultyName: string;
  facultySlug: string;
  departmentName: string;
  departmentSlug: string;
  admissionYear: number;
  graduationYear: number;
  biography: string;
  graduationStatus: "in_progress" | "graduated";
  isDemo: boolean;
  searchIndexing: boolean;
  createdAt: string;
};

export type ProfileFilters = {
  q?: string;
  faculty?: string;
  department?: string;
  admissionYear?: number;
  graduationYear?: number;
  sort?: "recent" | "name" | "graduation";
  page?: number;
  pageSize?: number;
};

const PUBLIC_PROFILE_COLUMNS =
  "id, username, public_identifier, full_name, profile_image, admission_year, graduation_year, bio, graduation_status, is_demo, search_indexing, created_at, faculty_name, faculty_slug, department_name, department_slug";

type PublicProfileRow = {
  id: string;
  username: string;
  public_identifier: string;
  full_name: string;
  profile_image: string | null;
  admission_year: number;
  graduation_year: number;
  bio: string | null;
  graduation_status: string;
  is_demo: boolean;
  search_indexing: boolean;
  created_at: string;
  faculty_name: string;
  faculty_slug: string;
  department_name: string;
  department_slug: string;
};

function mapPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    id: row.id,
    slug: row.username,
    publicIdentifier: row.public_identifier,
    fullName: row.full_name,
    portraitPath: portraitUrl(row.profile_image),
    facultyName: row.faculty_name,
    facultySlug: row.faculty_slug,
    departmentName: row.department_name,
    departmentSlug: row.department_slug,
    admissionYear: row.admission_year,
    graduationYear: row.graduation_year,
    biography: row.bio ?? "",
    graduationStatus: row.graduation_status === "graduated" ? "graduated" : "in_progress",
    isDemo: row.is_demo,
    searchIndexing: row.search_indexing,
    createdAt: row.created_at,
  };
}

export async function listPublicProfiles(filters: ProfileFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
  const from = (page - 1) * pageSize;

  let query = publicClient()
    .from("public_profiles")
    .select(PUBLIC_PROFILE_COLUMNS, { count: "exact" });

  const term = searchTerm(filters.q);
  if (term) {
    query = query.or(
      `full_name.ilike.*${term}*,department_name.ilike.*${term}*,faculty_name.ilike.*${term}*`,
    );
  }
  if (filters.faculty) query = query.eq("faculty_slug", filters.faculty);
  if (filters.department) query = query.eq("department_slug", filters.department);
  if (filters.admissionYear) query = query.eq("admission_year", filters.admissionYear);
  if (filters.graduationYear) query = query.eq("graduation_year", filters.graduationYear);

  switch (filters.sort) {
    case "name":
      query = query.order("full_name", { ascending: true });
      break;
    case "graduation":
      query = query.order("graduation_year", { ascending: true }).order("full_name");
      break;
    default:
      query = query.order("created_at", { ascending: false }).order("full_name");
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) fail("listPublicProfiles", error);

  const total = count ?? 0;
  return {
    items: ((data ?? []) as PublicProfileRow[]).map(mapPublicProfile),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublicProfileBySlug(slug: string): Promise<PublicProfile | null> {
  const { data, error } = await publicClient()
    .from("public_profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("username", slug)
    .maybeSingle();
  if (error) fail("getPublicProfileBySlug", error);
  return data ? mapPublicProfile(data as PublicProfileRow) : null;
}

export async function getPublishedNeighbours(profile: PublicProfile) {
  const base = () =>
    publicClient()
      .from("public_profiles")
      .select("username, full_name")
      .eq("graduation_year", profile.graduationYear);

  const [prev, next] = await Promise.all([
    base().lt("full_name", profile.fullName).order("full_name", { ascending: false }).limit(1),
    base().gt("full_name", profile.fullName).order("full_name", { ascending: true }).limit(1),
  ]);
  const pick = (rows: unknown) => {
    const row = (rows as Array<{ username: string; full_name: string }> | null)?.[0];
    return row ? { slug: row.username, fullName: row.full_name } : null;
  };
  return { previous: pick(prev.data), next: pick(next.data) };
}

export type CohortSummary = {
  year: number;
  count: number;
  sample: Array<{ slug: string; fullName: string }>;
};

async function cohortSummaries(type: "admission" | "graduation"): Promise<CohortSummary[]> {
  const db = publicClient();
  const { data, error } = await db.rpc("public_cohort_summaries", { p_type: type });
  if (error) fail("cohortSummaries", error);

  const rows = ((data ?? []) as Array<{ year: number; count: number }>).sort((a, b) =>
    type === "graduation" ? b.year - a.year : a.year - b.year,
  );
  const column = type === "admission" ? "admission_year" : "graduation_year";

  return Promise.all(
    rows.map(async (row) => {
      const { data: sample } = await db
        .from("public_profiles")
        .select("username, full_name")
        .eq(column, row.year)
        .order("created_at", { ascending: false })
        .limit(4);
      return {
        year: Number(row.year),
        count: Number(row.count),
        sample: ((sample ?? []) as Array<{ username: string; full_name: string }>).map((s) => ({
          slug: s.username,
          fullName: s.full_name,
        })),
      };
    }),
  );
}

export async function getCohorts() {
  const [admission, graduation] = await Promise.all([
    cohortSummaries("admission"),
    cohortSummaries("graduation"),
  ]);
  return { admission, graduation };
}

export async function getCohort(type: "admission" | "graduation", year: number) {
  const db = publicClient();
  const column = type === "admission" ? "admission_year" : "graduation_year";
  const [countResult, cohortResult] = await Promise.all([
    db.from("public_profiles").select("id", { count: "exact", head: true }).eq(column, year),
    db
      .from("cohorts")
      .select("title, introduction")
      .eq("cohort_type", type)
      .eq("year", year)
      .maybeSingle(),
  ]);
  if (countResult.error) fail("getCohort", countResult.error);
  return {
    count: countResult.count ?? 0,
    label: (cohortResult.data?.title as string | null | undefined) ?? null,
    introduction: (cohortResult.data?.introduction as string | null | undefined) ?? null,
  };
}

export async function getFacultiesWithCounts() {
  const { data, error } = await publicClient().rpc("public_faculty_counts");
  if (error) fail("getFacultiesWithCounts", error);
  return ((data ?? []) as Array<{ id: number; name: string; slug: string; count: number }>).map(
    (row) => ({ ...row, id: Number(row.id), count: Number(row.count) }),
  );
}

export async function getFacultyTree() {
  const db = publicClient();
  const [faculties, departments] = await Promise.all([
    db.from("faculties").select("id, name, slug").order("sort_order").order("name"),
    db.from("departments").select("id, faculty_id, name, slug").order("sort_order").order("name"),
  ]);
  if (faculties.error) fail("getFacultyTree", faculties.error);
  if (departments.error) fail("getFacultyTree", departments.error);

  const deps = (departments.data ?? []) as Array<{
    id: number;
    faculty_id: number;
    name: string;
    slug: string;
  }>;
  return ((faculties.data ?? []) as Array<{ id: number; name: string; slug: string }>).map(
    (faculty) => ({
      ...faculty,
      departments: deps
        .filter((d) => d.faculty_id === faculty.id)
        .map((d) => ({ id: d.id, facultyId: d.faculty_id, name: d.name, slug: d.slug })),
    }),
  );
}

export type ArchiveStats = {
  published: number;
  cohorts: number;
  faculties: number;
  newestGraduationYear: number | null;
  classes: number;
};

export async function getArchiveStats(): Promise<ArchiveStats> {
  const { data, error } = await publicClient().rpc("public_archive_stats");
  if (error) fail("getArchiveStats", error);
  const stats = (data ?? {}) as Record<string, number | null>;
  const classes = Number(stats.classes ?? 0);
  return {
    published: Number(stats.published ?? 0),
    cohorts: classes,
    faculties: Number(stats.faculties ?? 0),
    newestGraduationYear: stats.newest_graduation_year ?? null,
    classes,
  };
}

export async function getYearFacets() {
  const { data, error } = await publicClient().rpc("public_year_facets");
  if (error) fail("getYearFacets", error);
  const facets = (data ?? {}) as { admission?: number[]; graduation?: number[] };
  return { admission: facets.admission ?? [], graduation: facets.graduation ?? [] };
}

/* ----------------------------------------------------------------- student */

export type OwnProfile = PublicProfile & {
  userId: string;
  facultyId: number;
  departmentId: number;
  publicationStatus: "draft" | "pending_payment" | "published" | "suspended" | "removed";
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  consentPublic: boolean;
  facesOptIn: boolean;
  /** Storage object key for the portrait (portraitPath is the display URL). */
  portraitKey: string | null;
};

const OWN_PROFILE_SELECT = `
  id, user_id, username, public_identifier, full_name, profile_image, faculty_id, department_id,
  admission_year, graduation_year, bio, graduation_status, verification_status, publication_status,
  consent_public, faces_opt_in, search_indexing, is_demo, created_at,
  faculty:faculties!faculty_fk ( name, slug ),
  department:departments!department_in_faculty ( name, slug )
`;

type OwnProfileRow = Omit<
  PublicProfileRow,
  "faculty_name" | "faculty_slug" | "department_name" | "department_slug"
> & {
  user_id: string;
  faculty_id: number;
  department_id: number;
  verification_status: OwnProfile["verificationStatus"];
  publication_status: OwnProfile["publicationStatus"];
  consent_public: boolean;
  faces_opt_in: boolean;
  faculty: { name: string; slug: string } | null;
  department: { name: string; slug: string } | null;
};

function mapOwnProfile(row: OwnProfileRow): OwnProfile {
  return {
    ...mapPublicProfile({
      ...row,
      faculty_name: row.faculty?.name ?? "",
      faculty_slug: row.faculty?.slug ?? "",
      department_name: row.department?.name ?? "",
      department_slug: row.department?.slug ?? "",
    }),
    userId: row.user_id,
    facultyId: Number(row.faculty_id),
    departmentId: Number(row.department_id),
    publicationStatus: row.publication_status,
    verificationStatus: row.verification_status,
    consentPublic: row.consent_public,
    facesOptIn: row.faces_opt_in,
    portraitKey: row.profile_image,
  };
}

/** Caller must have authorised access to this user's data (own account or admin). */
export async function getProfileForUser(userId: string): Promise<OwnProfile | null> {
  const { data, error } = await adminClient()
    .from("student_profiles")
    .select(OWN_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail("getProfileForUser", error);
  return data ? mapOwnProfile(data as unknown as OwnProfileRow) : null;
}

export type VerificationSummary = {
  id: string;
  method: "studid" | "manual";
  provider: string;
  providerReference: string | null;
  providerEntityId: string | null;
  status: "pending" | "verified" | "rejected" | "expired";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getVerificationForUser(
  userId: string,
): Promise<VerificationSummary | undefined> {
  const { data, error } = await adminClient()
    .from("verification_records")
    .select(
      "id, provider, verification_reference, provider_entity_id, verification_status, review_notes, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("getVerificationForUser", error);
  if (!data) return undefined;
  return {
    id: data.id,
    method: data.provider === "studid" ? "studid" : "manual",
    provider: data.provider,
    providerReference: data.verification_reference,
    providerEntityId: data.provider_entity_id,
    status: data.verification_status,
    // review_notes also holds the student's own note on pending manual requests.
    rejectionReason: data.verification_status === "rejected" ? data.review_notes : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export type PaymentSummary = {
  id: string;
  amountKobo: number;
  currency: string;
  gateway: string;
  paymentStatus: "initialized" | "pending" | "succeeded" | "failed" | "refunded";
  mode: "live" | "test";
  channel: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  reference: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  payment_status: PaymentSummary["paymentStatus"];
  mode: "live" | "test";
  channel: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  transaction_reference: string;
};

const PAYMENT_SELECT =
  "id, amount, currency, provider, payment_status, mode, channel, paid_at, refunded_at, created_at, transaction_reference";

function mapPayment(row: PaymentRow): PaymentSummary {
  return {
    id: row.id,
    amountKobo: Number(row.amount),
    currency: row.currency,
    gateway: row.provider,
    paymentStatus: row.payment_status,
    mode: row.mode,
    channel: row.channel,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
    reference: row.transaction_reference,
  };
}

export async function getPaymentsForUser(userId: string): Promise<PaymentSummary[]> {
  const { data, error } = await adminClient()
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) fail("getPaymentsForUser", error);
  return ((data ?? []) as PaymentRow[]).map(mapPayment);
}

export async function getEditRequestsForUser(userId: string) {
  const { data, error } = await adminClient()
    .from("profile_edit_requests")
    .select("id, request_type, message, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) fail("getEditRequestsForUser", error);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    requestType: r.request_type as string,
    message: r.message as string,
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
}

/* ------------------------------------------------------------------- admin */

export async function getAdminOverview() {
  const { data, error } = await adminClient().rpc("admin_overview");
  if (error) fail("getAdminOverview", error);
  const o = (data ?? {}) as Record<string, number | null>;
  const n = (key: string) => Number(o[key] ?? 0);
  return {
    published: n("published"),
    drafts: n("drafts"),
    awaitingPayment: n("awaiting_payment"),
    suspended: n("suspended"),
    removed: n("removed"),
    totalProfiles: n("total_profiles"),
    pendingVerifications: n("pending_verifications"),
    verifiedStudents: n("verified_students"),
    successfulPayments: n("successful_payments"),
    revenueKobo: n("revenue_kobo"),
    failedPayments: n("failed_payments"),
    refundedPayments: n("refunded_payments"),
    duplicatePayers: n("duplicate_payers"),
    totalUsers: n("total_users"),
    openRequests: n("open_requests"),
    openSubmissions: n("open_submissions"),
  };
}

export type AdminStudentRow = {
  id: string;
  userId: string | null;
  slug: string;
  publicIdentifier: string;
  fullName: string;
  email: string | null;
  portraitUrl: string | null;
  portraitKey: string | null;
  bio: string;
  facultyName: string;
  departmentName: string;
  admissionYear: number;
  graduationYear: number;
  graduationStatus: string;
  publicationStatus: string;
  verificationStatus: string;
  consentPublic: boolean;
  facesOptIn: boolean;
  isDemo: boolean;
  createdAt: string;
  userCreatedAt: string | null;
};

type AdminStudentDbRow = {
  id: string;
  user_id: string | null;
  username: string;
  public_identifier: string;
  full_name: string;
  email: string | null;
  profile_image: string | null;
  bio: string;
  faculty_name: string;
  department_name: string;
  admission_year: number;
  graduation_year: number;
  graduation_status: string;
  publication_status: string;
  verification_status: string;
  consent_public: boolean;
  faces_opt_in: boolean;
  is_demo: boolean;
  created_at: string;
  user_created_at: string | null;
};

function mapAdminStudent(row: AdminStudentDbRow): AdminStudentRow {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.username,
    publicIdentifier: row.public_identifier,
    fullName: row.full_name,
    email: row.email,
    portraitUrl: portraitUrl(row.profile_image),
    portraitKey: row.profile_image,
    bio: row.bio ?? "",
    facultyName: row.faculty_name,
    departmentName: row.department_name,
    admissionYear: row.admission_year,
    graduationYear: row.graduation_year,
    graduationStatus: row.graduation_status,
    publicationStatus: row.publication_status,
    verificationStatus: row.verification_status,
    consentPublic: row.consent_public,
    facesOptIn: row.faces_opt_in,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    userCreatedAt: row.user_created_at,
  };
}

export async function adminListStudents(filters: {
  q?: string;
  status?: string;
  verification?: string;
  page?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  let query = adminClient().from("admin_student_index").select("*", { count: "exact" });
  const term = searchTerm(filters.q);
  if (term) {
    query = query.or(`full_name.ilike.*${term}*,email.ilike.*${term}*,username.ilike.*${term}*`);
  }
  if (filters.status) query = query.eq("publication_status", filters.status);
  if (filters.verification) query = query.eq("verification_status", filters.verification);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) fail("adminListStudents", error);

  const total = count ?? 0;
  return {
    items: ((data ?? []) as AdminStudentDbRow[]).map(mapAdminStudent),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type AdminVerificationRow = {
  id: string;
  userId: string;
  method: "studid" | "manual";
  status: string;
  matricNumber: string | null;
  providerReference: string | null;
  providerEntityId: string | null;
  documentPath: string | null;
  rejectionReason: string | null;
  claimedName: string | null;
  createdAt: string;
  verifiedAt: string | null;
  profileId: string | null;
  fullName: string | null;
  slug: string | null;
  email: string;
  departmentName: string | null;
};

type AdminVerificationDbRow = {
  id: string;
  user_id: string;
  provider: string;
  verification_status: string;
  matric_number: string | null;
  verification_reference: string | null;
  provider_entity_id: string | null;
  document_path: string | null;
  review_notes: string | null;
  claimed_name: string | null;
  created_at: string;
  verified_at: string | null;
  profile_id: string | null;
  full_name: string | null;
  username: string | null;
  email: string;
  department_name: string | null;
};

function mapAdminVerification(row: AdminVerificationDbRow): AdminVerificationRow {
  return {
    id: row.id,
    userId: row.user_id,
    method: row.provider === "studid" ? "studid" : "manual",
    status: row.verification_status,
    matricNumber: row.matric_number,
    providerReference: row.verification_reference,
    providerEntityId: row.provider_entity_id,
    documentPath: row.document_path,
    rejectionReason: row.review_notes,
    claimedName: row.claimed_name,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
    profileId: row.profile_id,
    fullName: row.full_name,
    slug: row.username,
    email: row.email,
    departmentName: row.department_name,
  };
}

export async function adminGetStudent(profileId: string) {
  const db = adminClient();
  const { data: profile, error } = await db
    .from("admin_student_index")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  if (error) fail("adminGetStudent", error);
  if (!profile) return null;

  const student = mapAdminStudent(profile as AdminStudentDbRow);
  if (!student.userId) return { profile: student, verifications: [], payments: [], submissions: [] };

  const [verifications, payments, submissions] = await Promise.all([
    db
      .from("admin_verification_queue")
      .select("*")
      .eq("user_id", student.userId)
      .order("created_at", { ascending: false }),
    db
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("user_id", student.userId)
      .order("created_at", { ascending: false }),
    db
      .from("editorial_submissions")
      .select("id, submission_status, submitted_at, edition:faces_editions ( year )")
      .eq("student_profile_id", student.id)
      .order("submitted_at", { ascending: false }),
  ]);

  return {
    profile: student,
    verifications: ((verifications.data ?? []) as AdminVerificationDbRow[]).map(
      mapAdminVerification,
    ),
    payments: ((payments.data ?? []) as PaymentRow[]).map(mapPayment),
    submissions: (submissions.data ?? []).map((s) => ({
      id: s.id as string,
      status: s.submission_status as string,
      submittedAt: s.submitted_at as string,
      editionYear: ((s.edition as unknown as { year: number } | null)?.year ?? null) as
        | number
        | null,
    })),
  };
}

export async function adminListVerifications(status = "pending") {
  const { data, error } = await adminClient()
    .from("admin_verification_queue")
    .select("*")
    .eq("verification_status", status)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) fail("adminListVerifications", error);
  return ((data ?? []) as AdminVerificationDbRow[]).map(mapAdminVerification);
}

export async function adminListPayments(filters: { status?: string; q?: string } = {}) {
  let query = adminClient().from("admin_payment_list").select("*");
  if (filters.status) query = query.eq("payment_status", filters.status);
  const term = searchTerm(filters.q);
  if (term) {
    query = query.or(
      `transaction_reference.ilike.*${term}*,email.ilike.*${term}*,full_name.ilike.*${term}*`,
    );
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) fail("adminListPayments", error);
  return ((data ?? []) as Array<PaymentRow & {
    user_id: string | null;
    email: string | null;
    full_name: string | null;
    profile_id: string | null;
  }>).map((row) => ({
    ...mapPayment(row),
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    profileId: row.profile_id,
  }));
}

export async function adminListRequests() {
  const { data, error } = await adminClient()
    .from("admin_request_list")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) fail("adminListRequests", error);
  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    requestType: r.request_type as string,
    message: r.message as string,
    status: r.status as string,
    createdAt: r.created_at as string,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    email: r.email as string,
    fullName: (r.full_name as string | null) ?? null,
    slug: (r.username as string | null) ?? null,
    profileId: (r.profile_id as string | null) ?? null,
  }));
  // Open requests first, then newest.
  return rows.sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open"));
}

export async function listAuditLogs(limit = 100) {
  const { data, error } = await adminClient()
    .from("admin_audit_list")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("listAuditLogs", error);
  return (data ?? []).map((a) => ({
    id: a.id as string,
    action: a.action as string,
    targetType: (a.target_type as string | null) ?? null,
    targetId: (a.target_id as string | null) ?? null,
    detail: (a.detail as string | null) ?? null,
    createdAt: a.created_at as string,
    adminEmail: (a.actor_email as string | null) ?? "system",
  }));
}

export async function getCohortTable() {
  const db = adminClient();
  const [cohorts, profiles] = await Promise.all([
    db
      .from("cohorts")
      .select("year, cohort_type, title, introduction")
      .order("year", { ascending: false })
      .order("cohort_type"),
    db.rpc("public_cohort_summaries", { p_type: "admission" }),
  ]);
  const grad = await db.rpc("public_cohort_summaries", { p_type: "graduation" });
  if (cohorts.error) fail("getCohortTable", cohorts.error);

  const counts = new Map<string, number>();
  for (const r of (profiles.data ?? []) as Array<{ year: number; count: number }>) {
    counts.set(`admission:${r.year}`, Number(r.count));
  }
  for (const r of (grad.data ?? []) as Array<{ year: number; count: number }>) {
    counts.set(`graduation:${r.year}`, Number(r.count));
  }

  return (cohorts.data ?? []).map((c) => ({
    year: c.year as number,
    cohortType: c.cohort_type as "admission" | "graduation",
    label: (c.title as string | null) ?? null,
    introduction: (c.introduction as string | null) ?? null,
    count: counts.get(`${c.cohort_type}:${c.year}`) ?? 0,
  }));
}
