import { ImageResponse } from "next/og";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { loadInterFonts } from "@/lib/og-fonts";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// The link cards of the sections without a live backdrop (Proyectos, Adopta
// un sensor, Quiénes somos), in the section cards' frame
// (lib/og-section-card). Each backdrop is a prebuilt JPG in public/og (the
// card renderer can't read .webp), made by hand from the page's own images:
// project photos, the adopt-a-sensor photo, team portraits. Rebuild it if
// those change.
const { width: W, height: H } = SECTION_CARD;
const CACHE = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";

const SECCIONES: Record<string, { backdrop: string; headline: string[] }> = {
  proyectos: { backdrop: "/og/proyectos.jpg", headline: ["Nuestros", "proyectos"] },
  "adopta-sensor": { backdrop: "/og/adopta-sensor.jpg", headline: ["Adopta un", "sensor"] },
  "quienes-somos": { backdrop: "/og/quienes-somos.jpg", headline: ["Quiénes", "somos"] },
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const seccion = SECCIONES[(await params).slug];
  if (!seccion) return new Response("Not found", { status: 404 });

  const [logo, fonts] = await Promise.all([
    loadOgLogo(request.url, ogLogoAt(65)),
    loadInterFonts(seccion.headline.join(" ")),
  ]);
  const src = new URL(seccion.backdrop, request.url).toString();

  return new ImageResponse(
    (
      <SectionCard
        // eslint-disable-next-line @next/next/no-img-element
        backdrop={<img src={src} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />}
        headline={seccion.headline}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
