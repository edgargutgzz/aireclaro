import Link from "next/link";
import { getMarkerFillHex } from "@/lib/air-quality";
import { fetchEstaciones } from "@/lib/datos-cache";
import { getLiveStations, horaDeLectura } from "@/lib/home-air";
import TickerTrack, { type TickerItem } from "./ticker-track";

// The homepage's live ticker under the navbar (app/@strip), only about the
// live stations (the map): every official metro station's PM2.5 this hour,
// dot in the map marker's color, worst first, scrolling, each linking to its
// station on the map; the label links to the map too. Hidden
// entirely when no station has a fresh reading.

// Inset ring, square: the links are full-height sections of a straight strip.
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15";

export default async function Ticker() {
  const [stations, estaciones] = await Promise.all([
    getLiveStations().catch(() => []),
    fetchEstaciones().catch(() => []),
  ]);
  if (stations.length === 0) return null;

  const nombres = new Map(estaciones.map((e) => [e.sensorId, e.nombre]));
  const items: TickerItem[] = [...stations]
    .sort((a, b) => b.pm25 - a.pm25)
    .map((s) => ({
      id: s.sensorId,
      nombre: nombres.get(s.sensorId) ?? s.sensorId,
      pm25: s.pm25,
      color: getMarkerFillHex(s.pm25) ?? "#d1d5db",
    }));

  return (
    <section aria-label="PM2.5 por estación oficial, en vivo" className="flex h-10 items-stretch bg-white text-[13px]">
      <Link
        href="/mapa"
        className={`flex shrink-0 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 lg:px-8 ${FOCUS}`}
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#00e400] opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00a400]" />
        </span>
        En vivo · {horaDeLectura(stations)}
      </Link>
      <TickerTrack items={items} />
    </section>
  );
}
