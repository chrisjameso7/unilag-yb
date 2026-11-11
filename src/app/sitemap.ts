import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Public pages plus every published, indexable profile, cohort and Faces edition. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const fixed = ["", "/students", "/classes", "/faces-of-the-year", "/about", "/join", "/portrait-guide", "/privacy", "/terms"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
  }));

  const db = publicClient();
  const [profiles, editions, cohorts] = await Promise.all([
    db.from("public_profiles").select("username, published_at").eq("search_indexing", true).eq("is_demo", false).limit(45000),
    db.from("faces_editions").select("year, published_at"),
    db.from("cohorts").select("year, cohort_type"),
  ]);

  return [
    ...fixed,
    ...(profiles.data ?? []).map((p) => ({ url: `${base}/student/${p.username}`, lastModified: p.published_at ?? undefined })),
    ...(editions.data ?? []).map((e) => ({ url: `${base}/faces-of-the-year/${e.year}`, lastModified: e.published_at ?? undefined })),
    ...(cohorts.data ?? []).map((c) => ({ url: `${base}/classes/${c.cohort_type}/${c.year}` })),
  ];
}
