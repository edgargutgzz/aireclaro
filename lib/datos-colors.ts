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
// one hex each, rendered at two different opacities (a lighter fill, a
// stronger border/text), not two distinct hexes like the last few rounds.
export const COLOR_SALUDABLE = "#22c55e"; // Tailwind green-500
export const COLOR_SALUDABLE_FILL_OPACITY = 0.45;
export const COLOR_SALUDABLE_BORDER_OPACITY = 0.8;
export const COLOR_INSALUBRE = "#ef4444"; // Tailwind red-500
export const COLOR_INSALUBRE_FILL_OPACITY = 0.55;
export const COLOR_INSALUBRE_BORDER_OPACITY = 0.9;

export function withOpacity(hex: string, opacity: number): string {
  const int = parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
