import "server-only";
import { publicClient } from "./supabase/public";
import { adminClient } from "./supabase/admin";

export type ContentEntry = {
  key: string;
  value: string;
  sourceUrl: string | null;
  lastReviewed: string | null;
  updatedAt: string;
};

const DEFAULT_FEE_KOBO = 299900; // ₦2,999 — working launch price (plan §5, step 5)

type ContentRow = {
  key: string;
  value: string;
  source_url: string | null;
  last_reviewed: string | null;
  updated_at: string;
};

export async function getContentMap(): Promise<Record<string, ContentEntry>> {
  const { data, error } = await publicClient()
    .from("site_content")
    .select("key, value, source_url, last_reviewed, updated_at")
    .order("key");
  if (error) throw new Error(`Could not load site content: ${error.message}`);
  return Object.fromEntries(
    ((data ?? []) as ContentRow[]).map((row) => [
      row.key,
      {
        key: row.key,
        value: row.value,
        sourceUrl: row.source_url,
        lastReviewed: row.last_reviewed,
        updatedAt: row.updated_at,
      },
    ]),
  );
}

export async function getContent(key: string, fallback = ""): Promise<string> {
  const { data } = await publicClient()
    .from("site_content")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as string | undefined) ?? fallback;
}

export async function getEntryFeeKobo(): Promise<number> {
  const raw = await getContent("archive.entry_fee_kobo", String(DEFAULT_FEE_KOBO));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FEE_KOBO;
}

export async function setContent(
  key: string,
  value: string,
  meta: { sourceUrl?: string | null; lastReviewed?: string | null } = {},
) {
  const row: Record<string, unknown> = { key, value };
  if (meta.sourceUrl) row.source_url = meta.sourceUrl;
  if (meta.lastReviewed) row.last_reviewed = meta.lastReviewed;
  const { error } = await adminClient().from("site_content").upsert(row, { onConflict: "key" });
  if (error) throw new Error(`Could not save content: ${error.message}`);
}
