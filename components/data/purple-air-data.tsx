import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = createClient();

  // Get the timestamp of the most recent reading
  const { data: latestReading, error: timeError } = await supabase
    .from("purpleair_mediciones")
    .select("time_stamp")
    .order("time_stamp", { ascending: false })
    .limit(1);

  if (timeError || !latestReading?.length) {
    console.error("Error finding latest reading:", timeError);
    return [];
  }

  const latestTimestamp = latestReading[0].time_stamp;

  // Extract the date and hour part (2025-05-19 11)
  const hourStart = latestTimestamp.substring(0, 13);

  // Get all readings from the latest hour
  const { data, error } = await supabase
    .from("purpleair_mediciones")
    .select("sensor_id, pm25, time_stamp")
    .like("time_stamp", `${hourStart}%`) // Match the hour prefix
    .order("sensor_id");

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}
