import { createClient } from "@/utils/supabase/server";

export default async function SimaData() {
  const supabase = await createClient();
  // A row-count limit(30) here used to silently drop any station that lagged
  // behind the other ~15 -- with roughly one row per station per ingestion
  // cycle, that limit is barely more than one full cycle of headroom, so one
  // slow/stale station (a real, recurring case, see the SIMA ingestion-lag
  // notes) pushed its own latest reading out of the window and the station
  // vanished from the map entirely (read as a no-data grey disc) even though
  // it had a real, just-older reading. A time window guarantees every
  // station's true latest reading is fetched regardless of relative lag; 24h
  // comfortably covers realistic delays while still bounding the row count.
  const { data, error } = await supabase
    .from("sima_mediciones")
    .select("id, sensor_id, pm25, time_stamp")
    .gte("time_stamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("time_stamp", { ascending: false });

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
