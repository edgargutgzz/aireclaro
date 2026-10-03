import type { ReactNode } from "react";
import { OG_LOGO } from "@/lib/og-logo";

// The shared frame of the section link cards (Inicio, Mapa, Datos): a
// full-bleed backdrop showing what the link opens, a white wash on the left
// fading into it, the section's eyebrow + name + one supporting line over the
// wash, and the logo as a signature in the bottom-left corner. Each route
// draws only its backdrop and words. 1200x630, the link-preview size.
export const SECTION_CARD = { width: 1200, height: 630 };

export function SectionCard({
  backdrop,
  eyebrow,
  accent,
  marker = "dot",
  headline,
  lines,
  logo,
}: {
  backdrop: ReactNode;
  eyebrow: string;
  accent: string;
  marker?: "dot" | "square";
  headline: string[];
  lines: string[];
  logo: string | null;
}) {
  const { width: W, height: H } = SECTION_CARD;
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: "#ffffff", fontFamily: "Inter" }}>
      {backdrop}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 600,
          height: H,
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.9) 55%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 64, top: 0, height: H, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 600, color: accent }}>
          <div style={{ display: "flex", width: 12, height: 12, borderRadius: marker === "dot" ? 6 : 3, background: accent }} />
          {eyebrow}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 58, fontWeight: 700, color: "#111827", lineHeight: 1.05, letterSpacing: -1.5 }}>
          {headline.map((l) => (
            <div key={l} style={{ display: "flex" }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 22, color: "#4b5563", lineHeight: 1.35 }}>
          {lines.map((l) => (
            <div key={l} style={{ display: "flex" }}>
              {l}
            </div>
          ))}
        </div>
      </div>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={OG_LOGO.width} height={OG_LOGO.height} alt="" style={{ position: "absolute", left: 64, bottom: 44 }} />
      ) : null}
    </div>
  );
}
