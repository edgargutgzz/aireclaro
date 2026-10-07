import { createPublicClient } from "@/utils/supabase/public";
import { cachedMapData } from "./cache";
import { monterreyNaiveHoursAgo } from "@/lib/monterrey-time";

async function fetchPurpleAirData() {
  const supabase = createPublicClient();

  // The last 3 hours only, the site's one "is this live?" rule (same window
  // as the SIMA feed in sima-data.tsx). The job's activo/inactivo status only
  // moves while the job runs; if it stops, or one sensor's request keeps
  // failing, no new readings arrive and these age out, so the sensor stops
  // being drawn instead of showing an old value as current. Naive Monterrey
  // wall-clock, like time_stamp. ~150 readings an hour, well under the
  // 1,000-row cap.
  const { data, error } = await supabase
    .from("purpleair_mediciones")
    .select("id, sensor_id, pm25, time_stamp")
    .gte("time_stamp", monterreyNaiveHoursAgo(3))
    .order("time_stamp", { ascending: false });

  if (error) {
    console.error("PurpleAir Data fetch error:", error);
    throw new Error(`Failed to fetch PurpleAir data: ${error.message}`);
  }

  if (!data?.length) {
    console.warn("PurpleAir Data returned no measurements");
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

export default cachedMapData(fetchPurpleAirData, "purpleair-data");
