import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purpleair_mediciones")
    .select("sensor_id, pm25, time_stamp")
    .order("time_stamp", { ascending: false })
    .limit(100); // Limits results to the 100 most recent readings

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}
