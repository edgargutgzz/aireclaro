"use client";

import { useMemo } from "react";
import { Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getMarkerFill } from "@/lib/air-quality";
import { FreshnessDot, type Freshness } from "@/components/data/freshness";
import { parseMonterreyNaive } from "@/lib/monterrey-time";
import { getRelativeDayLabel, prefersReducedMotion } from "./lib";

// Desktop time scrubber. A range input over the loaded window, a play button
// that steps hourly to the end, a live/"Ahora" toggle, and a context strip
// behind the track — the median across the whole field per hour — so episodes
// are visible as shape and you can scrub straight to a peak.
export function TimeScrubber({
  hours,
  index,
  playing,
  speed,
  medianByHour,
  freshness,
  onIndex,
  onPlayingChange,
  onSpeedChange,
}: {
  hours: string[];
  index: number | null;
  playing: boolean;
  speed: number;
  medianByHour: number[];
  freshness: Freshness | null;
  onIndex: (i: number | null) => void;
  onPlayingChange: (p: boolean) => void;
  onSpeedChange: (s: number) => void;
}) {
  const reduceMotion = prefersReducedMotion();
  const n = hours.length;
  const last = n - 1;
  const live = index == null;
  const value = index ?? last;

  // The right-side readout: the moment on screen, stacked as label over value
  // to keep it narrow. Scrubbed — day over time; live — "Actualizado" over the
  // freshness time (see the render below).
  const scrubbed = live
    ? null
    : (() => {
        const d = parseMonterreyNaive(`${hours[index!]}:00:00`);
        return { day: getRelativeDayLabel(d), time: `${format(d, "h")}:00 ${format(d, "a")}` };
      })();

  // The context strip: a bar in each slot's air-quality colour, so an episode
  // reads as a red patch. Past ~3 weeks the hourly bars are sub-pixel and mush,
  // so it buckets to one bar per day (the day's mean of the hourly medians);
  // the slider stays hourly either way. Memoised on the series, not the scrub
  // position — dragging must not re-render ~1500 <rect>s per frame.
  const strip = useMemo(() => {
    const H = 30;
    const daily = n > 480;
    const scaleMax = Math.max(15, ...medianByHour);

    type Bar = { x: number; w: number; v: number };
    let bars: Bar[];
    if (daily) {
      const groups = new globalThis.Map<string, { sum: number; k: number; start: number }>();
      hours.forEach((h, i) => {
        const day = h.slice(0, 10);
        let g = groups.get(day);
        if (!g) { g = { sum: 0, k: 0, start: i }; groups.set(day, g); }
        if (medianByHour[i] > 0.4) { g.sum += medianByHour[i]; g.k += 1; }
      });
      bars = [...groups.values()].map((g) => ({ x: (g.start / n) * 100, w: (24 / n) * 100, v: g.k ? g.sum / g.k : 0 }));
    } else {
      const bw = 100 / Math.max(1, n);
      bars = medianByHour.map((v, i) => ({ x: i * bw, w: bw, v }));
    }

    const dayTicks = hours.flatMap((h, i) =>
      i > 0 && h.slice(-2) === "00"
        ? [{ pct: (i / last) * 100, label: format(parseMonterreyNaive(`${h}:00:00`), "d MMM", { locale: es }) }]
        : [],
    );
    const labelStep = Math.max(1, Math.ceil(dayTicks.length / 7));

    const svg = (
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="pointer-events-none block h-[30px] w-full" aria-hidden="true">
        {bars.map((b, i) => {
          if (b.v <= 0.4) return null;
          const bh = Math.max(1.5, (b.v / scaleMax) * H);
          // The marker fill (calmed colour), held translucent like a resting
          // disc — the strip is secondary context, so it sits a touch lighter
          // than the map's discs. The pure NOM colour stays on the legend key.
          return <rect key={i} x={b.x} width={b.w} y={H - bh} height={bh} fill={getMarkerFill(b.v) ?? "#e5e7eb"} fillOpacity={0.68} />;
        })}
        {!daily &&
          dayTicks.map((t) => (
            <line key={t.pct} x1={t.pct} x2={t.pct} y1={0} y2={H} stroke="#ffffff" strokeWidth={1} strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />
          ))}
      </svg>
    );

    return { svg, labels: dayTicks.filter((_, i) => i % labelStep === 0) };
  }, [hours, medianByHour, n, last]);

  return (
    <div className="glass pointer-events-auto hidden w-[min(90vw,40rem)] items-center gap-3 rounded-2xl px-4 py-3 md:flex">
      {!reduceMotion && (
        <>
          <button
            type="button"
            onClick={() => {
              if (live) onIndex(Math.max(0, last - 72));
              onPlayingChange(!playing);
            }}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            aria-label={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
          </button>
          <button
            type="button"
            onClick={() => onSpeedChange(speed >= 4 ? 1 : speed * 2)}
            className="flex-shrink-0 rounded-lg px-1.5 py-1 text-[12px] font-semibold tabular-nums text-gray-500 transition-colors hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            aria-label={`Velocidad ${speed}×`}
          >
            {speed}×
          </button>
        </>
      )}

      <div className="relative min-w-0 flex-1 pt-3.5">
        {strip.labels.map((t) => (
          <span
            key={t.pct}
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] leading-none text-gray-500"
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
        {strip.svg}
        <input
          type="range"
          min={0}
          max={last}
          value={value}
          onChange={(e) => {
            const i = Number(e.target.value);
            onIndex(i >= last ? null : i);
          }}
          aria-label="Hora del mapa"
          aria-valuetext={scrubbed ? `${scrubbed.day}, ${scrubbed.time}` : "En vivo"}
          className="time-scrubber absolute inset-x-0 bottom-0"
        />
      </div>

      {/* Fixed width, and filled in both states. The scrubbed state carries an
          "Ahora" button; the live state fills the same spot with an "En vivo"
          tag rather than leaving it blank. Without the reserved box the track
          would widen by ~50px the instant a drag crossed into live at the right
          end, yanking the strip and thumb out from under the cursor; without
          the live-state tag that reserved space read as a gap against the
          strip. */}
      <div className="flex w-[8rem] flex-shrink-0 items-center justify-end gap-2">
        {live ? (
          <>
            {freshness && (
              <span className="flex flex-col items-end leading-tight">
                <span className="text-[10px] text-gray-400">Actualizado</span>
                <time dateTime={freshness.dateTime} className="whitespace-nowrap text-[13px] font-medium text-gray-700">
                  {freshness.when}
                </time>
              </span>
            )}
            {/* Not a button — you're already live. A status tag, in the "Ahora"
                slot. The dot rides it only when the pipeline is behind, the
                same fresh/delayed/stale rule the readout used before. */}
            <span className="flex flex-shrink-0 items-center gap-1 px-2 py-1 text-[13px] font-medium text-gray-400">
              {freshness && freshness.status !== "fresh" && <FreshnessDot status={freshness.status} />}
              En vivo
            </span>
          </>
        ) : (
          <>
            <span className="flex flex-col items-end leading-tight">
              <span className="text-[10px] text-gray-400">{scrubbed!.day}</span>
              <span className="whitespace-nowrap text-[13px] font-medium text-gray-700">{scrubbed!.time}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onPlayingChange(false);
                onIndex(null);
              }}
              className="-mr-1 flex-shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              Ahora
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Shown in the scrubber's place while the field-history window loads (the
// aggregation runs a few seconds on a cold cache), so the control appears with
// the map instead of popping in later. Same shell dimensions, no layout shift
// on swap; the pulse is the only "loading" signal, no text.
export function TimeScrubberSkeleton() {
  return (
    <div className="glass pointer-events-auto hidden w-[min(90vw,40rem)] items-center gap-3 rounded-2xl px-4 py-3 md:flex" aria-hidden="true">
      <div className="h-9 w-9 flex-shrink-0 rounded-full border border-gray-200" />
      <div className="min-w-0 flex-1 pt-3.5">
        <div className="h-[30px] animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
      </div>
      <div className="h-3.5 w-[8rem] flex-shrink-0 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
    </div>
  );
}
