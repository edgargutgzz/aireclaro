import { createPublicClient } from "@/utils/supabase/public";
import { cachedMapData } from "./cache";

async function fetchPurpleAirSensors() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("purpleair_sensores")
    .select()
    .eq("estatus", "activo")
    .neq("sensor_id", 132661)
    .neq("sensor_id", 146946)
    .neq("sensor_id", 56441)
    .neq("sensor_id", 39361)
    .neq("sensor_id", 34499) // San Patricio #106
    .neq("sensor_id", 46841)

    .neq("sensor_id", 121825) // Grupo Reforma Sierra Madre
    .neq("sensor_id", 286186) // García Online
    .neq("sensor_id", 267403) // Montenova International School
    .neq("sensor_id", 203629);
  // Note: sensor_id 227913 has two rows in purpleair_sensores after the device
  // was moved and renamed on PurpleAir (id=161 "Centro de Congresos", the stale
  // one; id=193 "Explanada EGA Sombrillas", the live one). The ghost is handled
  // by setting id=161 to estatus != "activo" in Supabase, not with a .neq here,
  // so the live row keeps showing. Same duplicate-id shape on 221177 and 221261.

  if (error) {
    console.error("PurpleAir Sensors fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir sensors: ${error.message}`);
  }

  return data || [];
}

export default cachedMapData(fetchPurpleAirSensors, "purpleair-sensors");
