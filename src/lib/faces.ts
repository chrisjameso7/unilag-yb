import "server-only";
import { publicClient } from "./supabase/public";
import { adminClient } from "./supabase/admin";
import { portraitUrl } from "./supabase/storage";
import { signedUrl } from "./uploads";

/*
 * Faces of the Year — the annual editorial edition (plan §4.5).
 *
 * Lifecycle:
 *   student opts in → submits portrait + introduction (private bucket)
 *   → editors shortlist / request a replacement / decline
 *   → editors select: portrait is copied to the public bucket and a draft entry is created
 *   → the student approves the final portrait and copy (consent_status = granted)
 *   → editors publish the entry, then the edition.
 * Public pages only ever show entries that are published, consented, in a
 * published edition, and whose yearbook profile is itself published (enforced by RLS).
 */

export type FacesEdition = {
  id: string;
  year: number;
  title: string;
  introduction: string;
  coverUrl: string | null;
  publicationStatus: "draft" | "published" | "archived";
  submissionsOpen: boolean;
  publishedAt: string | null;
};

type EditionRow = {
  id: string;
  year: number;
  title: string;
  introduction: string;
  cover_image: string | null;
  publication_status: FacesEdition["publicationStatus"];
  submissions_open: boolean;
  published_at: string | null;
};

const EDITION_SELECT =
  "id, year, title, introduction, cover_image, publication_status, submissions_open, published_at";

function mapEdition(row: EditionRow): FacesEdition {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    introduction: row.introduction ?? "",
    coverUrl: portraitUrl(row.cover_image),
    publicationStatus: row.publication_status,
    submissionsOpen: row.submissions_open,
    publishedAt: row.published_at,
  };
}

export type FacesEntry = {
  id: string;
  editionYear: number;
  displayOrder: number;
  portraitUrl: string | null;
  editorialIntroduction: string;
  quote: string | null;
  slug: string;
  fullName: string;
  facultyName: string;
  departmentName: string;
  admissionYear: number;
  graduationYear: number;
};

/* ------------------------------------------------------------------ public */

export async function listPublishedEditions(): Promise<FacesEdition[]> {
  const { data, error } = await publicClient()
    .from("faces_editions")
    .select(EDITION_SELECT)
    .order("year", { ascending: false });
  if (error) throw new Error(`[faces] editions: ${error.message}`);
  return ((data ?? []) as EditionRow[]).map(mapEdition);
}

export async function getPublishedEdition(year: number) {
  const db = publicClient();
  const { data: edition } = await db
    .from("faces_editions")
    .select(EDITION_SELECT)
    .eq("year", year)
    .maybeSingle();
  if (!edition) return null;

  const { data: entries, error } = await db
    .from("public_faces_entries")
    .select("*")
    .eq("edition_year", year)
    .order("display_order")
    .order("full_name");
  if (error) throw new Error(`[faces] entries: ${error.message}`);

  return {
    edition: mapEdition(edition as EditionRow),
    entries: (entries ?? []).map((e) => ({
      id: e.id as string,
      editionYear: e.edition_year as number,
      displayOrder: e.display_order as number,
      portraitUrl: portraitUrl((e.portrait_image as string | null) ?? (e.profile_image as string | null)),
      editorialIntroduction: (e.editorial_introduction as string) ?? "",
      quote: (e.quote as string | null) ?? null,
      slug: e.username as string,
      fullName: e.full_name as string,
      facultyName: e.faculty_name as string,
      departmentName: e.department_name as string,
      admissionYear: e.admission_year as number,
      graduationYear: e.graduation_year as number,
    })) satisfies FacesEntry[],
  };
}

/** Faces features a student appears in (for their public profile). */
export async function getFacesFeaturesForProfile(profileId: string) {
  const { data } = await publicClient()
    .from("public_faces_entries")
    .select("edition_year")
    .eq("profile_id", profileId)
    .order("edition_year", { ascending: false });
  return ((data ?? []) as Array<{ edition_year: number }>).map((r) => r.edition_year);
}

/** The edition currently accepting submissions, if any (draft or published). */
export async function getOpenEdition(): Promise<FacesEdition | null> {
  const { data } = await adminClient()
    .from("faces_editions")
    .select(EDITION_SELECT)
    .eq("submissions_open", true)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapEdition(data as EditionRow) : null;
}

/* ----------------------------------------------------------------- student */

export type OwnSubmission = {
  id: string;
  editionYear: number | null;
  status:
    | "submitted"
    | "shortlisted"
    | "selected"
    | "replacement_requested"
    | "declined"
    | "withdrawn";
  personalIntroduction: string;
  quote: string | null;
  reviewNotes: string | null;
  submittedAt: string;
  imageUrl: string | null;
  entry: {
    id: string;
    portraitUrl: string | null;
    editorialIntroduction: string;
    quote: string | null;
    consentStatus: "pending" | "granted" | "withdrawn";
    publicationStatus: "draft" | "published";
  } | null;
};

