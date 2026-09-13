// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex: the días insalubres chart renders
// these through Recharts' fillOpacity (an SVG-only prop), so anything
// outside Recharts needs withOpacity() to reproduce the same effective
// color against a white background, not just the same base hex.
export const COLOR_SALUDABLE = "#00a400";
export const COLOR_SALUDABLE_OPACITY = 0.5;
export const COLOR_INSALUBRE = "#ff0000";
export const COLOR_INSALUBRE_OPACITY = 0.6;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
