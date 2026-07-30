import { createClient } from "@/utils/supabase/server";

export default async function SimaData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sima_mediciones")
    .select("id, sensor_id, pm25, time_stamp")
    .order("time_stamp", { ascending: false })
    .limit(30);

  if (error) {
    console.error("SIMA Data fetch error:", error);
    throw new Error(`Failed to fetch SIMA data: ${error.message}`);
  }

  if (!data?.length) {
    console.warn("SIMA Data returned no measurements");
    return [];
  }

  // Filter to keep only the latest reading per sensor
  const latestReadings: { [key: string]: (typeof data)[0] } = {};
  data.forEach((reading) => {
    if (!latestReadings[reading.sensor_id]) {
      latestReadings[reading.sensor_id] = reading;
    }
  });

  return Object.values(latestReadings);
}