/** Caller must be the profile owner. Includes signed thumbnails of their own private uploads. */
export async function getOwnSubmissions(profileId: string): Promise<OwnSubmission[]> {
  const db = adminClient();
  const { data } = await db
    .from("editorial_submissions")
    .select(
      "id, image_path, personal_introduction, quote, submission_status, review_notes, submitted_at, edition:faces_editions ( year )",
    )
    .eq("student_profile_id", profileId)
    .order("submitted_at", { ascending: false })
    .limit(10);

  const { data: entries } = await db
    .from("faces_entries")
    .select(
      "id, submission_id, portrait_image, editorial_introduction, quote, consent_status, publication_status",
    )
    .eq("student_profile_id", profileId);

  return Promise.all(
    (data ?? []).map(async (s) => {
      const entry = (entries ?? []).find((e) => e.submission_id === s.id);
      return {
        id: s.id as string,
        editionYear: (s.edition as unknown as { year: number } | null)?.year ?? null,
        status: s.submission_status as OwnSubmission["status"],
        personalIntroduction: s.personal_introduction as string,
        quote: (s.quote as string | null) ?? null,
        reviewNotes: (s.review_notes as string | null) ?? null,
        submittedAt: s.submitted_at as string,
        imageUrl: await signedUrl("editorial-submission", s.image_path as string, 600),
        entry: entry
          ? {
              id: entry.id as string,
              portraitUrl: portraitUrl(entry.portrait_image as string | null),
              editorialIntroduction: entry.editorial_introduction as string,
              quote: (entry.quote as string | null) ?? null,
              consentStatus: entry.consent_status as "pending" | "granted" | "withdrawn",
              publicationStatus: entry.publication_status as "draft" | "published",
            }
          : null,
      };
    }),
  );
}

/* ------------------------------------------------------------------- admin */

export async function adminListEditions() {
  const db = adminClient();
  const [{ data: editions }, { data: subs }, { data: entries }] = await Promise.all([
    db.from("faces_editions").select(EDITION_SELECT).order("year", { ascending: false }),
    db.from("editorial_submissions").select("edition_id, submission_status"),
    db.from("faces_entries").select("edition_id, publication_status, consent_status"),
  ]);
  return ((editions ?? []) as EditionRow[]).map((row) => {
    const s = (subs ?? []).filter((x) => x.edition_id === row.id);
    const e = (entries ?? []).filter((x) => x.edition_id === row.id);
    return {
      ...mapEdition(row),
      submissions: s.length,
      openSubmissions: s.filter((x) => ["submitted", "shortlisted"].includes(x.submission_status as string)).length,
      entries: e.length,
      publishedEntries: e.filter((x) => x.publication_status === "published" && x.consent_status === "granted").length,
    };
  });
}

export async function adminGetEdition(year: number) {
  const db = adminClient();
  const { data: edition } = await db
    .from("faces_editions")
    .select(EDITION_SELECT)
    .eq("year", year)
    .maybeSingle();
  if (!edition) return null;

  const [{ data: submissions }, { data: entries }] = await Promise.all([
    db
      .from("admin_editorial_queue")
      .select("*")
      .eq("edition_id", edition.id)
      .order("submitted_at", { ascending: true }),
    db
      .from("faces_entries")
      .select(
        "id, student_profile_id, submission_id, portrait_image, editorial_introduction, quote, display_order, consent_status, consent_recorded_at, publication_status, profile:student_profiles ( full_name, username, publication_status )",
      )
      .eq("edition_id", edition.id)
      .order("display_order")
      .order("created_at"),
  ]);

  return {
    edition: mapEdition(edition as EditionRow),
    submissions: await Promise.all(
      (submissions ?? []).map(async (s) => ({
        id: s.id as string,
        profileId: s.student_profile_id as string,
        fullName: s.full_name as string,
        username: s.username as string,
        profilePublicationStatus: s.profile_publication_status as string,
        facultyName: s.faculty_name as string,
        departmentName: s.department_name as string,
        admissionYear: s.admission_year as number,
        graduationYear: s.graduation_year as number,
        status: s.submission_status as OwnSubmission["status"],
        personalIntroduction: s.personal_introduction as string,
        quote: (s.quote as string | null) ?? null,
        reviewNotes: (s.review_notes as string | null) ?? null,
        consentReference: s.consent_reference as string,
        submittedAt: s.submitted_at as string,
        imageUrl: await signedUrl("editorial-submission", s.image_path as string, 900),
      })),
    ),
    entries: (entries ?? []).map((e) => {
      const profile = e.profile as unknown as {
        full_name: string;
        username: string;
        publication_status: string;
      } | null;
      return {
        id: e.id as string,
        profileId: e.student_profile_id as string,
        submissionId: (e.submission_id as string | null) ?? null,
        portraitUrl: portraitUrl(e.portrait_image as string | null),
        editorialIntroduction: e.editorial_introduction as string,
        quote: (e.quote as string | null) ?? null,
        displayOrder: e.display_order as number,
        consentStatus: e.consent_status as "pending" | "granted" | "withdrawn",
        consentRecordedAt: (e.consent_recorded_at as string | null) ?? null,
        publicationStatus: e.publication_status as "draft" | "published",
        fullName: profile?.full_name ?? "",
        username: profile?.username ?? "",
        profilePublished: profile?.publication_status === "published",
      };
    }),
  };
}
