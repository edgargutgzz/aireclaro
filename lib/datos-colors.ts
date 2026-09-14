// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// Muted editorial tones, not the NOM-172 scale's own colors -- the map's
// literal green/red (calmed Buena / unmuted alarm-red Muy mala) read too
// loud for a large flat chart area, even with the card now wearing the
// map's glass frame. This pair only needs to say "good vs. bad" at a
// glance, not carry the scale's precision.
//
// Solid fills, opacity at 1 -- an earlier pass blended these toward white
// via fillOpacity, which turned the muted hex pastel. The hex alone
// carries the muting.
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
