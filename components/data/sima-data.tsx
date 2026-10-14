import { cachedMapData } from "./cache";
import { fetchLiveReadings } from "@/lib/live-readings";

// The map's SIMA readings. A station with none draws as the gray "sin
// actualizar" disc, so an outage shows on the map instead of old values
// posing as current.
export default cachedMapData(() => fetchLiveReadings<string>("sima_mediciones"), "sima-data");
