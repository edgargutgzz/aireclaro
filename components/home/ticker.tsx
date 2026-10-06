import Link from "next/link";
import { getMarkerFillHex } from "@/lib/air-quality";
import { fetchEstaciones } from "@/lib/datos-cache";
import { getLiveStations, horaDeLectura } from "@/lib/home-air";
import TickerTrack, { type TickerItem } from "./ticker-track";

// The homepage's live ticker under the navbar (app/@strip), only about the
// live stations (the map): every official metro station's PM2.5 this hour,
// dot in the map marker's color, worst first, scrolling, each linking to its
// station on the map; the label links to the map too. A station with no
// fresh reading stays in the strip as a gray "sin datos", and if none has one
// the label says so.

// Inset ring, square: the links are full-height sections of a straight strip.
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15";

export default async function Ticker() {
  const [stations, estaciones] = await Promise.all([
    getLiveStations().catch(() => []),
    fetchEstaciones().catch(() => []),
  ]);
  if (estaciones.length === 0) return null;

  // Every metro station, always: one without a reading from the last 3 hours
  // shows as a gray "sin datos" dot, like its gray disc on the map, so a
  // network outage is visible instead of the strip going quiet. Stations with
  // data first, worst first; then the silent ones, by name.
  const lecturas = new Map(stations.map((s) => [s.sensorId, s.pm25]));
  const items: TickerItem[] = estaciones
    .map((e) => {
      const pm25 = lecturas.get(e.sensorId) ?? null;
      return { id: e.sensorId, nombre: e.nombre, pm25, color: pm25 === null ? null : getMarkerFillHex(pm25) };
    })
    .sort((a, b) =>
      a.pm25 === null || b.pm25 === null
        ? Number(a.pm25 === null) - Number(b.pm25 === null) || a.nombre.localeCompare(b.nombre, "es")
        : b.pm25 - a.pm25,
    );
  const hayDatos = stations.length > 0;

  return (
    <section aria-label="PM2.5 por estación oficial, en vivo" className="flex h-10 items-stretch bg-white text-[13px]">
      <Link
        href="/mapa"
        className={`flex shrink-0 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 lg:px-8 ${FOCUS}`}
      >
        {hayDatos ? (
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#00e400] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00a400]" />
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden />
        )}
        En vivo · {hayDatos ? horaDeLectura(stations) : "sin datos"}
      </Link>
      <TickerTrack items={items} />
    </section>
  );
}
