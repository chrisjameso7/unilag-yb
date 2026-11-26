import { ImageResponse } from "next/og";
import { BRAND, logoMark } from "@/components/LogoMark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "UNILAG Yearbook — Your years. Your people. Your story.";

/** Default share image for every page that doesn't define its own (student pages do). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: BRAND.navy,
          color: BRAND.ivory,
        }}
      >
        {logoMark({ size: 220, light: true })}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 110, lineHeight: 1 }}>UNILAG</div>
          <div style={{ fontSize: 26, letterSpacing: 12, color: BRAND.greenOnDark }}>YEARBOOK</div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.65 }}>Your years. Your people. Your story.</div>
      </div>
    ),
    size,
  );
}
