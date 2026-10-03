import type { ReactNode } from "react";
import { ogLogoAt } from "@/lib/og-logo";

// The 65px file, the largest pre-shrunk logo: ~18px tall in a phone preview.
const LOGO = ogLogoAt(65);

// The shared frame of the section link cards (Inicio, Mapa, Datos): a
// full-bleed backdrop showing what the link opens, a white wash on the left
// fading into it, one big headline over the wash, and the logo as a
// signature in the bottom-left corner. Nothing smaller: a chat preview shows
// this at ~330px wide, where anything under ~50px tall here is unreadable,
// and the app prints the title and description under the image anyway.
// Each route draws only its backdrop and headline. 1200x630.
export const SECTION_CARD = { width: 1200, height: 630 };

export function SectionCard({
  backdrop,
  headline,
  logo,
}: {
  backdrop: ReactNode;
  headline: string[];
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
          width: 680,
          height: H,
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.9) 55%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 0,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontSize: 76,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.04,
          letterSpacing: -2,
        }}
      >
        {headline.map((l) => (
          <div key={l} style={{ display: "flex" }}>
            {l}
          </div>
        ))}
      </div>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={LOGO.width} height={LOGO.height} alt="" style={{ position: "absolute", left: 64, bottom: 40 }} />
      ) : null}
    </div>
  );
}
