import { ImageResponse } from "next/og";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import { getMarkerFillHex, getMarkerNumberInk } from "@/lib/air-quality";
import { loadInterFonts } from "@/lib/og-fonts";

// The /mapa link card: the metro on the map's own basemap, every live sensor
// drawn as /mapa draws it (fill by level, white ring, the reading inside,
// official stations on top with the gray Landmark badge, gray when silent),
// the white logo top-left, no text (the chat app prints the title and
// description under the image). Redesigned 2026-10-24 with the other section
// cards (picture only, logo top-left).
//
// The base is a static render of the self-hosted basemap
// (public/og/mapa-basemap-card.png, 1200x630 at CENTER/ZOOM, which frames
// the metro to the north-east of downtown). Regenerate it when the basemap's
// style or extract changes, or CENTER / ZOOM / the card size do: render
// basemapStyle() (components/mapa/basemap.ts) in MapLibre at 1200x630,
// CENTER, ZOOM, pixelRatio 1, wait for "idle", screenshot, quantize to 256
// colors. The markers are placed here with the Web Mercator projection.
const W = 1200;
const H = 630;
const CENTER: [number, number] = [-100.283842, 25.707098];
const ZOOM = 11.0704;
// /mapa's marker at this card's scale: ~1200px shown ~330px wide in a chat.
const R = 17;
const NODATA_FILL = "#a6a09b";
const CACHE = "public, max-age=0, s-maxage=900, stale-while-revalidate=3600";

// MapLibre uses 512px tiles.
function project(lon: number, lat: number) {
  const world = 512 * 2 ** ZOOM;
  const x = ((lon + 180) / 360) * world;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
  return { x, y };
}

type Reading = { sensor_id: number | string; pm25: number | null };
type Sensor = { sensor_id: number | string; lat: number; lon: number };

export async function GET(request: Request) {
  const base = new URL("/og/mapa-basemap-card.png", request.url).href;
  const logo = new URL("/og/occamm-logo-white.png", request.url).href;

  const [pa, paData, sima, simaData, fonts] = await Promise.all([
    PurpleAirSensors().catch(() => []),
    PurpleAirData().catch(() => []),
    SimaSensors().catch(() => []),
    SimaData().catch(() => []),
    loadInterFonts("0123456789 Protomaps © OpenStreetMap"),
  ]);

  // Each sensor's latest live reading (lib/live-readings.ts). A citizen
  // sensor without one isn't drawn; an official station stays as a gray disc,
  // as on /mapa.
  const latest = new Map<string, Reading>(
    [...(paData as Reading[]), ...(simaData as Reading[])].map((r) => [String(r.sensor_id), r]),
  );
  const simaIds = new Set((sima as Sensor[]).map((s) => String(s.sensor_id)));
  const c = project(...CENTER);
  const dots = [...(pa as Sensor[]), ...(sima as Sensor[])]
    .map((s) => {
      const pm25 = latest.get(String(s.sensor_id))?.pm25 ?? null;
      const isSima = simaIds.has(String(s.sensor_id));
      const p = project(s.lon, s.lat);
      return {
        fill: pm25 != null ? getMarkerFillHex(pm25) : isSima ? NODATA_FILL : null,
        ink: pm25 != null ? getMarkerNumberInk(pm25) : "#171717",
        label: pm25 != null ? String(Math.round(pm25)) : "",
        nodata: pm25 == null,
        isSima,
        x: p.x - c.x + W / 2,
        y: p.y - c.y + H / 2,
      };
    })
    .filter((d) => d.fill && d.x > -R && d.x < W + R && d.y > -R && d.y < H + R)
    // Official stations on top, then north to south: provenance and
    // position only, never the reading.
    .sort((a, b) => Number(a.isSima) - Number(b.isSima) || a.y - b.y);

  // A number only on a disc nothing is drawn over, and not where it would
  // collide with a number already placed (/mapa's label collision).
  const covered = (i: number) =>
    dots.some((q, j) => j > i && Math.hypot(q.x - dots[i].x, q.y - dots[i].y) < R * 1.3);
  const placed: { x: number; y: number }[] = [];
  const labels = dots
    .filter((d, i) => d.label && !covered(i))
    .reverse()
    .filter((d) => {
      if (placed.some((q) => Math.abs(q.x - d.x) < R * 1.9 && Math.abs(q.y - d.y) < R * 1.5)) return false;
      placed.push(d);
      return true;
    });

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: W, height: H, fontFamily: "Inter" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={base} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        {/* One SVG for every disc and badge: ~150 positioned divs took Satori
            past the function's time limit. Only the numbers are divs (Satori
            can't draw SVG text). */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={R}
              fill={d.fill as string}
              fillOpacity={d.nodata ? 0.5 : 0.92}
              stroke="#ffffff"
              strokeOpacity={d.nodata ? 0.65 : 0.95}
              strokeWidth={2}
            />
          ))}
          {dots
            .filter((d) => d.isSima)
            .map((d, i) => (
              <g key={`b${i}`} transform={`translate(${d.x + R * 0.95} ${d.y - R * 0.95})`}>
                <circle r={10.5} fill="#ffffff" />
                <circle r={9} fill="#737373" />
                <g transform="scale(0.5) translate(-12 -12)">
                  <path d="M12 2.5 L20 7 L4 7 Z" fill="#ffffff" />
                  <path
                    d="M4 21.5 L20 21.5 M7 17.5 L7 11 M12 17.5 L12 11 M17 17.5 L17 11"
                    stroke="#ffffff"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                </g>
              </g>
            ))}
        </svg>
        {labels.map((d, i) => (
          <div
            key={`l${i}`}
            style={{
              position: "absolute",
              left: d.x - R,
              top: d.y - R,
              width: R * 2,
              height: R * 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 600,
              color: d.ink,
            }}
          >
            {d.label}
          </div>
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={238} height={44} alt="" style={{ position: "absolute", left: 56, top: 48 }} />
        {/* The basemap's license asks for this credit on the map. */}
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 8,
            display: "flex",
            fontSize: 12,
            color: "#525252",
            background: "rgba(255,255,255,0.8)",
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          Protomaps © OpenStreetMap
        </div>
      </div>
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
