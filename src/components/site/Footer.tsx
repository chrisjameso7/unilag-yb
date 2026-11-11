import Link from "next/link";
import { Wordmark } from "./Header";

const COLUMNS = [
  {
    title: "The yearbook",
    links: [
      { href: "/students", label: "Students" },
      { href: "/classes", label: "Classes" },
      { href: "/faces-of-the-year", label: "Faces of the Year" },
    ],
  },
  {
    title: "Your page",
    links: [
      { href: "/join", label: "Join the Yearbook" },
      { href: "/dashboard", label: "My Page" },
      { href: "/portrait-guide", label: "Portrait guide" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About the yearbook" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy text-ivory">
      <div className="container-page safe-bottom grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Wordmark light />
          <p className="mt-4 max-w-xs text-[0.875rem] leading-relaxed text-ivory/60">
            Your years. Your people. Your story.
          </p>
          <p className="mt-6 max-w-xs text-[0.75rem] leading-relaxed text-ivory/40">
            An independent project. Not an official publication of, or endorsed by, the University of Lagos.{" "}
            <a href="https://unilag.edu.ng" className="underline underline-offset-4 hover:text-ivory" rel="noopener noreferrer">
              unilag.edu.ng
            </a>
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="eyebrow text-ivory/40">{col.title}</p>
            <ul className="mt-4 space-y-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-block py-1.5 text-[0.9rem] text-ivory/75 hover:text-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
