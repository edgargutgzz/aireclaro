"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// How current the reading on screen is: a colour dot plus the "Actualizado
// <time>" text. Three states, because a dot that is only ever green cannot tell
// you anything — and the timestamp, not the colour, is what actually carries
// the state. The value itself (floored hour, day label past today, status
// bucket) is computed in mapa-sensors.tsx where the sensor data lives.
export type Freshness = {
  dateTime: string;
  when: string;
  status: "fresh" | "delayed" | "stale";
};

export function FreshnessDot({ status }: { status: Freshness["status"] }) {
  const dot =
    status === "fresh" ? "bg-green-500" :
    status === "delayed" ? "bg-amber-500" :
    "bg-gray-400";

  return (
    <span aria-hidden="true" className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
      {/* Only fresh data pulses. A dot that keeps ticking in amber or grey
          reads as "working on it" when the truth is "this is old". */}
      {status === "fresh" && (
        <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
      )}
      <span className={`relative h-2 w-2 rounded-full ${dot}`} />
    </span>
  );
}

// The label is the quiet half and the time is the information, so they do not
// share one weight and one colour. "Actualizado" is never the dot's only
// companion — a bare colour cannot say how old "old" is.
export function FreshnessText({ freshness }: { freshness: Freshness }) {
  return (
    <span className="whitespace-nowrap text-[13px] text-gray-500">
      Actualizado{" "}
      <time dateTime={freshness.dateTime} className="font-medium text-gray-700">
        {freshness.when}
      </time>
    </span>
  );
}

// Desktop: the dot + text in a glass pill, riding the foot of the map's right
// column. Mobile has no rail to pin a chip to and a chip floating over the map
// reads as a stray control, so there the same two parts sit on the trailing
// edge of the top bar instead (HeaderFreshness).
export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return (
    <div className="flex h-10 flex-shrink-0 items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3.5 shadow-sm backdrop-blur-md">
      <FreshnessDot status={freshness.status} />
      <FreshnessText freshness={freshness} />
    </div>
  );
}

// The map (deep in the tree, under MainContent) is the only thing that knows how
// fresh the data is; the mobile top bar (a sibling of MainContent, under the
// layout) is where that belongs on a phone. This context is the wire between
// them: the map pushes its Freshness up, the bar reads it. It stays null on
// every other route, since nothing else sets it, so the bar simply shows
// nothing there.
type FreshnessContextValue = {
  freshness: Freshness | null;
  setFreshness: (freshness: Freshness | null) => void;
};

const FreshnessContext = createContext<FreshnessContextValue | null>(null);

export function FreshnessProvider({ children }: { children: ReactNode }) {
  const [freshness, setFreshness] = useState<Freshness | null>(null);
  const value = useMemo(() => ({ freshness, setFreshness }), [freshness]);
  return <FreshnessContext.Provider value={value}>{children}</FreshnessContext.Provider>;
}

export function useFreshness() {
  const ctx = useContext(FreshnessContext);
  if (!ctx) throw new Error("useFreshness must be used within a FreshnessProvider");
  return ctx;
}

// Mobile only: the dot + text on the trailing edge of the top bar, opposite the
// logo. Renders nothing until the map has reported a reading (and nothing at all
// on routes that never do).
export function HeaderFreshness() {
  const { freshness } = useFreshness();
  if (!freshness) return null;
  return (
    <div className="flex items-center gap-2 md:hidden">
      <FreshnessDot status={freshness.status} />
      <FreshnessText freshness={freshness} />
    </div>
  );
}
