import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

// The map's live PurpleAir feed: every hour, each device's 60-minute PM2.5
// average (plus temperature and humidity), appended to purpleair_mediciones.
// A device that hasn't reported in the last hour gets no row, so it ages out
// of the map's live window on its own. Ported from the standalone
// `aireclaro-purpleair` Render job with the same request pattern -- one
// GET /v1/sensors/{id} per device, same fields, same key -- so usage on the
// (legacy) API key doesn't change.
//
// Fixed in the port:
// - purpleair_sensores has rows that share a sensor_id (a device moved and
//   re-added under a new name). Each device is requested and written once,
//   not once per row.
// - Only "activo" rows are polled; "historico" (a moved/renamed device's old
//   row) is a manual call. The job never writes estatus (it used to flip
//   activo/inactivo hourly, which the 3 h live window made redundant).
// - A reading is written only when the device reported in the last hour.
// - A device with no last_seen is skipped instead of ending the run.

export const maxDuration = 300;

const PURPLEAIR_URL = "https://api.purpleair.com/v1/sensors";
const FIELDS = "pm2.5_60minute,temperature,humidity,last_seen";
const STALE_AFTER_MS = 60 * 60 * 1000;
// Requests in flight at once. Same requests as the old sequential loop, just
// overlapped so ~270 devices fit comfortably in maxDuration.
const CONCURRENCY = 4;

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
    .select("sensor_id")
    .eq("estatus", "activo");

  if (sensoresError || !sensores) {
    return NextResponse.json(
      { error: sensoresError?.message ?? "no sensors found" },
      { status: 500 },
    );
  }

  // One entry per device, even if it has more than one activo row.
  const deviceIds = [...new Set(sensores.map((s) => s.sensor_id as number))];

  const rows: {
    sensor_id: number;
    pm25: number;
    temperature: number | null;
    humidity: number | null;
    time_stamp: string;
  }[] = [];
  let stale = 0;
  const errors: string[] = [];

  let next = 0;
  async function worker() {
    while (next < deviceIds.length) {
      const sensorId = deviceIds[next++];
      try {
        const sensor = await fetchSensor(sensorId, apiKey!);
        if (!sensor || typeof sensor.last_seen !== "number") continue;

        if (Date.now() - sensor.last_seen * 1000 > STALE_AFTER_MS) {
          stale++;
          continue;
        }

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

  if (errors.length > 0) console.error("purpleair-hourly-sync errors:", errors);

  return NextResponse.json({
    timeStamp,
    devices: deviceIds.length,
    // Devices that haven't reported in the last hour.
    stale,
    rowsWritten: rows.length,
    errors,
  });
}
