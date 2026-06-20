import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purpleair_latest")
    .select("id, sensor_id, pm25, time_stamp");

  if (error) {
    console.error("PurpleAir Data fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir data: ${error.message}`);
  }

  if (!data?.length) {
    console.warn("PurpleAir Data returned no measurements");
    return [];
  }

  return data;
}
