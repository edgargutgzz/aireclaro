// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same blue in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// Not green/red: every red/green pair tried here (including the dataviz
// skill's own reserved "good"/"critical" status pair, #0ca30c/#d03b3b)
// fails the skill's CVD adjacency check outright (ΔE ~4, floor is 6) once
// the two sit next to each other in a stack. The skill's own prescribed
// fix for exactly this is its diverging pair -- warm/cool poles read as
// opposite under colorblind simulation, where two warm (or two cool) hues
// don't. So insalubre keeps red (already reads as alarm, and status red
// is reserved for "critical" anyway); saludable moves to the skill's
// sequential-ramp blue. Passes clean: ΔE 20.4, well past the 8 target,
// not the 6-8 legend-dependent floor red/green was stuck in.
//
// Solid fill, opacity 1 -- bars are a "Bar/column" mark, not an "Area
// fill" (the skill's ~10% opacity wash is for the latter, e.g. a line
// chart's area-under-curve, not a bar's own body).
export const COLOR_SALUDABLE = "#256abf";
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
