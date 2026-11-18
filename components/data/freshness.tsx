// How current the reading on screen is: a colour dot plus the reading's
// time (blue when fresh: green read as the "Buena" level). Three states,
// because a dot that is only ever one colour cannot tell
// you anything — and the timestamp, not the colour, is what actually carries
// the state. The value itself (floored hour, day label past today, status
// bucket) is computed in mapa-sensors.tsx where the sensor data lives.
// "nodata": the station on screen has no live reading (the site's 90-minute
// cutoff, lib/live-readings.ts); there is no time to show ("No disponible", the same
// words as the card's headline).
export type Freshness =
  | { dateTime: string; when: string; status: "fresh" | "delayed" }
  | { status: "nodata" };

// `color`: a fresh dot in that colour instead of blue (the level card's foot
// uses the current level's colour, 2026-11-05).
export function FreshnessDot({ status, color }: { status: Freshness["status"]; color?: string }) {
  // Late and missing share the grey: the time (or "No disponible") beside
  // the dot tells them apart.
  const fresh = status === "fresh";
  const dot = fresh ? (color ? "" : "bg-blue-500") : "bg-stone-400";
  const fill = fresh && color ? { backgroundColor: color } : undefined;

  return (
    <span aria-hidden="true" className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
      {/* Only fresh data pulses. A dot that keeps ticking in grey
          reads as "working on it" when the truth is "this is late". */}
      {status === "fresh" && (
        <span
          className={`absolute h-2 w-2 animate-ping rounded-full opacity-75 motion-reduce:animate-none ${color ? "" : "bg-blue-400"}`}
          style={fill}
        />
      )}
      <span className={`relative h-2 w-2 rounded-full ${dot}`} style={fill} />
    </span>
  );
}


// The mobile map's status pill (back 2026-11-17), beside the Fuente button:
// the dot and the reading's time in a small glass pill, shadowless so it
// reads as a quiet status line rather than a control. The time is the
// information; screen readers still hear "Actualizado". `color`: the dot in
// the current level's colour, like the level card's foot (2026-11-17).
export function FreshnessBadge({ freshness, color }: { freshness: Freshness; color?: string }) {
  return (
    <div className="glass flex h-7 flex-shrink-0 items-center gap-1.5 rounded-xl px-2.5 shadow-none">
      <FreshnessDot status={freshness.status} color={color} />
      {freshness.status === "nodata" ? (
        <span className="whitespace-nowrap text-[11px] font-medium text-neutral-700">No disponible</span>
      ) : (
        <span className="whitespace-nowrap text-[11px] text-neutral-500">
          <span className="sr-only">Actualizado </span>
          <time dateTime={freshness.dateTime} className="font-medium text-neutral-700">
            {freshness.when}
          </time>
        </span>
      )}
    </div>
  );
}
