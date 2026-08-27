import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const HOURS_OF_HISTORY = 48;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensor_id");
  const source = searchParams.get("source");

  if (!sensorId || !source) {
    return NextResponse.json({ error: "Missing sensor_id or source" }, { status: 400 });
  }

  const table = source === "sima" ? "sima_mediciones" : "purpleair_mediciones";
  const since = new Date(Date.now() - HOURS_OF_HISTORY * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("pm25, time_stamp")
    .eq("sensor_id", sensorId)
    .gte("time_stamp", since)
    .not("pm25", "is", null)
    .order("time_stamp", { ascending: true });

  if (error) {
    console.error("Sensor history fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
