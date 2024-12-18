import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirSensors() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purpleair_sensores")
    .select()
    .eq("estatus", "activo")
    .neq("sensor_id", 174831)
    .neq("sensor_id", 146946);
  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}
