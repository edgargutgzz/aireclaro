// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// Green/red by explicit user call, not the dataviz skill's own pick (its
// blue/red diverging pair cleanly passes CVD; green/red is preferred here
// regardless -- see the commit history for that call).
//
// #a7d3b4 pixel-sampled directly from a reference screenshot the user
// pointed to (a pastel sage green bar); #e8b8b8 is its "equivalent" red --
// matched OKLCH lightness (0.825 vs the green's 0.827) and chroma (0.056 vs
// 0.063), same pastel family, just the red hue. Both sit well outside the
// dataviz skill's lightness/chroma/CVD bands on their own (this is a light
// decorative pastel pair, not a validated data-identity pair) -- flagged,
// not blocking, since this is a direct aesthetic match request.
// Solid fill (both charts), by explicit request over the earlier
// tint/gradient versions -- no opacity constant needed anymore.
export const COLOR_SALUDABLE = "#a7d3b4";
export const COLOR_INSALUBRE = "#e8b8b8";

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
