import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

// The map's live PurpleAir feed: every hour, each device's 60-minute PM2.5
// average (plus temperature and humidity), appended to purpleair_mediciones.
// A device that hasn't reported in the last hour gets no row, so it ages out
// of the map's live window on its own.
//
// One request for every device (GET /v1/sensors with show_only), as
// PurpleAir's API use guidelines ask: real-time endpoints take any number of
// sensors, and too many requests can cost API access. Until 2026-10-30 the job
// kept the old Render job's pattern of one request per device (~186 an hour).
//
// - purpleair_sensores has rows that share a sensor_id (a device moved and
//   re-added under a new name). Each device is requested and written once.
// - Only "activo" rows are polled; "historico" (a moved/renamed device's old
//   row) is a manual call. The job never writes estatus.
// - A reading is written only when the device reported in the last hour.
// - A device with no last_seen or no PM2.5 value is skipped.

export const maxDuration = 300;

const PURPLEAIR_URL = "https://api.purpleair.com/v1/sensors";
const FIELDS = "pm2.5_60minute,temperature,humidity,last_seen";
const STALE_AFTER_MS = 60 * 60 * 1000;
// The whole run is one request now, so a transient failure would lose the
// hour: retry a couple of times before giving up.
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 10_000;

type SensorRow = Record<string, number | null>;

// GET /v1/sensors answers { fields: [...], data: [[...], ...] }: one array per
// device, in the order `fields` names. Mapped back to objects by field name.
async function fetchSensors(sensorIds: number[], apiKey: string): Promise<SensorRow[]> {
  const url = `${PURPLEAIR_URL}?fields=${FIELDS}&show_only=${sensorIds.join(",")}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as { fields?: string[]; data?: (number | null)[][] };
      const fields = body.fields ?? [];
      return (body.data ?? []).map((row) => Object.fromEntries(fields.map((f, i) => [f, row[i] ?? null])));
    } catch (err) {
      lastError = err;
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastError;
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

  let sensors: SensorRow[] = [];
  try {
    sensors = await fetchSensors(deviceIds, apiKey);
  } catch (err) {
    errors.push(`request: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const sensor of sensors) {
    const sensorId = sensor.sensor_index;
    const lastSeen = sensor.last_seen;
    if (typeof sensorId !== "number" || typeof lastSeen !== "number") continue;

    if (Date.now() - lastSeen * 1000 > STALE_AFTER_MS) {
      stale++;
      continue;
    }

    const pm25 = sensor["pm2.5_60minute"];
    if (typeof pm25 !== "number") continue;
    rows.push({
      sensor_id: sensorId,
      pm25,
      temperature: fahrenheitToCelsius(sensor.temperature),
      humidity: sensor.humidity ?? null,
      time_stamp: timeStamp,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("purpleair_mediciones").insert(rows);
    if (error) errors.push(`insert: ${error.message}`);
  }

  if (errors.length > 0) console.error("purpleair-hourly-sync errors:", errors);

  return NextResponse.json({
    timeStamp,
    devices: deviceIds.length,
    // Devices PurpleAir returned; one missing from the answer (deleted,
    // private, silent for over a week) simply gets no row.
    returned: sensors.length,
    // Devices that haven't reported in the last hour.
    stale,
    rowsWritten: rows.length,
    errors,
  });
}
