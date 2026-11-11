export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.82rem] font-medium text-navy">
          {label}
        </label>
        {optional && <span className="text-[0.72rem] text-charcoal/40">Optional</span>}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.78rem] text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.78rem] leading-relaxed text-charcoal/50">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-[0.875rem] leading-relaxed ${
        error ? "border-danger/30 bg-danger/[0.05] text-danger" : "border-green/30 bg-green/[0.06] text-green-deep"
      }`}
    >
      {error ?? success}
    </div>
  );
}
