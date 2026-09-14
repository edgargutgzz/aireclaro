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
// Fill/border pairs pixel-sampled directly from a reference screenshot the
// user pointed to (días insalubres chart, light fill + a more saturated
// border of the same hue -- not one hex at two opacities). Both sit well
// outside the dataviz skill's lightness/chroma/CVD bands on their own (a
// light decorative pastel system, not a validated data-identity pair) --
// flagged, not blocking, since this is a direct aesthetic match request.
export const COLOR_SALUDABLE = "#b6e2bb";
export const COLOR_SALUDABLE_BORDER = "#7ece86";
export const COLOR_INSALUBRE = "#eb9f9c";
export const COLOR_INSALUBRE_BORDER = "#e0635e";

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
