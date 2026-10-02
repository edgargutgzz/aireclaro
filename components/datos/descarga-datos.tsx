import { createPublicClient } from "@/utils/supabase/public";
import DescargaDatosCard from "@/components/datos/descarga-datos-card";

// The raw-data download card. Only reads what the filter needs (the station
// list and the latest loaded date); the file itself is built by
// app/api/datos/sima-horario on download.
export default async function DescargaDatos() {
  const supabase = createPublicClient();

  const [{ data: estaciones, error: estacionesError }, { data: ultima, error: ultimaError }] =
    await Promise.all([
      supabase
        .from("sima_sensores")
        .select("sensor_id, nombre_display")
        .neq("sensor_id", "FIN")
        .order("nombre_display"),
      supabase
        .from("sima_mediciones_finales")
        .select("fecha")
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (estacionesError) {
    throw new Error(`Failed to load descarga de datos: ${estacionesError.message}`);
  }
  if (ultimaError || !ultima) return null;

  return (
    <DescargaDatosCard
      estaciones={(estaciones ?? []).map((e) => ({ sensorId: e.sensor_id, nombre: e.nombre_display }))}
      ultimaFecha={ultima.fecha}
    />
  );
}
