// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex: the días insalubres chart renders
// these through Recharts' fillOpacity (an SVG-only prop), so anything
// outside Recharts needs withOpacity() to reproduce the same effective
// color against a white background, not just the same base hex.
//
// Muted editorial tones, not the NOM-172 scale's own (electric) green/red --
// this pair only needs to read as "good vs. bad" at a glance on a chart, not
// carry the scale's precision, so it's desaturated for a calmer page.
export const COLOR_SALUDABLE = "#3f7d4f";
export const COLOR_SALUDABLE_OPACITY = 0.6;
export const COLOR_INSALUBRE = "#b8453f";
export const COLOR_INSALUBRE_OPACITY = 0.65;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
