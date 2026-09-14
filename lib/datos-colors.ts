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
// Deeper, lower-chroma than the skill's own "good"/"critical" status pair
// (#0ca30c/#d03b3b, OKLCH C 0.21/0.19 -- too vivid at solid fill across a
// large bar area, read as "hurts the eyes"). This pair still clears the
// chroma floor (green measures 0.107, just above the 0.10 "reads as gray"
// line) and light-surface contrast, at roughly half the green's chroma and
// a full step darker -- calmer without going muddy. Still lands CVD
// adjacency in the legal WARN band (ΔE 6.6, floor 6), same as every
// non-blue green/red option: text legend, a 2px white surface gap between
// stacked segments, and exact counts always in plain text carry the
// meaning for colorblind readers instead of hue.
//
// Light tint fill (this opacity, blended over white) + a full-strength
// colored border, by explicit user request over the plain solid-fill
// version -- the look from the supplied reference screenshot. Not a
// softening hack (that pastel-via-opacity mistake happened once already,
// see git history): a deliberate two-tier look where the tint carries the
// area and the border (COLOR_SALUDABLE/COLOR_INSALUBRE at full strength on
// the <Bar stroke>) carries the identity.
export const COLOR_SALUDABLE = "#2f855a";
export const COLOR_SALUDABLE_OPACITY = 0.15;
export const COLOR_INSALUBRE = "#c0392b";
export const COLOR_INSALUBRE_OPACITY = 0.15;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
