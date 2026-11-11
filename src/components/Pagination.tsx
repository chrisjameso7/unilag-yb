import Link from "next/link";

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-ghost text-navy" rel="prev">← Previous</Link>
      ) : (
        <span />
      )}
      <span className="text-[0.8rem] text-charcoal/50">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="btn btn-ghost text-navy" rel="next">Next →</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
