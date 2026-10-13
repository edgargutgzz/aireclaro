import Link from "next/link";
import { getMarkerFillHex } from "@/lib/air-quality";
import { fetchEstaciones } from "@/lib/datos-cache";
import { getLiveMunicipios, getLiveStations, horaDeLectura } from "@/lib/home-air";
import { SIMA_OUTAGE_MIN_SILENT } from "@/lib/sima-outage";
import TickerTrack, { type TickerItem } from "./ticker-track";

// The homepage's live ticker under the navbar (app/@strip), about the live
// readings on the map, one source at a time. The label doesn't name it: the
// strip always shows the best reading we have, and each entry opens its
// station or sensor on the map, where the source is shown.
// - official stations: every metro station's PM2.5 this hour, dot in the map
//   marker's color, worst first, each linking to its station on the map. A
//   station with no fresh reading stays in the strip as a gray "sin
//   actualizar".
// - citizen sensors, when the official network is out (the map's outage rule,
//   most stations silent; SINAICA's Nuevo León feed often arrives hours late):
//   one entry per municipality, the median of its sensors, worst first, each
//   linking to the sensor at that median on the map. Never
//   mixed with the stations: the two read differently, and low-cost sensors
//   usually read higher.
// With neither, the strip is hidden.

// Inset ring, square: the links are full-height sections of a straight strip.
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15";

export default async function Ticker() {
  const [stations, estaciones, municipios] = await Promise.all([
    getLiveStations().catch(() => []),
    fetchEstaciones().catch(() => []),
    getLiveMunicipios().catch(() => []),
  ]);
  const outage = estaciones.length === 0 || estaciones.length - stations.length >= SIMA_OUTAGE_MIN_SILENT;

  if (outage && municipios.length > 0) {
    const items: TickerItem[] = municipios
      .sort((a, b) => b.pm25 - a.pm25 || a.nombre.localeCompare(b.nombre, "es"))
      .map((m) => ({ id: m.key, href: `/mapa?sensor=${m.sensorId}`, nombre: m.nombre, pm25: m.pm25, color: getMarkerFillHex(m.pm25) }));
    return <Strip hora={horaDeLectura(municipios)} items={items} />;
  }
  // No station with a reading at all and no citizen sensor either: we're not
  // receiving data, which doesn't mean the air has no reading. Hide the strip
  // rather than fill it with gray. A partial gap still shows, station by
  // station.
  if (estaciones.length === 0 || stations.length === 0) return null;

  // Every metro station, always: one without a reading from the last 3 hours
  // shows as a gray "sin actualizar" dot, like its gray disc on the map, so a
  // gap is visible instead of the strip going quiet. Stations with data first,
  // worst first; then the silent ones, by name.
  const lecturas = new Map(stations.map((s) => [s.sensorId, s.pm25]));
  const items: TickerItem[] = estaciones
    .map((e) => {
      const pm25 = lecturas.get(e.sensorId) ?? null;
      return {
        id: e.sensorId,
        href: `/mapa?sensor=${e.sensorId}`,
        nombre: e.nombre,
        pm25,
        color: pm25 === null ? null : getMarkerFillHex(pm25),
      };
    })
    .sort((a, b) =>
      a.pm25 === null || b.pm25 === null
        ? Number(a.pm25 === null) - Number(b.pm25 === null) || a.nombre.localeCompare(b.nombre, "es")
        : b.pm25 - a.pm25,
    );

  return <Strip hora={horaDeLectura(stations)} items={items} />;
}

// The label, "En vivo · 7:00 PM"; phones have room for "En vivo" only.
function Strip({ hora, items }: { hora: string; items: TickerItem[] }) {
  return (
    <section aria-label="PM2.5 en vivo" className="flex h-10 items-stretch bg-white text-[13px]">
      <Link
        href="/mapa"
        className={`flex shrink-0 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 lg:px-8 ${FOCUS}`}
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#00e400] opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00a400]" />
        </span>
        <span className="sm:hidden">En vivo</span>
        <span className="hidden sm:inline">En vivo · {hora}</span>
      </Link>
      <TickerTrack items={items} />
    </section>
  );
}
