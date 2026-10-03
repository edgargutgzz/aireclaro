import { ImageResponse } from "next/og";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { loadInterFonts } from "@/lib/og-fonts";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// The homepage link card, in the section cards' frame (lib/og-section-card).
// Backed by the homepage's clear-day photo (public/home/banner.jpeg).
const { width: W, height: H } = SECTION_CARD;
const CACHE = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const GLYPHS =
  "Observatorio ciudadano Trabajamos por una mejor calidad del aire. Mapa en tiempo real y datos abiertos de la Zona Metropolitana de Monterrey observatoriodelaire.com";

export async function GET(request: Request) {
  const [logo, fonts] = await Promise.all([loadOgLogo(request.url, ogLogoAt(65)), loadInterFonts(GLYPHS)]);
  const backdrop = photo(request.url);

  return new ImageResponse(
    (
      <SectionCard
        backdrop={backdrop}
        headline={["Trabajamos por", "una mejor calidad", "del aire."]}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}

function photo(requestUrl: string) {
  const src = new URL("/home/banner.jpeg", requestUrl).toString();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={W} height={675} alt="" style={{ position: "absolute", left: 0, top: -30 }} />
  );
}
