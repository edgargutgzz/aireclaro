// "Mi zona": the map's opt-in "center on me" button. The browser asks for the
// location only when the button is tapped (never on load). The position is
// rounded to about 1 km and kept in this browser alone (never sent anywhere),
// so later visits open on that area without asking again. Storage can be
// blocked (private windows), so every access is guarded.

export type Zona = [lon: number, lat: number];

const KEY = "mapa-mi-zona";

export function readZona(bounds: [[number, number], [number, number]]): Zona | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const [lon, lat] = raw.split(",").map(Number);
    return Number.isFinite(lon) && Number.isFinite(lat) && inBounds([lon, lat], bounds) ? [lon, lat] : null;
  } catch {
    return null;
  }
}

export function saveZona(zona: Zona): void {
  try {
    window.localStorage.setItem(KEY, `${zona[0]},${zona[1]}`);
  } catch {
    // Storage blocked: the zona just isn't remembered.
  }
}

// Two decimals of a degree: about 1 km here, enough to frame the area.
export function roundZona(lon: number, lat: number): Zona {
  return [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100];
}

export function inBounds([lon, lat]: Zona, [[west, south], [east, north]]: [[number, number], [number, number]]): boolean {
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

// A tap that works just moves the map; one that can't says why.
export type ZonaStatus = "idle" | "locating" | "denied" | "unavailable" | "outside";

export const ZONA_AVISO: Record<Exclude<ZonaStatus, "idle" | "locating">, string> = {
  denied: "Sin permiso de ubicación. Puedes activarlo en tu navegador.",
  unavailable: "No pudimos obtener tu ubicación.",
  outside: "Tu ubicación está fuera del área del mapa.",
};
