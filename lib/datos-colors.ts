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
// Ported exactly from the client's own live chart
// (observatoriodelaire.com/datos, components/datos/pm25-dias-excedidos.tsx
// in the sibling ~/observatorio-del-aire/observatoriodelaire repo) -- read
// from that source directly, not re-derived: Tailwind red-500 / green-500,
// one hex each. A border-opacity pair for each originally rendered a
// stronger stroke around every mark (the Recharts era); the hand-rolled SVG
// rebuild (2026-09-19) dropped marks' borders entirely in favor of the
// dataviz skill's own separator (a surface gap between marks, not a
// stroke), so only the fill opacities remain.
export const COLOR_SALUDABLE = "#22c55e"; // Tailwind green-500
export const COLOR_SALUDABLE_FILL_OPACITY = 0.55;
// Blue, not green, for a data-COMPLETENESS reading (coverage/validity) --
// so it doesn't get skimmed as "good air quality," which green means
// everywhere else on /datos. Originally cobertura-only (its "Con datos"
// grid cells); promoted here 2026-09-28 once promedio anual's own
// trimester-validity bar needed the identical color and shouldn't
// re-declare the literal hex a second time.
export const COLOR_CUBIERTO = "#3b82f6"; // Tailwind blue-500
// Full strength: at 68% the blue rendered as a washed-out #7aaaf9 that read
// as pastel (2026-10-20). Kept separate from COLOR_SALUDABLE_FILL_OPACITY
// so the días insalubres bars keep their own softer fill.
export const COLOR_CUBIERTO_FILL_OPACITY = 1;
// The cobertura charts' "Datos insuficientes" gray (a data-quality gap, not
// a health-severity color): lighter than stone-300, but not all the way to
// stone-200, which sat almost invisibly on a stone-50 card.
export const COLOR_INSUFICIENTE = "#dedcda";
// Cobertura's days of a year in progress that haven't happened yet: thin
// diagonal lines in this color on the white card, not a solid fill, so they
// can't be read as COLOR_INSUFICIENTE (nothing is missing there).
export const COLOR_POR_VENIR = "#e7e5e4"; // Tailwind stone-200
export const COLOR_INSALUBRE = "#ef4444"; // Tailwind red-500
export const COLOR_INSALUBRE_FILL_OPACITY = 0.65;

// The logo's own colors, pixel-sampled from public/navbar/occamm-logo.png
// (OCCAMM lettering / "Observatorio del Aire" lettering). Brand accents
// (share-image bar) and the year-comparison lines, where a year is an
// identity, not a good/bad reading. As a categorical pair they pass the
// dataviz validator on white (CVD ΔE 9.4, normal ΔE 17.6, both >= 3:1).
export const BRAND_BLUE = "#226caf";
export const BRAND_PURPLE = "#743479";

// Year-comparison lines on /datos: focus + context by color only. A year
// can't borrow a color that already means something: red/green = sobre /
// dentro de la norma, blue = data coverage here (COLOR_CUBIERTO), the
// orange/yellow family = air-quality levels on the map. The current year is
// Tailwind violet-500 -- the same Tailwind 500 family as the bars' red and
// green; past years recede to light gray (Tailwind stone-300).
export const COLOR_YEAR_CURRENT = "#8b5cf6"; // Tailwind violet-500
export const COLOR_YEAR_PAST = "#d6d3d1"; // Tailwind stone-300

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
