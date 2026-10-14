import { ImageResponse } from "next/og";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import { getMarkerFillHex } from "@/lib/air-quality";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";
import { loadInterFonts } from "@/lib/og-fonts";

// The /mapa link card: the metro area on the map's own basemap, with every
// sensor reporting in the last few hours drawn as a disc in its marker color
// -- a still of what the link opens. The base is a static render of the
// self-hosted basemap (public/og/mapa-basemap.png, 1200x630, centered on
// CENTER at ZOOM); the discs are placed here with the Web Mercator projection
// so they can take the map's own marker treatment.
//
// Regenerate the PNG when the basemap's style or extract changes, or CENTER /
// ZOOM / the card size do: render basemapStyle() (components/mapa/basemap.ts)
// in MapLibre at 1200x630, CENTER, ZOOM, wait for "idle", screenshot, and
// quantize to 256 colors.
const { width: W, height: H } = SECTION_CARD;
// Centered west of the metro so the metro sits right of the text panel.
const CENTER: [number, number] = [-100.45, 25.69];
const ZOOM = 10;
const CACHE = "public, max-age=0, s-maxage=900, stale-while-revalidate=3600";
const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑ .,:/()%μg³ observatoriodelaire.com SIMA";

// MapLibre uses 512px tiles.
function project(lon: number, lat: number) {
  const world = 512 * 2 ** ZOOM;
  const x = ((lon + 180) / 360) * world;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
  return { x, y };
}

type Reading = { sensor_id: number | string; pm25: number | null; time_stamp: string };
type Sensor = { sensor_id: number | string; lat: number; lon: number };

export async function GET(request: Request) {
  const base = new URL("/og/mapa-basemap.png", request.url).href;

  const [pa, paData, sima, simaData, logo, fonts] = await Promise.all([
    PurpleAirSensors().catch(() => []),
    PurpleAirData().catch(() => []),
    SimaSensors().catch(() => []),
    SimaData().catch(() => []),
    loadOgLogo(request.url, ogLogoAt(65)),
    loadInterFonts(GLYPHS),
  ]);

  // Each sensor's latest live reading (lib/live-readings.ts), so anything
  // missing or old simply isn't drawn.
  const latest = new Map<string, Reading>(
    [...(paData as Reading[]), ...(simaData as Reading[])].map((r) => [String(r.sensor_id), r]),
  );
  const c = project(...CENTER);
  const dots = [...(pa as Sensor[]), ...(sima as Sensor[])]
    .map((s) => {
      const r = latest.get(String(s.sensor_id));
      const fill = r ? getMarkerFillHex(r.pm25) : null;
      const p = project(s.lon, s.lat);
      return { fill, x: p.x - c.x + W / 2, y: p.y - c.y + H / 2 };
    })
    .filter((d) => d.fill && d.x > 8 && d.x < W - 8 && d.y > 8 && d.y < H - 8);

  const R = 8;
  return new ImageResponse(
    (
      <SectionCard
        backdrop={
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
            {/* One SVG for every disc: ~130 positioned divs with borders and
                shadows took Satori past the function's time limit. A faint
                offset circle under each stands in for the drop shadow. */}
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
              {dots.map((d, i) => (
                <circle key={`s${i}`} cx={d.x} cy={d.y + 1.5} r={R + 2} fill="#0f172a" fillOpacity={0.18} />
              ))}
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={R} fill={d.fill as string} stroke="#ffffff" strokeWidth={2.5} />
              ))}
            </svg>
          </>
        }
        headline={["Mapa de", "calidad del aire"]}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
