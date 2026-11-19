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
    .neq("sensor_id", 208785) // Colegio Cambridge Campus Anáhuac (stuck at 274, 2026-11-19)
    .neq("sensor_id", 288306); // TEC-AMM-RC-001, Cadereyta (stuck at 199, 2026-11-19)
  // purpleair_sensores is a history of every sensor ever registered: when a
  // device moves or is renamed, a new row is added with the same sensor_id and
  // the old row is set to estatus "historico" (kept, never shown, never touched
  // by the hourly job). Done 2026-10-07 for ids 161, 138, 149 (old rows of
  // 227913, 221177, 221261) and 194 (227867, gone from PurpleAir). The .neq
  // list above is a separate, hand-kept hide list for live sensors.

  if (error) {
    console.error("PurpleAir Sensors fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir sensors: ${error.message}`);
  }

  return data || [];
}

export default cachedMapData(fetchPurpleAirSensors, "purpleair-sensors");
