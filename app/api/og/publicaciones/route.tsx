import { ImageResponse } from "next/og";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { loadInterFonts } from "@/lib/og-fonts";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// The /publicaciones link card, in the section cards' frame
// (lib/og-section-card). Backed by a mosaic of the publications' own covers,
// public/og/publicaciones.jpg: a prebuilt JPG because the card renderer
// can't read the covers' .webp files. Rebuild it by hand if the covers change.
const { width: W, height: H } = SECTION_CARD;
const CACHE = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const GLYPHS = "Publicaciones sobre calidad del aire";

export async function GET(request: Request) {
  const [logo, fonts] = await Promise.all([loadOgLogo(request.url, ogLogoAt(65)), loadInterFonts(GLYPHS)]);
  const src = new URL("/og/publicaciones.jpg", request.url).toString();

  return new ImageResponse(
    (
      <SectionCard
        // eslint-disable-next-line @next/next/no-img-element
        backdrop={<img src={src} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />}
        headline={["Publicaciones", "sobre calidad", "del aire"]}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
