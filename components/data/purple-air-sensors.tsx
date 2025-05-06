import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirSensors() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purpleair_sensores")
    .select()
    .eq("estatus", "activo")
    .neq("sensor_id", 132661) // lleva semanas marcando 64 (La Gozacion 2)
    .neq("sensor_id", 146946) // lleva días marcando 277.4 (Santa Martha)
    .neq("sensor_id", 174831) // lleva días marcando valores muy altos (Colegio Cambridge de Monterrey Campus Dominio - Secundaria)
    .neq("sensor_id", 34499) // lleva semanas marcando valores muy bajos (San Patricio #106)
    .neq("sensor_id", 56441) // lleva semanas marcando valores muy bajos (Biblioteca Col. Portales, Sta. Catarina N.L.)
    .neq("sensor_id", 36709) // lleva semanas marcando valores muy bajos (San Roberto International School Campus San Agustin)
    .neq("sensor_id", 39361); // lleva semanas marcando valores muy bajos (Instituto Nezaldi)

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}
