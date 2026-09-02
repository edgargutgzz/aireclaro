import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { monterreyNaiveHoursAgo, monterreyHourKey } from "@/lib/monterrey-time";

// The whole marker field over a recent window, bucketed to the hour, so the map
// can be scrubbed through an episode without a fetch per step. One payload, held
// client-side; scrubbing is then an array lookup.
//
//   { hours:  ["2026-08-19T00", …],              ascending hour keys present
//     series: { "<sensor_id>": [12, 14, null, …] } pm25 per hour, aligned to hours }
//
// Primary path is the field_history() Postgres function (sql/field_history.sql):
// it aggregates in the database and returns ~180 rows regardless of window
// length. If that function isn't installed yet, we fall back to paging raw
// measurement rows, which the row cap limits to roughly the last four days.

const DEFAULT_HOURS = 24 * 14; // two weeks
const MAX_HOURS = 24 * 31;
const PAGE = 1000;
const MAX_PAGES = 20;

type PerSensor = Map<number, Map<string, number>>;

// field_history() rows: one per sensor, parallel arrays.
type RpcRow = { sensor_id: number; source: string; hours: string[]; pm25: (number | null)[] };

async function viaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  since: string,
): Promise<{ perSensor: PerSensor; hourKeys: Set<string> } | null> {
  const { data, error } = await supabase.rpc("field_history", { since_ts: since });
  if (error) {
    console.warn("field_history() unavailable, paging raw rows:", error.message);
    return null;
  }
  const perSensor: PerSensor = new Map();
  const hourKeys = new Set<string>();
  for (const row of (data ?? []) as RpcRow[]) {
    const buckets = new Map<string, number>();
    row.hours.forEach((h, i) => {
      const v = row.pm25[i];
      if (v != null) {
        buckets.set(h, v);
        hourKeys.add(h);
      }
    });
    perSensor.set(Number(row.sensor_id), buckets);
  }
  return { perSensor, hourKeys };
}

async function viaPages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  since: string,
): Promise<{ perSensor: PerSensor; hourKeys: Set<string> }> {
  const perSensor: PerSensor = new Map();
  const hourKeys = new Set<string>();
  const acc = new Map<number, Map<string, { sum: number; n: number }>>();

  for (const table of ["purpleair_mediciones", "sima_mediciones"] as const) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE;
      // Newest first: the row cap then covers the most recent hours in full
      // (where playback lives) rather than the oldest. The assembly re-sorts
      // hour keys ascending regardless.
      const { data, error } = await supabase
        .from(table)
        .select("sensor_id, pm25, time_stamp")
        .gte("time_stamp", since)
        .not("pm25", "is", null)
        .order("time_stamp", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      for (const row of (data ?? []) as { sensor_id: number; pm25: number | null; time_stamp: string }[]) {
        if (row.pm25 == null) continue;
        const key = monterreyHourKey(row.time_stamp);
        hourKeys.add(key);
        let s = acc.get(row.sensor_id);
        if (!s) { s = new Map(); acc.set(row.sensor_id, s); }
        const b = s.get(key) ?? { sum: 0, n: 0 };
        b.sum += row.pm25;
        b.n += 1;
        s.set(key, b);
      }
      if (!data || data.length < PAGE) break;
    }
  }

  for (const [id, buckets] of acc) {
    const out = new Map<string, number>();
    for (const [key, { sum, n }] of buckets) out.set(key, Math.round((sum / n) * 10) / 10);
    perSensor.set(id, out);
  }
  return { perSensor, hourKeys };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hours = Math.min(
    MAX_HOURS,
    Math.max(6, Number(searchParams.get("hours")) || DEFAULT_HOURS),
  );
  const since = monterreyNaiveHoursAgo(hours);

  const supabase = await createClient();

  let result: { perSensor: PerSensor; hourKeys: Set<string> };
  try {
    result = (await viaRpc(supabase, since)) ?? (await viaPages(supabase, since));
  } catch (error) {
    console.error("field-history fetch error:", error);
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }

  const orderedHours = [...result.hourKeys].sort();
  const indexOf = new Map(orderedHours.map((h, i) => [h, i]));

  const series: Record<string, (number | null)[]> = {};
  for (const [sensorId, buckets] of result.perSensor) {
    const arr: (number | null)[] = new Array(orderedHours.length).fill(null);
    for (const [key, value] of buckets) {
      const i = indexOf.get(key);
      if (i !== undefined) arr[i] = value;
    }
    series[sensorId] = arr;
  }

  return NextResponse.json(
    { hours: orderedHours, series },
    { headers: { "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" } },
  );
}
