import { fetchUltimoMes } from "@/lib/datos-cache";
import DatosHeader from "@/components/datos/datos-header";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, m - 1, 1)))
    .replace(".", "");

// Reads the period the dashboard header states from the data (the last
// month) and hands it to the header panel (components/datos/datos-header.tsx).
export default async function ActualizacionMensual() {
  const ultimo = await fetchUltimoMes().catch(() => null);
  const periodo = ultimo ? `ene ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} ${ultimo.ano}` : null;
  return <DatosHeader periodo={periodo} />;
}
