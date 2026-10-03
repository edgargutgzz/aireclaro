import { ImageResponse } from "next/og";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import { getMarkerFillHex } from "@/lib/air-quality";
import { monterreyNaiveHoursAgo } from "@/lib/monterrey-time";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";
import { loadInterFonts } from "@/lib/og-fonts";

// The /mapa link card: the metro area on the same Mapbox light style the map
// uses, with every sensor reporting in the last few hours drawn as a disc in
// its marker color -- a still of what the link opens. Mapbox's static image
// is the base; the discs are placed here with the Web Mercator projection so
// they can take the map's own marker treatment.
const { width: W, height: H } = SECTION_CARD;
// Centered west of the metro so the metro sits right of the text panel.
const CENTER: [number, number] = [-100.45, 25.69];
const ZOOM = 10;
const FRESH_HOURS = 3;
const CACHE = "public, max-age=0, s-maxage=900, stale-while-revalidate=3600";
const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑ .,:/()%μg³ observatoriodelaire.com SIMA";

// Mapbox static images use 512px tiles.
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
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const base = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${CENTER[0]},${CENTER[1]},${ZOOM},0/${W}x${H}?access_token=${token}`;

  const [pa, paData, sima, simaData, logo, fonts] = await Promise.all([
    PurpleAirSensors().catch(() => []),
    PurpleAirData().catch(() => []),
    SimaSensors().catch(() => []),
    SimaData().catch(() => []),
    loadOgLogo(request.url, ogLogoAt(65)),
    loadInterFonts(GLYPHS),
  ]);

  // time_stamp is naive Monterrey wall-clock, so the cutoff is built in the
  // same naive terms (the server runs in UTC; a Date comparison would read
  // every reading as six hours old and drop them all).
  const cutoff = monterreyNaiveHoursAgo(FRESH_HOURS);
  const latest = new Map<string, Reading>();
  for (const r of [...(paData as Reading[]), ...(simaData as Reading[])]) {
    if (!latest.has(String(r.sensor_id))) latest.set(String(r.sensor_id), r);
  }
  const c = project(...CENTER);
  const dots = [...(pa as Sensor[]), ...(sima as Sensor[])]
    .map((s) => {
      const r = latest.get(String(s.sensor_id));
      const fill = r && r.time_stamp >= cutoff ? getMarkerFillHex(r.pm25) : null;
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
            {dots.map((d, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: d.x - R,
                  top: d.y - R,
                  width: R * 2,
                  height: R * 2,
                  borderRadius: R,
                  background: d.fill as string,
                  border: "2.5px solid #ffffff",
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.35)",
                }}
              />
            ))}
          </>
        }
        headline={["Mapa de", "calidad del aire"]}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
