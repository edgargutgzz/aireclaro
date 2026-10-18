// How current the reading on screen is: a colour dot plus the reading's
// time. Three states, because a dot that is only ever green cannot tell
// you anything — and the timestamp, not the colour, is what actually carries
// the state. The value itself (floored hour, day label past today, status
// bucket) is computed in mapa-sensors.tsx where the sensor data lives.
// "nodata": the station on screen has no reading from the last 3 hours (the
// site's live cutoff); there is no time to show, only that it hasn't updated
// ("Sin actualizar", not "no data": the station may well be measuring).
export type Freshness =
  | { dateTime: string; when: string; status: "fresh" | "delayed" }
  | { status: "nodata" };

export function FreshnessDot({ status }: { status: Freshness["status"] }) {
  const dot =
    status === "fresh" ? "bg-green-500" :
    status === "delayed" ? "bg-amber-500" :
    "bg-gray-400";

  return (
    <span aria-hidden="true" className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
      {/* Only fresh data pulses. A dot that keeps ticking in amber or grey
          reads as "working on it" when the truth is "this is late". */}
      {status === "fresh" && (
        <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
      )}
      <span className={`relative h-2 w-2 rounded-full ${dot}`} />
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
      <span className={`whitespace-nowrap font-medium text-gray-700 ${compact ? "text-[11px]" : "text-[13px]"}`}>
        Sin actualizar
      </span>
    );
  }
  return (
    <span className={`whitespace-nowrap text-gray-500 ${compact ? "text-[11px]" : "text-[13px]"}`}>
      <span className="sr-only">Actualizado </span>
      <time dateTime={freshness.dateTime} className="font-medium text-gray-700">
        {freshness.when}
      </time>
    </span>
  );
}

// The dot + text in a glass pill. Desktop (default) rides the foot of the map's
// right column. `compact` is the mobile map pill: floated top-centre below the
// top bar, shrunk and shadowless so it reads as a quiet status line over the
// map rather than a control.
export function FreshnessBadge({ freshness, compact = false }: { freshness: Freshness; compact?: boolean }) {
  return (
    <div
      className={
        // Shared glass pill; the compact mobile variant drops the shadow so it
        // reads as a quiet status line rather than a control.
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
