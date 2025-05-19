import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = createClient();

  try {
    // Get the most recent 100 readings (simplest approach)
    const { data, error } = await supabase
      .from("purpleair_mediciones")
      .select("id, sensor_id, pm25, time_stamp")
      .order("time_stamp", { ascending: false })
      .limit(100);

    if (error) {
      console.log("Error fetching readings:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("No data returned from query");
      return [];
    }

    console.log("Total readings fetched:", data.length);

    // Filter to keep only the latest reading per sensor
    const latestReadings: { [key: number]: (typeof data)[0] } = {};
    data.forEach((reading) => {
      if (!latestReadings[reading.sensor_id]) {
        latestReadings[reading.sensor_id] = reading;
      }
    });

    const result = Object.values(latestReadings);
    console.log("Unique sensors after filtering:", result.length);

    return result;
  } catch (err) {
    console.log("Unexpected error in PurpleAirData:", err);
    return [];
  }
}
