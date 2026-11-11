import Image from "next/image";
import { initials, platePalette } from "@/lib/format";

/**
 * A yearbook plate. A student's uploaded portrait when there is one; otherwise a
 * typographic monogram — we never invent a photograph of a person.
 */
export function Portrait({
  name,
  src,
  seed,
  year,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  className = "",
}: {
  name: string;
  src?: string | null;
  seed: string;
  year?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <Image src={src} alt={`Portrait of ${name}`} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
    );
  }
  const p = platePalette(seed);
  return (
    <div
      role="img"
      aria-label={`Monogram plate for ${name}`}
      className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ background: `linear-gradient(150deg, ${p.from}, ${p.via} 50%, ${p.to})`, color: p.ink }}
    >
      <span className="display text-[clamp(2.5rem,9vw,5rem)] opacity-90">{initials(name)}</span>
      {year && (
        <span className="eyebrow absolute bottom-3 left-3 text-[0.6rem] opacity-55">Yearbook {year}</span>
      )}
      <span className="pointer-events-none absolute inset-2 rounded-[0.6rem] border border-current opacity-10" aria-hidden="true" />
    </div>
  );
}
