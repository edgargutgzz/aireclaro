import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { monterreyNaiveNow, monterreyNaiveHoursAgo, monterreyHourKey } from "@/lib/monterrey-time";

// The whole marker field over a rolling recent window, bucketed to the hour, so
// the map can be scrubbed through an episode without a fetch per step. One
// payload, held client-side; scrubbing is then an array lookup.
//
//   { hours:  ["2026-07-22T00", …],              ascending hour keys present
//     series: { "<sensor_id>": [12, 14, null, …] } pm25 per hour, aligned to hours }
//
// Primary path is the field_history() Postgres function (sql/field_history.sql):
// it aggregates in the database and returns ~180 rows regardless of window
// length. If that function isn't installed yet, we fall back to paging raw
// measurement rows, which the row cap limits to roughly the last few days of
// PurpleAir (SIMA's 16 stations fit whatever the window).

// A rolling 42-day window: bounded so the aggregation stays well under
// Supabase's request ceiling (~60 days is where it starts timing out), and long
// enough to show weekly cycles and any recent episode. Deep history is the
// /datos section's job, not the scrubber's.
const WINDOW_DAYS = 42;
// An explicit ?since= may reach a little further back, but not past what the
// aggregation can serve before the request ceiling (~60 days).
const MAX_WINDOW_DAYS = 50;
const PAGE = 1000;
const MAX_PAGES = 20;

// Start of the day, N days ago, in naive Monterrey terms. Flooring to midnight
// keeps the value stable for 24h so the CDN cache + warming cron aren't
// defeated by a `since` that changes every request.
function midnightDaysAgo(days: number): string {
  return `${monterreyNaiveHoursAgo(days * 24).slice(0, 10)}T00:00:00`;
}

// ?since=YYYY-MM-DD[THH:MM[:SS]], naive Monterrey wall-clock, clamped to
// [MAX_WINDOW_DAYS ago, now]. Anything absent or unparseable is the rolling
// 42-day default.
function resolveSince(raw: string | null): string {
  const rollingDefault = midnightDaysAgo(WINDOW_DAYS);
  const m = raw?.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?$/);
  if (!m) return rollingDefault;
  const iso = `${m[1]}T${m[2] ?? "00:00"}:${m[3] ?? "00"}`;
  const floor = midnightDaysAgo(MAX_WINDOW_DAYS);
  if (iso < floor) return floor;
  if (iso > monterreyNaiveNow()) return rollingDefault;
  return iso;
}

// Keyed by String(sensor_id): PurpleAir ids are numeric, SIMA station ids are
// string codes ("SE", "NO", "Norte2"…).
type PerSensor = Map<string, Map<string, number>>;

// field_history() rows: one per sensor, parallel arrays.
type RpcRow = { sensor_id: string; source: string; hours: string[]; pm25: (number | null)[] };

async function viaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  since: string,
): Promise<{ perSensor: PerSensor; hourKeys: Set<string> } | null> {
  // The 2-month aggregation sits near Supabase's request ceiling and gets
  // killed (57014) on a cold cache maybe 1 call in 10. An immediate retry runs
  // against warm buffers and lands in ~3s, so try up to 3 times before giving
  // up to the paged fallback.
  let result = await supabase.rpc("field_history", { since_ts: since });
  for (let attempt = 1; attempt < 3 && result.error?.code === "57014"; attempt++) {
    result = await supabase.rpc("field_history", { since_ts: since });
  }
  const { data, error } = result;
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
      // > 0.4 is the "valid reading" threshold used everywhere; it also drops
      // SIMA's -9999 no-data sentinel.
      if (v != null && v > 0.4) {
        buckets.set(h, v);
        hourKeys.add(h);
      }
    });
    perSensor.set(String(row.sensor_id), buckets);
  }
  return { perSensor, hourKeys };
}

async function viaPages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  since: string,
): Promise<{ perSensor: PerSensor; hourKeys: Set<string> }> {
  const perSensor: PerSensor = new Map();
  const hourKeys = new Set<string>();
  const acc = new Map<string, Map<string, { sum: number; n: number }>>();

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
        .gt("pm25", 0.4)
        .order("time_stamp", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      for (const row of (data ?? []) as { sensor_id: number | string; pm25: number | null; time_stamp: string }[]) {
        // Drops nulls and SIMA's -9999 no-data sentinel.
        if (row.pm25 == null || row.pm25 <= 0.4) continue;
        const key = monterreyHourKey(row.time_stamp);
        hourKeys.add(key);
        const sid = String(row.sensor_id);
        let s = acc.get(sid);
        if (!s) { s = new Map(); acc.set(sid, s); }
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
    // Integer μg/m³: the field feed drives banded markers and a banded median
    // strip, so a decimal is just payload.
    for (const [key, { sum, n }] of buckets) out.set(key, Math.round(sum / n));
    perSensor.set(id, out);
  }
  return { perSensor, hourKeys };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = resolveSince(searchParams.get("since"));

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
