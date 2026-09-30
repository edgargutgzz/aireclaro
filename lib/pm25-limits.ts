// NOM-025-SSA1-2021 daily limits. Changed 2025-12-27 (source: the client's own
// observatoriodelaire.com project, lib/pm25-limits.ts, ported verbatim).
export function getLimitForDate(fecha: string): number {
  return fecha >= "2025-12-27" ? 25 : 33;
}

export function getLimitForDatePM10(fecha: string): number {
  return fecha >= "2025-12-27" ? 50 : 60;
}

// The daily limit in force today (the norm's final, Año 5 step), applied
// to every date alike. Used only for the cross-year comparison on /datos,
// which needs one yardstick for all years; the official per-month count
// keeps judging each day by the limit in force on that date (above).
export const LIMITE_ACTUAL_PM25 = getLimitForDate("9999-12-31");
export const LIMITE_ACTUAL_PM10 = getLimitForDatePM10("9999-12-31");

// NOM-025-SSA1-2021 Tabla 1's ANNUAL limit, gradual by "Año 1/3/5" bracket
// (counted from the norm's entry into force: publication 2021-10-27 + 60
// días naturales = 2021-12-26). PM2.5's own annual limit is flat at 10
// µg/m³ across every bracket, so only PM10 needs this: 36 (Año1) -> 28
// (Año3) -> 20 (Año5). Reuses the exact same 2025-12-27 era boundary as the
// daily limits above -- verified against the norm's own Tabla 1 (DOF PDF,
// read directly 2026-09-28): those two daily values land precisely on
// Tabla 1's Año3->Año5 column, so the era boundary is the same, just
// applied per calendar year instead of per day (an annual figure is
// evaluated once for the whole año calendario, not day by day). Año1's own
// bracket (2022-2023) never needs a branch here -- the underlying data
// (sima_mediciones_finales) only starts 2025-01-01.
export function getLimitAnualPM10(ano: number): number {
  return ano >= 2026 ? 20 : 28;
}
