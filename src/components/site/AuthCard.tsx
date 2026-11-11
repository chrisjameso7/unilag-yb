import Link from "next/link";
import { Wordmark } from "./Header";

/** Focused, distraction-free layout for sign-in screens. Mobile: full-width; desktop: centred card. */
export function AuthCard({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <div className="container-page flex h-16 items-center justify-between">
        <Wordmark />
        <Link href="/" className="text-[0.85rem] text-charcoal/55 hover:text-navy">Back to site</Link>
      </div>
      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center">
        <div className="w-full max-w-md sm:rounded-[1.25rem] sm:border sm:border-navy/10 sm:bg-paper sm:p-8">
          <p className="eyebrow text-green">{eyebrow}</p>
          <h1 className="display mt-3 text-[2.6rem] text-navy">{title}</h1>
          {intro && <p className="mt-3 text-[0.92rem] leading-relaxed text-charcoal/60">{intro}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
