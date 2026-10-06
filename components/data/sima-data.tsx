import { createPublicClient } from "@/utils/supabase/public";
import { cachedMapData } from "./cache";
import { monterreyNaiveHoursAgo } from "@/lib/monterrey-time";

async function fetchSimaData() {
  const supabase = createPublicClient();
  // A time window, not a row limit, so every station's own latest reading is
  // fetched regardless of how far behind the others it is (a limit(30) once
  // silently dropped lagging stations). The window is the site's one "is this
  // live?" rule, 3 hours, shared with the hourly SIMA job, the homepage
  // ticker and the default card: a station with nothing newer has no reading
  // here and draws as the gray no-data disc, so an outage (SINAICA's Nuevo
  // León feed on 2026-10-05/06) shows on the map instead of old values posing
  // as current. The bound is naive Monterrey wall-clock, like time_stamp
  // (this used to compare a UTC ISO string, which made "24 h" about 18 h).
  const { data, error } = await supabase
    .from("sima_mediciones")
    .select("id, sensor_id, pm25, time_stamp")
    .gte("time_stamp", monterreyNaiveHoursAgo(3))
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

export default cachedMapData(fetchSimaData, "sima-data");
