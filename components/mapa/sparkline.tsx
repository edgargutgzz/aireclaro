"use client";

import { useId, useRef, useState } from "react";
import { getQualityInfo, IMECA_THRESHOLDS } from "@/lib/air-quality";
import type { HistoryPoint } from "./types";
import { SPARKLINE_COLOR, formatHistoryTime, getRelativeDayLabel, prefersReducedMotion } from "./lib";

// `animateIn` wipes the trace on from left to right, once, on mount — passed
// only when a marker is explicitly picked. The default sensor the card opens
// on skips it: the map is already flying to that marker at startup, and a
// second motion on top of that zoom is too much at once.
export function Sparkline({ data, onHoverChange, animateIn = false, windowLabel = "Últimas 48 horas" }: { data: HistoryPoint[]; onHoverChange?: (point: HistoryPoint | null) => void; animateIn?: boolean; windowLabel?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  // useId() contains colons; strip them so the url(#id) reference is safe.
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const wipe = animateIn && !prefersReducedMotion();

  if (data.length < 2) {
    return <p className="text-sm leading-relaxed text-gray-500">Sin datos suficientes para mostrar la tendencia</p>;
  }

  const width = 320;
  const height = 190;
  const values = data.map((d) => d.pm25);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Pad the value domain (not just pixel space) so the line's own peak and
  // trough sit inside the chart with room to breathe instead of touching the
  // top and bottom edges.
  const domainPadding = range * 0.15;
  const domainMin = min - domainPadding;
  const domainMax = max + domainPadding;
  const domainRange = domainMax - domainMin;

  const toY = (value: number) => height - ((value - domainMin) / domainRange) * height;

  const rightPadding = 8; // keeps the latest point off the chart's right edge
  const drawableWidth = width - rightPadding;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * drawableWidth,
    y: toY(d.pm25),
  }));

  // IMECA limits as dashed reference lines, each in the color of the zone it
  // opens. Only the ones inside this window's range are drawn, so the chart
  // never carries a line the data never approaches.
  const thresholds = IMECA_THRESHOLDS.filter((t) => t.value > domainMin && t.value < domainMax);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Area closes on the chart floor, filled with a fade of the line's own hue.
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height} L0,${height} Z`;

  // Mark where one calendar day ends and the next begins, so the daily
  // shape (morning/evening peaks) is easy to read instead of one blur.
  const dayBoundaries = data.flatMap((d, i) => {
    if (i === 0) return [];
    const prev = new Date(data[i - 1].time_stamp);
    const curr = new Date(d.time_stamp);
    if (curr.getDate() === prev.getDate() && curr.getMonth() === prev.getMonth()) return [];
    return [{ x: points[i].x, leftPct: (points[i].x / width) * 100, label: getRelativeDayLabel(curr) }];
  });

  const notifyHover = onHoverChange
    ? (point: HistoryPoint | null) => onHoverChange(point)
    : undefined;

  const setHover = (index: number | null) => {
    setHoverIndex(index);
    notifyHover?.(index === null ? null : data[index]);
  };

  const updateHover = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  // The latest point wears its own air-quality color: the official `color`
  // fills the dot, its `ink` (same hue, darkened) rings it so a pale yellow or
  // green body still holds an edge on the white chart.
  const latestQuality = getQualityInfo(data[data.length - 1].pm25);
  const latestFill = latestQuality?.color ?? SPARKLINE_COLOR;
  const latestRing = latestQuality?.textColor ?? "#ffffff";

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredQuality = hovered ? getQualityInfo(hovered.pm25) : null;
  // The tooltip is pinned just inside the chart's top edge and only tracks the
  // cursor horizontally, so it holds still while you scrub instead of bobbing
  // up and down the line. It stays *inside* the plot area, never above it: the
  // card's PM2.5 headline sits directly overhead, and a tooltip crossing the
  // top edge would cover the very reading the hover is meant to explain. The
  // value domain is padded 15% (domainPadding) so the line's own peak never
  // reaches this band. Percentage for the x offset, not pixels: the SVG draws
  // with preserveAspectRatio="none", so a pixel offset would drift between the
  // base and md heights.
  const tooltipLeftPct = hoverPoint ? (hoverPoint.x / width) * 100 : 0;

  return (
    <div>
      <div className="relative">
        {dayBoundaries.map((b) => (
          <div
            key={b.x}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded bg-white/80 px-1 text-[10px] font-medium leading-none text-gray-500"
            style={{ left: `${b.leftPct}%`, top: 1 }}
          >
            {b.label}
          </div>
        ))}
        {hovered && hoverPoint && (
          <div
            className="pointer-events-none absolute z-20 flex flex-col whitespace-nowrap rounded-lg border border-black/[0.08] bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
            style={{
              left: `clamp(70px, ${tooltipLeftPct}%, calc(100% - 70px))`,
              top: 0,
              transform: "translate(-50%, 6px)",
            }}
          >
            {/* Only the hour: the card's headline above shows that hour's
                value and quality while the cursor is on the chart. */}
            <span className="font-medium">{formatHistoryTime(hovered.time_stamp)}</span>
          </div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-[190px] cursor-crosshair md:h-[210px]"
          onMouseMove={(e) => updateHover(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) => updateHover(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SPARKLINE_COLOR} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SPARKLINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          {thresholds.map((t) => (
            <line key={t.value} x1={0} y1={toY(t.value)} x2={width} y2={toY(t.value)} stroke={t.color} strokeWidth={1} strokeDasharray="4,3" strokeOpacity={0.55} />
          ))}
          {dayBoundaries.map((b) => (
            <line key={b.x} x1={b.x} y1={0} x2={b.x} y2={height} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,3" />
          ))}
          <g className={wipe ? "sparkline-wipe" : undefined}>
            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
            <path d={linePath} fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <path d={linePath} fill="none" stroke={SPARKLINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {/* Current hour — the rightmost point, marked whenever nothing else
                is in focus. Official `color` body, `ink` ring (same hue
                darkened) so a pale fill keeps its edge on the white chart.
                Hidden during a hover: the headline above already swaps from
                "now" to that hour's reading, so keeping this dot up too would
                leave two points claiming focus on the same chart. */}
            {!hoverPoint && (
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={latestFill} stroke={latestRing} strokeWidth={1.5} />
            )}
          </g>
          {hoverPoint && hovered && (
            <>
              {/* Crosshair stays neutral (where you are); the dot carries the
                  air-quality colour for that hour (what band it landed in), the
                  same body + ink-ring treatment as the always-on latest dot. */}
              <line x1={hoverPoint.x} y1={0} x2={hoverPoint.x} y2={height} stroke={SPARKLINE_COLOR} strokeWidth={1} strokeDasharray="3,3" strokeOpacity={0.5} />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r={3} fill={hoveredQuality?.color ?? SPARKLINE_COLOR} stroke={hoveredQuality?.textColor ?? "#ffffff"} strokeWidth={1.5} />
            </>
          )}
        </svg>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] leading-none text-gray-500">
        <span>{windowLabel}</span>
        <span>Máx {Math.round(max)} · Mín {Math.round(min)} μg/m³</span>
      </div>
    </div>
  );
}

// Matches Sparkline's layout (chart area, then the footer row) so there's no
// layout shift once the real data replaces it. Not a fake chart: a calm
// gray block that softly pulses, then the real trace wipes in over it. A
// mock squiggle plus the wipe was two animations back to back.
export function SparklineSkeleton() {
  return (
    <div>
      <div className="h-[190px] rounded-xl bg-gray-100 animate-pulse motion-reduce:animate-none md:h-[210px]" aria-hidden="true" />
      <div className="mt-1.5 flex items-center text-[11px] leading-none text-gray-500">
        Últimas 48 horas
      </div>
    </div>
  );
}
