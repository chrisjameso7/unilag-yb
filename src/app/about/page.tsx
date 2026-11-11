import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { contactEmail, operatorName } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Why the UNILAG Yearbook exists, how verification and preservation work, and who runs it.",
  alternates: { canonical: "/about" },
};

const SECTIONS = [
  ["What the yearbook is", "A permanent digital archive of the people of the University of Lagos. Every verified student can create a page — a portrait, their faculty and department, the years they were here and a line about themselves — and find the people they shared those years with."],
  ["Why it exists", "People spend years at university, then move on, and the people who shared those years become harder to find. The yearbook keeps a simple record that they were here. It is not about making anyone famous: there are no likes, followers or rankings."],
  ["How verification works", "Every page belongs to a real UNILAG student. Students upload a photo of their student ID, which a reviewer checks and then deletes. We never ask for university portal passwords, and a matriculation number alone is never treated as proof."],
  ["How pages are preserved", "Pages stay in the archive after graduation, and graduates keep the ability to edit them without paying again. We keep automated and independent backups and a documented recovery process. We treat preservation as a long-term commitment we plan and pay for — not as an impossible guarantee."],
  ["Faces of the Year", "Our annual editorial collection, chosen by editors for range across faculties, departments and generations. It is optional and free, never voted on and never paid for, and nothing is published without the student's approval."],
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="bg-navy text-ivory">
        <div className="container-page py-14 md:py-24">
          <p className="eyebrow text-ivory/50">About</p>
          <h1 className="display mt-4 max-w-[15ch] text-[clamp(2.8rem,10vw,5.8rem)]">Somewhere in the story of UNILAG, there&apos;s you.</h1>
          <div className="mt-8 max-w-xl space-y-4 text-[1.02rem] leading-relaxed text-ivory/72">
            <p>Every year, thousands of people walk through the gates of the University of Lagos. They make friends, miss lectures, discover themselves, fall in love, create memories and eventually move on.</p>
            <p>But the years pass, and memories become harder to find.</p>
            <p>The UNILAG Yearbook exists to preserve a little piece of those years. A place for the people who were here, the generations they belonged to and the stories they leave behind.</p>
            <p className="display text-[1.6rem] text-ivory">Your years. Your people. Your story.</p>
          </div>
        </div>
      </section>

      <section className="container-page max-w-3xl py-14 md:py-20">
        <dl className="space-y-10">
          {SECTIONS.map(([title, body]) => (
            <div key={title}>
              <dt className="display text-[1.8rem] text-navy">{title}</dt>
              <dd className="mt-3 text-[0.98rem] leading-relaxed text-charcoal/70">{body}</dd>
            </div>
          ))}
          <div>
            <dt className="display text-[1.8rem] text-navy">Who runs it</dt>
            <dd className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-charcoal/70">
              <p>The UNILAG Yearbook is operated independently by {operatorName()}. It is <strong className="font-medium text-navy">not an official publication of the University of Lagos</strong> and is not endorsed by the university. We don&apos;t use the university crest or official materials without permission.</p>
              <p>
                For official institutional information, visit{" "}
                <a href="https://unilag.edu.ng" className="link" rel="noopener noreferrer">unilag.edu.ng</a>. To reach us, email{" "}
                <a href={`mailto:${contactEmail()}`} className="link">{contactEmail()}</a>.
              </p>
            </dd>
          </div>
        </dl>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link href="/join" className="btn btn-primary">Join the Yearbook</Link>
          <Link href="/students" className="btn btn-ghost text-navy">Explore the Yearbook</Link>
        </div>
      </section>
    </SiteShell>
  );
}
