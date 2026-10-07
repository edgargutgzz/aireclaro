import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

// The map's live PurpleAir feed: every hour, each device's 60-minute PM2.5
// average (plus temperature and humidity), appended to purpleair_mediciones,
// and each device's estatus flipped between "activo" and "inactivo" by
// whether it reported in the last hour. Ported from the standalone
// `aireclaro-purpleair` Render job with the same request pattern -- one
// GET /v1/sensors/{id} per device, same fields, same key -- so usage on the
// (legacy) API key doesn't change.
//
// Fixed in the port:
// - purpleair_sensores has rows that share a sensor_id (a device moved and
//   re-added under a new name). Each device is requested and written once,
//   not once per row.
// - estatus is only ever switched between "activo" and "inactivo". Any other
//   value (e.g. "historico" on a moved/renamed device's old row) is a manual call this job
//   never overwrites.
// - A reading is written only when the device reported in the last hour,
//   decided on this run's data, not on the status saved by the previous run.
// - A device with no last_seen is skipped instead of ending the run.

export const maxDuration = 300;

const PURPLEAIR_URL = "https://api.purpleair.com/v1/sensors";
const FIELDS = "pm2.5_60minute,temperature,humidity,last_seen";
const STALE_AFTER_MS = 60 * 60 * 1000;
// Requests in flight at once. Same requests as the old sequential loop, just
// overlapped so ~270 devices fit comfortably in maxDuration.
const CONCURRENCY = 4;
const AUTO_STATUSES = ["activo", "inactivo"];

interface PurpleAirSensor {
  last_seen?: number;
  humidity?: number | null;
  temperature?: number | null;
  stats?: { "pm2.5_60minute"?: number | null };
}

async function fetchSensor(sensorId: number, apiKey: string): Promise<PurpleAirSensor | null> {
  const res = await fetch(`${PURPLEAIR_URL}/${sensorId}?fields=${FIELDS}`, {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as { sensor?: PurpleAirSensor };
  return data.sensor ?? null;
}

function fahrenheitToCelsius(f: number | null | undefined) {
  return f == null ? null : Math.round((f - 32) * 0.5556);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PURPLE_AIR_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "PURPLE_AIR_KEY is not set" }, { status: 500 });
  }

  const timeStamp = monterreyNaiveNow().slice(0, 19);
  const supabase = createServiceClient();

  const { data: sensores, error: sensoresError } = await supabase
    .from("purpleair_sensores")
    .select("sensor_id, estatus");

  if (sensoresError || !sensores) {
    return NextResponse.json(
      { error: sensoresError?.message ?? "no sensors found" },
      { status: 500 },
    );
  }

  // One entry per device, skipping devices whose every row is manually set to
  // something other than activo/inactivo.
  const deviceIds = [
    ...new Set(
      sensores
        .filter((s) => AUTO_STATUSES.includes(s.estatus))
        .map((s) => s.sensor_id as number),
    ),
  ];

  const rows: {
    sensor_id: number;
    pm25: number;
    temperature: number | null;
    humidity: number | null;
    time_stamp: string;
  }[] = [];
  const fresh: number[] = [];
  const stale: number[] = [];
  const errors: string[] = [];

  let next = 0;
  async function worker() {
    while (next < deviceIds.length) {
      const sensorId = deviceIds[next++];
      try {
        const sensor = await fetchSensor(sensorId, apiKey!);
        if (!sensor || typeof sensor.last_seen !== "number") continue;

        if (Date.now() - sensor.last_seen * 1000 > STALE_AFTER_MS) {
          stale.push(sensorId);
          continue;
        }
        fresh.push(sensorId);

        const pm25 = sensor.stats?.["pm2.5_60minute"];
        if (typeof pm25 !== "number") continue;
        rows.push({
          sensor_id: sensorId,
          pm25,
          temperature: fahrenheitToCelsius(sensor.temperature),
          humidity: sensor.humidity ?? null,
          time_stamp: timeStamp,
        });
      } catch (err) {
        errors.push(`${sensorId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (rows.length > 0) {
    const { error } = await supabase.from("purpleair_mediciones").insert(rows);
    if (error) errors.push(`insert: ${error.message}`);
  }

  // Only rows currently in the opposite automatic state change; a manually
  // set estatus is never matched.
  for (const [ids, from, to] of [
    [fresh, "inactivo", "activo"],
    [stale, "activo", "inactivo"],
  ] as const) {
    if (ids.length === 0) continue;
    const { error } = await supabase
      .from("purpleair_sensores")
      .update({ estatus: to })
      .in("sensor_id", ids)
      .eq("estatus", from);
    if (error) errors.push(`estatus ${to}: ${error.message}`);
  }

  if (errors.length > 0) console.error("purpleair-hourly-sync errors:", errors);

  return NextResponse.json({
    timeStamp,
    devices: deviceIds.length,
    fresh: fresh.length,
    stale: stale.length,
    rowsWritten: rows.length,
    errors,
  });
}
