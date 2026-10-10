import { fetchEstaciones, fetchUltimoMes } from "@/lib/datos-cache";
import DescargaDatosCard from "@/components/datos/descarga-datos-card";

// The raw-data download card. Only reads what the filter needs (the station
// list and the latest month); the file itself is built by
// app/api/datos/sima-horario on download. The latest month is the charts'
// (the monthly sync's), not the table's newest date: the weekly sync keeps
// the month in progress in the table for internal use, never published here.
export default async function DescargaDatos() {
  const [estaciones, ultimoMes] = await Promise.all([
    fetchEstaciones(),
    fetchUltimoMes().catch(() => null),
  ]);
  if (!ultimoMes) return null;

  const ultimaFecha = `${ultimoMes.ano}-${String(ultimoMes.mes).padStart(2, "0")}`;
  return <DescargaDatosCard estaciones={estaciones} ultimaFecha={ultimaFecha} />;
}
