import { Landmark, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getPM25Color, getQualityInfo, roundPM25 } from "@/lib/air-quality";
import type { Sensor, Data, SelectedSensor } from "./types";

// Small inline trend chart colour for the selected sensor's last 48h. Fixed
// regardless of the sensor's air-quality color: the yellow "Aceptable" tone in
// particular is too low-contrast on white to read as a line/fill. Also the
// resting fallback for the pulse halo before a reading resolves.
export const SPARKLINE_COLOR = "#3b82f6";

// The two tables spell municipalities inconsistently — "Garcia"/"García",
// "San Nicolas"/"San Nicolás", and "General Escobedo" for what the rest of the
// rows call "Escobedo". Everything is grouped by this key, and the label shown
// is whichever spelling carries its accents.
const MUNICIPIO_ALIASES: Record<string, string> = {
  "general escobedo": "escobedo",
};

export function normalizeName(name?: string | null) {
  if (!name) return null;
  const plain = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return MUNICIPIO_ALIASES[plain] ?? plain;
}

export const municipioKey = normalizeName;
export const estadoKey = normalizeName;

// What kind of source this is first, in the same words the Capas panel uses,
// then the network it belongs to when it has one (`red`, e.g. OCCAMM). Sensors
// with no network just say what they are.
export function getSourceLabel(isSima: boolean, red?: string | null) {
  if (isSima) return "Estación de Gobierno";
  return red ? `Sensor Ciudadano · ${red}` : "Sensor Ciudadano";
}

// A government building or people, matching the two groups the Capas panel
// splits the map into.
export function getSourceIcon(isSima: boolean) {
  return isSima ? Landmark : Users;
}

// The station name to show: SIMA stations carry a friendlier `nombre_display`,
// everything else just uses `nombre`.
export function displayName(sensor: Sensor) {
  return sensor.source === "sima" && sensor.nombre_display
    ? sensor.nombre_display
    : sensor.nombre;
}

// The comma-joined marker / a11y label: source, name, the reading (or "sin
// lectura"), and the quality band. `pm25` is the value for the frame on screen.
export function markerLabel(sensor: Sensor, pm25: number | null) {
  const isSima = sensor.source === "sima";
  const has = pm25 != null && pm25 > 0.4;
  return [
    getSourceLabel(isSima, sensor.red),
    displayName(sensor),
    has ? `${roundPM25(pm25)} μg/m³ PM2.5` : "sin lectura",
    has ? getQualityInfo(pm25)?.label : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function getRelativeDayLabel(date: Date) {
  const now = new Date();
  const dayDiff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  return dayDiff === 0 ? "Hoy" : dayDiff === 1 ? "Ayer" : format(date, "d MMM", { locale: es });
}

export function formatHistoryTime(dateStr: string) {
  const date = new Date(dateStr);
  // Readings land ~30 min past the hour but represent that hour's data —
  // floor to the hour, matching how timestamps are shown everywhere else.
  return `${getRelativeDayLabel(date)} ${format(date, "h")}:00 ${format(date, "a")}`;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

// Build the estación card's view of a sensor from the live data set — the same
// path a click and a ?sensor= link both take.
export function buildSelection(sensor: Sensor, data: Data[]): SelectedSensor {
  const reading = data.find((d) => d.sensor_id === sensor.sensor_id);
  const pm25 = reading?.pm25 ?? null;
  const colorInfo = getPM25Color(pm25);
  return {
    sensor,
    pm25,
    color: colorInfo?.bg ?? "#ffffff",
    textColor: colorInfo?.text ?? "#ffffff",
    readingAt: reading?.time_stamp ?? null,
  };
}
