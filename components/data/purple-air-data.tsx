import { cachedMapData } from "./cache";
import { fetchLiveReadings } from "@/lib/live-readings";

// The map's PurpleAir readings. If the hourly job stops, or one sensor's
// request keeps failing, its readings age out of the live window and the
// sensor stops being drawn instead of showing an old value as current.
export default cachedMapData(() => fetchLiveReadings<number>("purpleair_mediciones"), "purpleair-data");
