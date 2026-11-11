import Link from "next/link";
import { Portrait } from "./Portrait";
import type { PublicProfile } from "@/lib/queries";

/** Student card (plan §4.2): portrait, name, faculty, department, years. No metrics. */
export function ProfileCard({ profile, priority = false }: { profile: PublicProfile; priority?: boolean }) {
  return (
    <Link href={`/student/${profile.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-navy">
        <Portrait
          name={profile.fullName}
          src={profile.portraitPath}
          seed={profile.slug}
          year={profile.graduationYear}
          priority={priority}
          className="transition-transform duration-700 group-hover:scale-[1.03]"
        />
        {profile.isDemo && (
          <span className="eyebrow absolute right-2 top-2 rounded-full bg-ivory/90 px-2 py-1 text-[0.55rem] text-navy">Demo</span>
        )}
      </div>
      <p className="display mt-3 text-[1.2rem] leading-tight text-navy group-hover:text-green sm:text-[1.35rem]">{profile.fullName}</p>
      <p className="mt-1 line-clamp-1 text-[0.78rem] text-charcoal/60">{profile.departmentName}</p>
      <p className="text-[0.72rem] text-charcoal/45">
        {profile.facultyName} · {profile.admissionYear}–{profile.graduationYear}
      </p>
    </Link>
  );
}

export function ProfileGrid({ profiles }: { profiles: PublicProfile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {profiles.map((profile, i) => (
        <li key={profile.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProfileCard profile={profile} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
