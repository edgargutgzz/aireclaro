import { fetchEstaciones, fetchUltimoMes } from "@/lib/datos-cache";
import DatosHeader from "@/components/datos/datos-header";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, m - 1, 1)))
    .replace(".", "");

// Reads what the dashboard header states from the data (station count, last
// month) and hands it to the header panel (components/datos/datos-header.tsx).
export default async function ActualizacionMensual() {
  const [estaciones, ultimo] = await Promise.all([
    fetchEstaciones().catch(() => null),
    fetchUltimoMes().catch(() => null),
  ]);

  const descripcion = `Mediciones horarias de PM2.5 y PM10 de ${
    estaciones ? `las ${estaciones.length} estaciones` : "las estaciones"
  } del SIMA en la Zona Metropolitana de Monterrey.`;
  const periodo = ultimo ? `ene ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} ${ultimo.ano}` : null;

  return <DatosHeader descripcion={descripcion} periodo={periodo} />;
}
