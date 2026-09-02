import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { monterreyNaiveHoursAgo, monterreyHourKey } from "@/lib/monterrey-time";

// The whole marker field over a recent window, bucketed to the hour, so the map
// can be scrubbed through an episode without a fetch per step. One payload, held
// client-side; scrubbing is then an array lookup.
//
//   { hours:  ["2026-09-01T00", …],              ascending hour keys present
//     series: { "<sensor_id>": [12, 14, null, …] } pm25 per hour, aligned to hours }
//
// Windowed and hourly on purpose — this is for reading recent episodes, not the
// historical archive that the /datos section owns.

const DEFAULT_HOURS = 72;
const MAX_HOURS = 24 * 7;
const PAGE = 1000; // Supabase caps a single select; page through in chunks.
const MAX_PAGES = 20;

type Row = { sensor_id: number; pm25: number | null; time_stamp: string };

async function fetchWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "purpleair_mediciones" | "sima_mediciones",
  since: string,
): Promise<Row[]> {
  const out: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const { data, error } = await supabase
      .from(table)
      .select("sensor_id, pm25, time_stamp")
      .gte("time_stamp", since)
      .not("pm25", "is", null)
      .order("time_stamp", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hours = Math.min(
    MAX_HOURS,
    Math.max(6, Number(searchParams.get("hours")) || DEFAULT_HOURS),
  );
  const since = monterreyNaiveHoursAgo(hours);

  const supabase = await createClient();

  let rows: Row[];
  try {
    const [pa, sima] = await Promise.all([
      fetchWindow(supabase, "purpleair_mediciones", since),
      fetchWindow(supabase, "sima_mediciones", since),
    ]);
    rows = [...pa, ...sima];
  } catch (error) {
    console.error("field-history fetch error:", error);
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }

  // Average the readings that land in the same hour bucket, one value per
  // sensor + hour.
  const hourKeys = new Set<string>();
  const perSensor = new Map<number, Map<string, { sum: number; n: number }>>();

  for (const row of rows) {
    if (row.pm25 == null) continue;
    const key = monterreyHourKey(row.time_stamp);
    hourKeys.add(key);
    let buckets = perSensor.get(row.sensor_id);
    if (!buckets) {
      buckets = new Map();
      perSensor.set(row.sensor_id, buckets);
    }
    const bucket = buckets.get(key) ?? { sum: 0, n: 0 };
    bucket.sum += row.pm25;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  const orderedHours = [...hourKeys].sort();
  const indexOf = new Map(orderedHours.map((h, i) => [h, i]));

  const series: Record<string, (number | null)[]> = {};
  for (const [sensorId, buckets] of perSensor) {
    const arr: (number | null)[] = new Array(orderedHours.length).fill(null);
    for (const [key, { sum, n }] of buckets) {
      arr[indexOf.get(key)!] = Math.round((sum / n) * 10) / 10;
    }
    series[sensorId] = arr;
  }

  return NextResponse.json(
    { hours: orderedHours, series },
    { headers: { "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" } },
  );
}
