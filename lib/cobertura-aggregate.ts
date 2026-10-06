import type { PromedioDiario } from "@/lib/promedios-diarios";

// Shared by the monthly sync cron, same as lib/dias-insalubres-aggregate.ts.
// Reads sima_promedios_diarios for both pollutants -- that view emits one row
// per (sensor_id, fecha, parametro) for the *entire* ingested range, with
// promedio NULL when the >=18-valid-hour / 75% completeness rule wasn't met
// (a real row, not a missing one -- see project memory). So "cubierto" is
// simply "promedio is not null", no separate threshold logic needed here.
// Saltillo (FIN) excluded, per project convention, it isn't part of this
// metro area.

export interface CoberturaDia {
  sensor_id: string;
  fecha: string;
  parametro: "PM2.5" | "PM10";
  cubierto: boolean;
}

// Rows come from the monthly cron's single read of sima_promedios_diarios
// (lib/promedios-diarios.ts), null-promedio days included.
export function computeCoberturaDiaria(rows: PromedioDiario[]): CoberturaDia[] {
  return rows.map((r) => ({
    sensor_id: r.sensor_id,
    fecha: r.fecha,
    parametro: r.parametro,
    cubierto: r.promedio !== null,
  }));
}
