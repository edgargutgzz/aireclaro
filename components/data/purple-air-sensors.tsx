import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirSensors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purpleair_sensores")
    .select()
    .eq("estatus", "activo")
    .neq("sensor_id", 132661)
    .neq("sensor_id", 146946)
    .neq("sensor_id", 56441)
    .neq("sensor_id", 39361)
    .neq("sensor_id", 34499) // San Patricio #106
    .neq("sensor_id", 227889)
    .neq("sensor_id", 46841)
    .neq("sensor_id", 174787)
    .neq("sensor_id", 121825); // Grupo Reforma Sierra Madre

  if (error) {
    console.error("PurpleAir Sensors fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir sensors: ${error.message}`);
  }

  return data || [];
}
