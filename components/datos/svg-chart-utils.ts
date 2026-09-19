// Shared pure geometry helpers for /datos' hand-rolled SVG charts (no
// charting library -- see dias-insalubres-chart.tsx and
// promedio-anual-chart.tsx). Plain functions, not JSX: both charts differ
// enough in shape (stacked vs. single-series, fixed 12 categories vs.
// variable) that a shared chart *component* would be premature, but this
// exact geometry math would otherwise be typed out twice.

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
