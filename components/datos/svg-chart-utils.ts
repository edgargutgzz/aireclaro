// Shared pure geometry helpers for /datos' hand-rolled SVG charts (no
// charting library -- see dias-insalubres-chart.tsx and
// promedio-anual-chart.tsx). Plain functions, not JSX: both charts differ
// enough in shape (stacked vs. single-series, fixed 12 categories vs.
// variable) that a shared chart *component* would be premature, but this
// exact geometry math would otherwise be typed out twice.

import type { CSSProperties } from "react";

// Positions a tooltip card centered above a data point by default, clamped
// to whichever side keeps it inside the chart's own (possibly
// horizontally-scrolled) width instead of growing off the edge -- both
// charts' tooltips need this exact clamping, differing only in their own
// width constant.
//
// Vertical clamping matters here in a way it wouldn't in an ordinary
// scrollable div: the chart sits inside HorizontalScrollFade's
// overflow-x-auto container, and the CSS overflow spec forces that
// container's overflow-y to `auto` the instant overflow-x is non-visible
// (you cannot mix `auto` on one axis with `visible` on the other -- the
// visible one always gets promoted). So a tooltip anchored above a tall bar
// (topY near the chart's own top edge) doesn't just look cramped if it pokes
// above y=0, it gets silently clipped there, invisible above the fold with
// no visual sign anything is missing. tooltipHeight lets this flip the
// tooltip below the point instead whenever there isn't room above.
export function tooltipPositionStyle(
  centerX: number,
  topY: number,
  totalWidth: number,
  chartHeight: number,
  tooltipWidth: number,
  tooltipHeight: number,
  gap = 10,
): CSSProperties {
  const overflowsRight = centerX + tooltipWidth / 2 > totalWidth;
  const overflowsLeft = centerX - tooltipWidth / 2 < 0;
  const horizontal: CSSProperties = overflowsRight
    ? { right: totalWidth - centerX }
    : overflowsLeft
      ? { left: centerX }
      : { left: centerX, transform: "translateX(-50%)" };
  const roomAbove = topY - gap >= tooltipHeight;
  const vertical: CSSProperties = roomAbove
    ? { bottom: chartHeight - topY + gap }
    : { top: topY + gap };
  return { ...horizontal, ...vertical };
}

// Standard "nice numbers" tick generation so a y-axis reads 0/5/10/... or
// 0/10/20/..., never an arbitrary fraction -- the dataviz skill's "round to
// clean numbers" rule.
export function niceTicks(maxValue: number, tickCount = 5): number[] {
  if (maxValue <= 0) return [0];
  const rawStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / magnitude;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = niceNorm * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= maxValue + step * 0.001; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

// A rect path with independently roundable corners -- a plain SVG
// `<rect rx>` rounds all four uniformly, which can't express the dataviz
// skill's own bar spec ("4px rounded data-end, square at the baseline") on
// its own, let alone a stacked segment that's square on the side touching
// its neighbor and rounded only at the outer tip.
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: { tl?: number; tr?: number; br?: number; bl?: number },
): string {
  const tl = Math.max(0, Math.min(radii.tl ?? 0, h, w / 2));
  const tr = Math.max(0, Math.min(radii.tr ?? 0, h, w / 2));
  const br = Math.max(0, Math.min(radii.br ?? 0, h, w / 2));
  const bl = Math.max(0, Math.min(radii.bl ?? 0, h, w / 2));
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `Q${x + w},${y} ${x + w},${y + tr}` : "",
    `V${y + h - br}`,
    br ? `Q${x + w},${y + h} ${x + w - br},${y + h}` : "",
    `H${x + bl}`,
    bl ? `Q${x},${y + h} ${x},${y + h - bl}` : "",
    `V${y + tl}`,
    tl ? `Q${x},${y} ${x + tl},${y}` : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}
