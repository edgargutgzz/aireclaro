import { createClient } from "@/utils/supabase/server";

export async function fetchSensors() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sensores")
    .select()
    .eq("estatus", "activo");

  if (error) {
    throw new Error("Error fetching sensors: " + error.message);
  }

  return data;
}

export default async function PurpleAirSensores() {
  const calidad_aire = await fetchSensors();

  return <pre>{JSON.stringify(calidad_aire, null, 2)}</pre>;
}
