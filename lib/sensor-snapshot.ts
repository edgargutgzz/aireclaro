import { createPublicClient } from "@/utils/supabase/public";

// PurpleAir ids are integers, SIMA station ids are text codes ("CE").
export type SensorSnapshot = {
  sensorId: number | string;
  source: "purpleAir" | "sima";
  name: string;
  municipio: string | null;
  pm25: number | null;
  readingAt: string | null;
};

// One station's identity plus its latest PM2.5 reading, resolved by sensor_id
// across both networks. Shared by the map page's generateMetadata and the OG
// image route so a ?sensor= link and its unfurl card always agree. Callers
// reach this only on a shared link, not on every map load.
//
// SIMA is checked first because it's the smaller table; a sensor_id that
// isn't there falls through to PurpleAir. Duplicate sensor rows (a device
// moved and renamed on PurpleAir) are resolved by taking the highest id,
// which is the live row — see the note in components/data/purple-air-sensors.tsx.
export async function getSensorSnapshot(
  sensorId: number | string,
): Promise<SensorSnapshot | null> {
  const supabase = createPublicClient();

  const sima = await supabase
    .from("sima_sensores")
    .select("nombre, nombre_display, municipio")
    .eq("sensor_id", sensorId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sima.data) {
    const reading = await latestReading(supabase, "sima_mediciones", sensorId);
    return {
      sensorId,
      source: "sima",
      name: sima.data.nombre_display || sima.data.nombre,
      municipio: sima.data.municipio ?? null,
      pm25: reading?.pm25 ?? null,
      readingAt: reading?.time_stamp ?? null,
    };
  }

  // A text code can only be SIMA; don't send it to PurpleAir's integer column.
  if (typeof sensorId !== "number") return null;

  const purpleAir = await supabase
    .from("purpleair_sensores")
    .select("nombre, municipio")
    .eq("sensor_id", sensorId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (purpleAir.data) {
    const reading = await latestReading(supabase, "purpleair_mediciones", sensorId);
    return {
      sensorId,
      source: "purpleAir",
      name: purpleAir.data.nombre,
      municipio: purpleAir.data.municipio ?? null,
      pm25: reading?.pm25 ?? null,
      readingAt: reading?.time_stamp ?? null,
    };
  }

  return null;
}

async function latestReading(
  supabase: ReturnType<typeof createPublicClient>,
  table: "sima_mediciones" | "purpleair_mediciones",
  sensorId: number | string,
) {
  const { data } = await supabase
    .from(table)
    .select("pm25, time_stamp")
    .eq("sensor_id", sensorId)
    .order("time_stamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
