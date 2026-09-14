// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// Muted editorial tones, not the NOM-172 scale's own (electric) green/red --
// this pair only needs to read as "good vs. bad" at a glance on a chart, not
// carry the scale's precision, so it's desaturated for a calmer page.
//
// Solid fills, opacity at 1: an earlier pass blended these toward white via
// fillOpacity to soften them further, which turned an already-muted hex into
// a washed-out pastel (looked worse, not calmer). The hex alone is muted
// enough -- opacity here is a hook for overlap/hover states, not the base fill.
export const COLOR_SALUDABLE = "#3f7d4f";
export const COLOR_SALUDABLE_OPACITY = 1;
export const COLOR_INSALUBRE = "#b8453f";
export const COLOR_INSALUBRE_OPACITY = 1;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
