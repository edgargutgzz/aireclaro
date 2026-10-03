import { ImageResponse } from "next/og";
import { fetchCoberturaCompacta } from "@/components/datos/cobertura-estaciones";
import { BRAND_BLUE, COLOR_CUBIERTO, COLOR_CUBIERTO_FILL_OPACITY } from "@/lib/datos-colors";
import { loadOgLogo } from "@/lib/og-logo";
import { loadInterFonts } from "@/lib/og-fonts";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// The homepage link card, in the section cards' frame (lib/og-section-card).
// Backed by the homepage's clear-day photo; ?v=b is the alternative under
// review, the station-coverage calendar from /datos as a texture.
const { width: W, height: H } = SECTION_CARD;
const CACHE = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const GLYPHS =
  "Observatorio ciudadano Trabajamos por una mejor calidad del aire. Mapa en tiempo real y datos abiertos de la Zona Metropolitana de Monterrey observatoriodelaire.com";

export async function GET(request: Request) {
  const v = new URL(request.url).searchParams.get("v") === "b" ? "b" : "a";
  const [logo, fonts] = await Promise.all([loadOgLogo(request.url), loadInterFonts(GLYPHS)]);
  const backdrop = v === "a" ? photo(request.url) : await coverage();

  return new ImageResponse(
    (
      <SectionCard
        backdrop={backdrop}
        eyebrow="Observatorio ciudadano"
        accent={BRAND_BLUE}
        headline={["Trabajamos por", "una mejor calidad", "del aire."]}
        lines={["Mapa en tiempo real y datos abiertos de la", "Zona Metropolitana de Monterrey"]}
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

// Every station x pollutant as a row, the most recent days as columns: blue
// where the day has valid data, pale gray where it doesn't.
async function coverage() {
  const data = await fetchCoberturaCompacta().catch(() => null);
  if (!data) return null;
  const PITCH = 17;
  const CELL = 13;
  const rows = [...Object.values(data["PM2.5"].porEstacion), ...Object.values(data["PM10"].porEstacion)];
  const cols = Math.floor((W - 300) / PITCH);
  const top = Math.max(0, (H - rows.length * PITCH) / 2);
  const blue = mix(COLOR_CUBIERTO, COLOR_CUBIERTO_FILL_OPACITY);
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 300, top, gap: PITCH - CELL }}>
      {rows.map((codigo, r) => (
        <div key={r} style={{ display: "flex", gap: PITCH - CELL }}>
          {codigo
            .slice(-cols)
            .split("")
            .map((c, i) => (
              <div key={i} style={{ display: "flex", width: CELL, height: CELL, borderRadius: 3, background: c === "1" ? blue : "#eef0f3" }} />
            ))}
        </div>
      ))}
    </div>
  );
}

function mix(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (x: number) => Math.round(255 - (255 - x) * alpha);
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}
