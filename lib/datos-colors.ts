// Shared color tokens across the /datos charts (días insalubres +
// cobertura de estaciones) -- a "good" reading is the same green in both
// places, a "bad" reading the same red. Single source of truth so a
// component that needs a flat (non-SVG) version of one of these doesn't
// silently drift by re-guessing the hex.
//
// Muted editorial tones, not the NOM-172 scale's own colors -- the map's
// literal green/red read too loud for a large flat chart area, even
// against the glass card. This pair only needs to say "good vs. bad" at a
// glance, not carry the scale's precision.
//
// Validated, not eyeballed (dataviz skill, scripts/validate_palette.js
// --mode light): the prior pair (#3f7d4f/#b8453f) failed the chroma floor
// (the green measured 0.097, just under the 0.10 "reads as gray" line --
// the muddy look was measurable, not just a taste call) and failed CVD
// separation outright (ΔE 4.2). This pair clears chroma and lands CVD in
// the legal WARN band (ΔE 6.6, floor is 6) -- legal specifically because
// the chart already ships the required secondary encoding: a text legend,
// a 2px white gap between stacked segments, and tooltip values. No
// red/green pair clears the CVD *target* (8) -- red and green are close
// under deuteranopia by nature of the hues, not by any tuning choice here.
//
// Solid fills, opacity at 1 -- an earlier pass blended these toward white
// via fillOpacity, which turned the muted hex pastel. The hex alone
// carries the muting.
export const COLOR_SALUDABLE = "#2f855a";
export const COLOR_SALUDABLE_OPACITY = 1;
export const COLOR_INSALUBRE = "#c0392b";
export const COLOR_INSALUBRE_OPACITY = 1;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
