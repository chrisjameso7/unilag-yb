export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
    currencyDisplay: "narrowSymbol",
  }).format(kobo / 100);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function academicRange(admissionYear: number, graduationYear: number): string {
  return `${admissionYear}–${graduationYear}`;
}

/** Deterministic plate palette so a person's card looks the same on every visit. */
export function platePalette(seed: string): { from: string; via: string; to: string; ink: string } {
  const palettes = [
    { from: "#12203c", via: "#1c3050", to: "#0a1526", ink: "#f3efe4" },
    { from: "#0b3d2c", via: "#0f5740", to: "#072a1e", ink: "#f3efe4" },
    { from: "#2c2620", via: "#40382d", to: "#1d1914", ink: "#f6f1e6" },
    { from: "#20303a", via: "#2c4550", to: "#151f26", ink: "#f3efe4" },
    { from: "#33262a", via: "#4a3439", to: "#21171a", ink: "#f7efe9" },
    { from: "#1d2c2a", via: "#2b423e", to: "#121d1b", ink: "#f1efe6" },
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return palettes[hash % palettes.length];
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function classLabel(year: number): string {
  return `Class of ${year}`;
}
