import Link from "next/link";

export function AdminHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-navy/10 pb-6 md:flex-row md:items-end">
      <div>
        <p className="eyebrow text-charcoal/40">{eyebrow}</p>
        <h1 className="mt-3 display text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.02] tracking-[-0.02em]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-charcoal/50">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "ink",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "ink" | "green" | "warn";
  href?: string;
}) {
  const content = (
    <div className="border border-navy/15 bg-paper p-5 transition-colors hover:border-navy/30">
      <p className="text-[9.5px] uppercase tracking-[0.14em] text-charcoal/40">{label}</p>
      <p
        className={`mt-2 display text-[2rem] leading-none ${
          tone === "green" ? "text-green" : tone === "warn" ? "text-[#8a6d10]" : "text-navy"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[10.5px] leading-relaxed text-charcoal/40">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

const TONES: Record<string, string> = {
  published: "border-green/30 bg-green/[0.06] text-green-deep",
  verified: "border-green/30 bg-green/[0.06] text-green-deep",
  succeeded: "border-green/30 bg-green/[0.06] text-green-deep",
  approved: "border-green/30 bg-green/[0.06] text-green-deep",
  pending: "border-[#C9A227]/40 bg-[#C9A227]/[0.08] text-[#7d6410]",
  initialized: "border-navy/20 bg-navy/[0.03] text-charcoal/55",
  draft: "border-navy/20 bg-navy/[0.03] text-charcoal/55",
  rejected: "border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] text-[#9b2c2c]",
  failed: "border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] text-[#9b2c2c]",
  suspended: "border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] text-[#9b2c2c]",
  removed: "border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] text-[#9b2c2c]",
  open: "border-[#C9A227]/40 bg-[#C9A227]/[0.08] text-[#7d6410]",
  refunded: "border-navy/20 bg-navy/[0.03] text-charcoal/55",
  none: "border-navy/20 bg-navy/[0.03] text-charcoal/50",
};

export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${
        TONES[status] ?? TONES.none
      }`}
    >
      {label ?? status.replace("_", " ")}
    </span>
  );
}

export function AdminEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-navy/20 px-6 py-12 text-center">
      <p className="display text-[1.5rem] leading-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-charcoal/45">{body}</p>
    </div>
  );
}
