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
// The dataviz skill's own reserved status pair (references/palette.md,
// "good"/"critical" -- a fixed, brand-neutral scale for exactly this job,
// not hand-tuned here). Clears the chroma floor and light-surface contrast
// (good 3.27:1, critical 4.68:1). Still fails the CVD *adjacency* check
// outright (ΔE 4.1, below even the 6 floor) when the two sit right next to
// each other the way they do in a stacked bar -- true of essentially any
// red/green pair, not a defect specific to this one. Mitigated the same
// way as the pair before it: text legend, a colored border between
// stacked segments, and exact counts always in plain text, never color
// alone.
//
// Two-tier per a supplied reference design: a light tint fill (this
// opacity, blended over white) carries the area, the full-strength hex is
// the *stroke* around each bar/cell -- not a softening hack this time
// (that pastel-via-fillOpacity mistake was already made and reverted
// once), it's the intended look, keyed off a screenshot the user held up
// as better than the flat-fill versions.
export const COLOR_SALUDABLE = "#0ca30c";
export const COLOR_SALUDABLE_OPACITY = 0.28;
export const COLOR_INSALUBRE = "#d03b3b";
export const COLOR_INSALUBRE_OPACITY = 0.28;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
