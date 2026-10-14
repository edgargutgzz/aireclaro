import { cachedMapData } from "./cache";
import { fetchLiveReadings } from "@/lib/live-readings";

// The map's PurpleAir readings. The hourly job's activo/inactivo status only
// moves while the job runs; if it stops, or one sensor's request keeps
// failing, its readings age out of the live window and the sensor stops being
// drawn instead of showing an old value as current.
export default cachedMapData(() => fetchLiveReadings<number>("purpleair_mediciones"), "purpleair-data");
