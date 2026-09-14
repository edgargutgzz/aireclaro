// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// The dataviz skill's own reserved status pair (references/palette.md,
// "good"/"critical" -- a fixed, brand-neutral scale for exactly this job,
// not hand-tuned here). Clears the chroma floor and light-surface contrast
// (good 3.27:1, critical 4.68:1). Still fails the CVD *adjacency* check
// outright (ΔE 4.1, below even the 6 floor) when the two sit right next to
// each other the way they do in a stacked bar -- true of essentially any
// red/green pair, not a defect specific to this one. Mitigated per the
// skill's own prescription: a text legend, a 2px white surface gap between
// stacked segments (not a colored border -- "never draw a border around a
// mark to separate it," marks-and-anatomy.md), and exact counts always in
// plain text, never color alone.
//
// Solid fill, opacity 1 -- bars are a "Bar/column" mark, not an "Area
// fill" (the skill's ~10% opacity wash is for the latter, e.g. a line
// chart's area-under-curve, not a bar's own body).
export const COLOR_SALUDABLE = "#0ca30c";
export const COLOR_SALUDABLE_OPACITY = 1;
export const COLOR_INSALUBRE = "#d03b3b";
export const COLOR_INSALUBRE_OPACITY = 1;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
