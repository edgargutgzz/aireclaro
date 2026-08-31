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
    .neq("sensor_id", 46841)

    .neq("sensor_id", 121825) // Grupo Reforma Sierra Madre
    .neq("sensor_id", 286186) // García Online
    .neq("sensor_id", 267403) // Montenova International School
    .neq("sensor_id", 203629)
    // 227913 has two rows in purpleair_sensores ("Centro de Congresos" and
    // "Sensor_Purple_Air-Explanada_EGA-Sombrillas"), so it draws two markers
    // ~3.7km apart from one reading stream. The PurpleAir device is inactive;
    // dropping the id removes the pair. Same duplicate-id defect affects
    // 221177 and 221261 (both Saltillo) if those need handling too.
    .neq("sensor_id", 227913);

  if (error) {
    console.error("PurpleAir Sensors fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir sensors: ${error.message}`);
  }

  return data || [];
}
