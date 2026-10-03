import { createPublicClient } from "@/utils/supabase/public";
import { cachedDatos, fetchEstaciones } from "@/lib/datos-cache";
import DescargaDatosCard from "@/components/datos/descarga-datos-card";

// The raw-data download card. Only reads what the filter needs (the station
// list and the latest loaded date); the file itself is built by
// app/api/datos/sima-horario on download.
const fetchUltimaFecha = cachedDatos(async (): Promise<string | null> => {
  const { data, error } = await createPublicClient()
    .from("sima_mediciones_finales")
    .select("fecha")
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load descarga de datos: ${error.message}`);
  return data?.fecha ?? null;
}, "ultima-fecha");

export default async function DescargaDatos() {
  const [estaciones, ultimaFecha] = await Promise.all([
    fetchEstaciones(),
    fetchUltimaFecha().catch(() => null),
  ]);
  if (!ultimaFecha) return null;

  return <DescargaDatosCard estaciones={estaciones} ultimaFecha={ultimaFecha} />;
}
