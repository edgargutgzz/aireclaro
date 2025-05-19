import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("purpleair_mediciones")
    .select("id, sensor_id, pm25, time_stamp")
    .order("time_stamp", { ascending: false })
    .limit(100);

  if (error || !data?.length) {
    return [];
  }

  // Filter to keep only the latest reading per sensor
  const latestReadings: { [key: number]: (typeof data)[0] } = {};
  data.forEach((reading) => {
    if (!latestReadings[reading.sensor_id]) {
      latestReadings[reading.sensor_id] = reading;
    }
  });

  return Object.values(latestReadings);
}
