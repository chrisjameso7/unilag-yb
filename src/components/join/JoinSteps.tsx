const STEPS = [
  { key: "verify", label: "Verify" },
  { key: "profile", label: "Profile" },
  { key: "preview", label: "Preview" },
  { key: "pay", label: "Pay" },
  { key: "live", label: "Live" },
] as const;

export type JoinStepKey = (typeof STEPS)[number]["key"];

/** Compact progress bar for the join flow — fits a phone screen without scrolling. */
export function JoinSteps({ current, done = [] }: { current: JoinStepKey; done?: JoinStepKey[] }) {
  const index = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Join progress" className="border-b border-navy/10 bg-paper">
      <ol className="container-page flex gap-1.5 py-3">
        {STEPS.map((step, i) => {
          const complete = done.includes(step.key) || i < index;
          const isCurrent = i === index;
          return (
            <li key={step.key} className="flex-1" aria-current={isCurrent ? "step" : undefined}>
              <span className={`block h-1 rounded-full ${complete ? "bg-green" : isCurrent ? "bg-navy" : "bg-navy/12"}`} />
              <span className={`mt-1.5 block text-[0.68rem] ${isCurrent ? "font-medium text-navy" : "text-charcoal/45"}`}>
                {i + 1}. {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
