import { createPublicClient } from "@/utils/supabase/public";
import { isValidPM25 } from "@/lib/air-quality";
import { monterreyNaiveHoursAgo } from "@/lib/monterrey-time";

// The site's one "is this live?" rule: a reading counts only if it's from the
// last 3 hours. The SIMA job, the map (both sources), its default card, the
// homepage ticker and the /mapa link card all go through it.
export const LIVE_HOURS = 3;

export interface LiveReading<Id extends string | number> {
  id: number;
  sensor_id: Id;
  pm25: number;
  time_stamp: string;
}

// Each sensor's latest reading from the last LIVE_HOURS, dropped if that
// reading is no data (-9999, small negatives): a sensor here always has a
// value to draw, and one missing has nothing current. A time window, not a row
// limit, so a sensor lagging behind the others is still found (a limit(30)
// once silently dropped lagging stations); ~150 rows an hour, well under the
// 1,000-row cap. time_stamp is naive Monterrey wall-clock, so the bound is
// built in the same terms.
export async function fetchLiveReadings<Id extends string | number>(
  table: "sima_mediciones" | "purpleair_mediciones",
): Promise<LiveReading<Id>[]> {
  const { data, error } = await createPublicClient()
    .from(table)
    .select("id, sensor_id, pm25, time_stamp")
    .gte("time_stamp", monterreyNaiveHoursAgo(LIVE_HOURS))
    .order("time_stamp", { ascending: false });

  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);

  const latest = new Map<Id, LiveReading<Id>>();
  for (const r of (data ?? []) as LiveReading<Id>[]) {
    if (!latest.has(r.sensor_id)) latest.set(r.sensor_id, r);
  }
  return [...latest.values()].filter((r) => isValidPM25(r.pm25));
}
