import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirSensors() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purpleair_sensores")
    .select()
    .eq("estatus", "activo")
    .neq("sensor_id", 132661) // lleva semanas marcando 64
    .neq("sensor_id", 146946) // lleva días marcando 277.4
    .neq("sensor_id", 174831); // lleva días marcando valores muy altos

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}
