import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirSensors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purpleair_sensores")
    .select()
    .eq("estatus", "activo")
    .neq("sensor_id", 132661)
    .neq("sensor_id", 146946)
    .neq("sensor_id", 174831)
    .neq("sensor_id", 56441)
    .neq("sensor_id", 39361)
    .neq("sensor_id", 46841)
    .neq("sensor_id", 34499)
    .neq("sensor_id", 208785);

  if (error) {
    console.error("PurpleAir Sensors fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir sensors: ${error.message}`);
  }

  return data || [];
}
