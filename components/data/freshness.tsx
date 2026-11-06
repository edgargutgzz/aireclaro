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

// The time is the information, shown beside the dot with no label (a bare
// colour cannot say how old "old" is); screen readers still hear
// "Actualizado". `compact` just drops the type a notch for the mobile map
// pill, which should sit quietly.
export function FreshnessText({ freshness, compact = false }: { freshness: Freshness; compact?: boolean }) {
  if (freshness.status === "nodata") {
    return (
      <span className={`whitespace-nowrap font-medium text-neutral-700 ${compact ? "text-[11px]" : "text-[13px]"}`}>
        No disponible
      </span>
    );
  }
  return (
    <span className={`whitespace-nowrap text-neutral-500 ${compact ? "text-[11px]" : "text-[13px]"}`}>
      <span className="sr-only">Actualizado </span>
      <time dateTime={freshness.dateTime} className="font-medium text-neutral-700">
        {freshness.when}
      </time>
    </span>
  );
}

// The dot + text in a glass pill, on the map beside its control buttons.
// Desktop (default) is 40px tall, the height of the map's other desktop
// controls, at the foot of the right column. `compact` is the mobile pill
// beside the Capas button: a fixed 28px, shrunk and shadowless so it reads as
// a quiet status line rather than a control, centred on the button by its row.
export function FreshnessBadge({ freshness, compact = false }: { freshness: Freshness; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "glass flex h-7 flex-shrink-0 items-center gap-1.5 rounded-xl px-2.5 shadow-none"
          : "glass flex h-10 flex-shrink-0 items-center gap-2 rounded-xl px-3.5"
      }
    >
      <FreshnessDot status={freshness.status} />
      <FreshnessText freshness={freshness} compact={compact} />
    </div>
  );
}
