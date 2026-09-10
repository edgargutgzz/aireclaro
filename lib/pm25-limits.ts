// NOM-025-SSA1-2021 daily limits. Changed 2025-12-27 (source: the client's own
// observatoriodelaire.com project, lib/pm25-limits.ts, ported verbatim).
export function getLimitForDate(fecha: string): number {
  return fecha >= "2025-12-27" ? 25 : 33;
}

export function getLimitForDatePM10(fecha: string): number {
  return fecha >= "2025-12-27" ? 50 : 60;
}
