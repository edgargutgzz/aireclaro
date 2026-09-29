import { createPublicClient } from "@/utils/supabase/public";
import { cachedMapData } from "./cache";

async function fetchSimaSensors() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("sima_sensores").select("id, sensor_id, nombre, nombre_display, municipio, estado, lat, lon");

  if (error) {
    console.error("SIMA Sensors fetch error:", error);
    throw new Error(`Failed to fetch SIMA sensors: ${error.message}`);
  }

  return data || [];
}

export default cachedMapData(fetchSimaSensors, "sima-sensors");
