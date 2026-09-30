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
// Cobertura's grid cells read as flatter/smaller shapes than días insalubres'
// bars, so they want a more solid fill -- kept separate from
// COLOR_SALUDABLE_FILL_OPACITY on purpose so a bump here doesn't also
// wash out the días insalubres chart's bars.
export const COLOR_CUBIERTO_FILL_OPACITY = 0.68;
export const COLOR_INSALUBRE = "#ef4444"; // Tailwind red-500
export const COLOR_INSALUBRE_FILL_OPACITY = 0.65;

// The logo's own colors, pixel-sampled from public/navbar/occamm-logo.png
// (OCCAMM lettering / "Observatorio del Aire" lettering). Brand accents
// (share-image bar) and the year-comparison lines, where a year is an
// identity, not a good/bad reading. As a categorical pair they pass the
// dataviz validator on white (CVD ΔE 9.4, normal ΔE 17.6, both >= 3:1).
export const BRAND_BLUE = "#226caf";
export const BRAND_PURPLE = "#743479";

// Year-comparison lines on /datos: focus + context by color only. The
// current year is drawn in the bars' own "sobre la norma" red -- the 2026
// line is literally the height of the 2026 red bar segments, so the two
// views read as the same data. Past years recede to light gray (Tailwind
// gray-300): present as a reference, not competing.
export const COLOR_YEAR_CURRENT = COLOR_INSALUBRE;
export const COLOR_YEAR_PAST = "#d1d5db"; // Tailwind gray-300

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
