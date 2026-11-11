export function PageHero({
  eyebrow,
  title,
  children,
  dark = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={dark ? "bg-navy text-ivory" : "bg-ivory text-navy"}>
      <div className="container-page py-12 md:py-20">
        <p className={`eyebrow ${dark ? "text-ivory/50" : "text-navy/50"}`}>{eyebrow}</p>
        <h1 className="display mt-4 max-w-[16ch] text-[clamp(2.6rem,9vw,5.5rem)]">{title}</h1>
        {children && <div className={`mt-6 max-w-xl text-[1rem] leading-relaxed ${dark ? "text-ivory/70" : "text-charcoal/70"}`}>{children}</div>}
      </div>
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="display text-[1.6rem] text-navy">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-sm text-[0.9rem] leading-relaxed text-charcoal/60">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "border-navy/15 bg-paper text-charcoal/75",
    success: "border-green/30 bg-green/[0.06] text-green-deep",
    error: "border-danger/30 bg-danger/[0.05] text-danger",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-[0.875rem] leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}
