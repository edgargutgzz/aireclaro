// Shared shapes for the map surface (mapa-sensors.tsx and its extracted parts).

export interface Sensor {
  id: number;
  sensor_id: number;
  nombre: string;
  nombre_display?: string;
  lat: number;
  lon: number;
  source: string; // purpleAir o sima
  red?: string | null;
  municipio?: string | null;
  estado?: string | null;
}

export interface Data {
  id: number;
  sensor_id: number;
  pm25: number;
  time_stamp: string;
}

export interface HistoryPoint {
  pm25: number;
  time_stamp: string;
}

// What the estación card renders when a marker is picked. Built the same way
// whether the pick comes from a click or from ?sensor= on load, so both paths
// go through buildSelection.
export type SelectedSensor = {
  sensor: Sensor;
  pm25: number | null;
  color: string;
  textColor: string;
  // Raw, not pre-formatted: the freshness badge needs to work out how old this is.
  readingAt: string | null;
};

// The whole marker field over a recent window, from /api/field-history: one
// pm25 value per sensor per hour, so the time scrubber is an array lookup.
export type FieldHistory = { hours: string[]; series: Record<string, (number | null)[]> };
