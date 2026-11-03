import { createPublicClient } from "@/utils/supabase/public";
import { isValidPM25 } from "@/lib/air-quality";
import { monterreyNaiveHoursAgo } from "@/lib/monterrey-time";
import { channelsDisagree, correctPurpleAirReadings } from "@/lib/purpleair-correction";

// The site's one "is this live?" rule: a reading counts only if it's from the
// last 90 minutes, i.e. the latest hour that should be posted by now is there.
// SIMA posts hour H by about H:25 (measured 2026-10-19), so 90 minutes after
// the reading's hour is the moment the next one is overdue; PurpleAir writes
// every hour at :01. Older = gray disc on the map (user's call 2026-10-24,
// was 3 hours). The map (both sources), its
// default card, the homepage card and the /mapa link card all go through it.
export const LIVE_MINUTES = 90;

export interface LiveReading<Id extends string | number> {
  id: number;
  sensor_id: Id;
  pm25: number;
  time_stamp: string;
}

// Each sensor's latest reading from the last LIVE_MINUTES, dropped if that
// reading is no data (-9999, small negatives): a sensor here always has a
// value to draw, and one missing has nothing current. A time window, not a row
// limit, so a sensor lagging behind the others is still found (a limit(30)
// once silently dropped lagging stations); ~150 rows an hour, well under the
// 1,000-row cap. time_stamp is naive Monterrey wall-clock, so the bound is
// built in the same terms.
export async function fetchLiveReadings<Id extends string | number>(
  table: "sima_mediciones" | "purpleair_mediciones",
): Promise<LiveReading<Id>[]> {
  const isPurpleAir = table === "purpleair_mediciones";
  const { data, error } = await createPublicClient()
    .from(table)
    .select(isPurpleAir ? "id, sensor_id, pm25, time_stamp, humidity, pm25_a, pm25_b" : "id, sensor_id, pm25, time_stamp")
    .gte("time_stamp", monterreyNaiveHoursAgo(LIVE_MINUTES / 60))
    .order("time_stamp", { ascending: false });

  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);

  type Row = LiveReading<Id> & { humidity?: number | null; pm25_a?: number | null; pm25_b?: number | null };
  const latest = new Map<Id, Row>();
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!latest.has(r.sensor_id)) latest.set(r.sensor_id, r);
  }
  const valid = [...latest.values()].filter((r) => isValidPM25(r.pm25));
  // Citizen sensors are shown EPA-corrected, and not at all for an hour when
  // their two channels disagree (lib/purpleair-correction.ts); validity is
  // judged on the raw value, before the correction.
  if (!isPurpleAir) return valid;
  const agreeing = valid.filter((r) => !channelsDisagree(r.pm25_a, r.pm25_b));
  return correctPurpleAirReadings(agreeing.map((r) => ({ ...r, humidity: r.humidity ?? null }))).map(
    ({ humidity: _humidity, pm25_a: _a, pm25_b: _b, ...r }) => r,
  );
}
