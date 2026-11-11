import { ImageResponse } from "next/og";
import { getPublicProfileBySlug } from "@/lib/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "UNILAG Yearbook profile";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await getPublicProfileBySlug((await params).slug);
  const name = profile?.fullName ?? "UNILAG Yearbook";
  const line = profile ? `${profile.departmentName} · Class of ${profile.graduationYear}` : "Your years. Your people. Your story.";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#101c35", color: "#f8f6f0", padding: 64, gap: 56 }}>
        {profile?.portraitPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.portraitPath} alt="" width={400} height={500} style={{ objectFit: "cover", borderRadius: 28 }} />
        ) : (
          <div style={{ width: 400, height: 500, borderRadius: 28, background: "#087b50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 150 }}>
            {name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, opacity: 0.6 }}>UNILAG YEARBOOK</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, lineHeight: 1.02 }}>{name}</div>
            <div style={{ fontSize: 30, marginTop: 24, opacity: 0.7 }}>{line}</div>
          </div>
          <div style={{ fontSize: 24, opacity: 0.5 }}>Your years. Your people. Your story.</div>
        </div>
      </div>
    ),
    size,
  );
}
