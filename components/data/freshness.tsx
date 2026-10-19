// How current the reading on screen is: a colour dot plus the reading's
// time. Three states, because a dot that is only ever green cannot tell
// you anything — and the timestamp, not the colour, is what actually carries
// the state. The value itself (floored hour, day label past today, status
// bucket) is computed in mapa-sensors.tsx where the sensor data lives.
// "nodata": the station on screen has no reading from the last 3 hours (the
// site's live cutoff); there is no time to show ("No disponible", the same
// words as the card's headline and the ticker).
export type Freshness =
  | { dateTime: string; when: string; status: "fresh" | "delayed" }
  | { status: "nodata" };

export function FreshnessDot({ status }: { status: Freshness["status"] }) {
  const dot =
    status === "fresh" ? "bg-green-500" :
    status === "delayed" ? "bg-amber-500" :
    "bg-stone-400";

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
// "Actualizado".
export function FreshnessText({ freshness }: { freshness: Freshness }) {
  if (freshness.status === "nodata") {
    return (
      <span className="whitespace-nowrap text-[13px] font-medium text-neutral-700">
        No disponible
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap text-[13px] text-neutral-500">
      <span className="sr-only">Actualizado </span>
      <time dateTime={freshness.dateTime} className="font-medium text-neutral-700">
        {freshness.when}
      </time>
    </span>
  );
}

// The dot + text in a glass pill, on the map beside its control buttons. It
// has no height of its own: self-stretch takes the row's, so the pill always
// matches the button next to it (40px "Mi zona" on desktop, 46px Capas on
// mobile).
export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return (
    <div className="glass flex flex-shrink-0 items-center gap-2 self-stretch rounded-xl px-3.5">
      <FreshnessDot status={freshness.status} />
      <FreshnessText freshness={freshness} />
    </div>
  );
}
