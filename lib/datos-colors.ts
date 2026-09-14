import { IMECA_LEVELS, mixColorInk } from "@/lib/air-quality";

// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// Pulled straight from the map's own scale (IMECA_LEVELS in air-quality.ts)
// through the same calming mix the map's markers use, per the style guide's
// "never hardcode a scale colour" -- this chart's green/red is map-styling,
// not an invented pair:
//   - Buena gets the house calmed mix (color nudged 25% toward ink), same
//     as a healthy station's dot.
//   - Muy mala is deliberately left unmuted (t=0) -- the map itself never
//     calms this one, since its ink already equals its color and it's the
//     scale's intentional alarm red. Matching that means matching the map,
//     not softening it.
export const COLOR_SALUDABLE = mixColorInk(IMECA_LEVELS[0].color, IMECA_LEVELS[0].ink);
export const COLOR_SALUDABLE_OPACITY = 1;
export const COLOR_INSALUBRE = mixColorInk(IMECA_LEVELS[3].color, IMECA_LEVELS[3].ink, 0);
export const COLOR_INSALUBRE_OPACITY = 1;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
