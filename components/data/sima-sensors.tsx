import { createClient } from "@/utils/supabase/server";

export default async function SimaSensors() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sima_sensores").select("id, sensor_id, nombre, nombre_display, municipio, estado, lat, lon");

  if (error) {
    console.error("SIMA Sensors fetch error:", error);
    throw new Error(`Failed to fetch SIMA sensors: ${error.message}`);
  }

  return data || [];
}
