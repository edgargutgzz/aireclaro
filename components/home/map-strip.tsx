import { ChevronRight } from "lucide-react";
import { getMarkerFillHex } from "@/lib/air-quality";
import type { Data, Sensor } from "@/components/mapa/types";

// The homepage level card's map preview (2026-11-12, option E of the "ver
// más" mockups): a strip of the map's own basemap with every live sensor as
// a disc in its level's colour, and a "Ver el mapa" pill. It says the card
// opens the map and shows what is there. The discs are the live readings,
// never decoration.
//
// The base is public/home/mapa-franja.webp, a WebP copy of the /mapa link
// card's basemap render (public/og/mapa-basemap-card.png, 1200x630 at the
// CENTER / ZOOM below; app/api/og/mapa/route.tsx says how to regenerate it).
// Regenerate both together. The strip is an SVG in the image's own
// coordinates, cropped to the strip with `slice`, so the discs stay on their
// streets at any width.
const W = 1200;
const H = 630;
const CENTER: [number, number] = [-100.283842, 25.707098];
const ZOOM = 11.0704;
// Larger than the link card's 17: the strip shows the image at a third to a
// half of its size.
const R = 22;
const NODATA_FILL = "#a6a09b";

export type StripDot = { x: number; y: number; fill: string; nodata: boolean };

// MapLibre uses 512px tiles.
function project(lon: number, lat: number) {
  const world = 512 * 2 ** ZOOM;
  const x = ((lon + 180) / 360) * world;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
  return { x, y };
}

// Every sensor as /mapa draws it: a citizen sensor without a live reading
// isn't drawn, an official station without one is a gray disc. Official
// stations on top, then north to south: provenance and position only, never
// the reading.
export function stripDots(sensors: Sensor[], data: Data[]): StripDot[] {
  const latest = new Map(data.map((r) => [String(r.sensor_id), r.pm25]));
  const c = project(...CENTER);
  return sensors
    .map((s) => {
      const pm25 = latest.get(String(s.sensor_id)) ?? null;
      const isSima = s.source === "sima";
      const p = project(s.lon, s.lat);
      const fill = pm25 != null ? getMarkerFillHex(pm25) : isSima ? NODATA_FILL : null;
      return { x: p.x - c.x + W / 2, y: p.y - c.y + H / 2, fill, nodata: pm25 == null, isSima };
    })
    .filter((d): d is typeof d & { fill: string } => !!d.fill && d.x > -R && d.x < W + R && d.y > -R && d.y < H + R)
    .sort((a, b) => Number(a.isSima) - Number(b.isSima) || a.y - b.y)
    .map(({ x, y, fill, nodata }) => ({ x: Math.round(x), y: Math.round(y), fill, nodata }));
}

export function MapStrip({ dots }: { dots: StripDot[] }) {
  return (
    <div className="relative h-28 border-t border-stone-200 bg-stone-100">
      <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <image href="/home/mapa-franja.webp" width={W} height={H} />
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={R}
            fill={d.fill}
            fillOpacity={d.nodata ? 0.5 : 0.92}
            stroke="#ffffff"
            strokeOpacity={d.nodata ? 0.65 : 0.95}
            strokeWidth={4}
          />
        ))}
      </svg>
      <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold leading-none text-neutral-900 shadow-sm">
        Ver el mapa
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </div>
  );
}
