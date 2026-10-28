import { fetchUltimoMes } from "@/lib/datos-cache";
import DatosHeader from "@/components/datos/datos-header";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025

const nombreMes = (ano: number, m: number, month: "short" | "long") =>
  new Intl.DateTimeFormat("es-MX", { month, timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, m - 1, 1)))
    .replace(".", "");

// Reads the period the dashboard header states from the data (the last
// month) and hands it to the header panel (components/datos/datos-header.tsx).
export default async function ActualizacionMensual() {
  const ultimo = await fetchUltimoMes().catch(() => null);
  // Full month names on desktop, abbreviated below lg where the two facts
  // share a phone-width row.
  const periodo = ultimo
    ? {
        corto: `ene ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes, "short")} ${ultimo.ano}`,
        largo: `enero ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes, "long")} ${ultimo.ano}`,
      }
    : null;
  return <DatosHeader periodo={periodo} />;
}
